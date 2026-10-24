import { Types } from 'mongoose';
import { Product } from '../models/Product.model';
import { Payment } from '../models/Payment.model';
import { SystemSettings } from '../models/SystemSettings.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { EventSource, ProductStatus, PaymentStatus } from '../shared/constants';
import { clickEventsQueue, sponsoredClickEventsQueue } from '../shared/click-queue';
import { hashTelemetry } from './fraud.service';
import { NotFoundError } from '../shared/errors';
import { redis, isRedisConnected } from '../shared/redis';
import { logger } from '../shared/logger';
import { getClientIp } from '../middleware/rate-limit.middleware';

export interface ClickMetadata {
  ip: string;
  userAgent?: string;
  referrer?: string;
  utmSource?: string;
}

// In-memory deduplication fallback when Redis is offline (local development)
const inMemoryDedupStore = new Map<string, number>();

export function appendUtmSource(targetUrl: string, defaultSource: string = 'launchproduct'): string {
  try {
    const raw = targetUrl.startsWith('http://') || targetUrl.startsWith('https://')
      ? targetUrl
      : `https://${targetUrl}`;
    const parsed = new URL(raw);
    if (!parsed.searchParams.has('utm_source')) {
      parsed.searchParams.set('utm_source', defaultSource);
    }
    return parsed.toString();
  } catch {
    return targetUrl;
  }
}

export class AnalyticsService {
  private botUserAgentRegex =
    /bot|crawler|spider|crawling|googlebot|bingbot|yandex|duckduckbot|slurp|baiduspider|headless|phantomjs|mediapartners-google/i;

  /**
   * 1. Process outbound click redirect with sub-25ms latency guarantee.
   * Isolates ORGANIC clicks from SPONSORED clicks and queues telemetry asynchronously.
   */
  async processOutboundClick(
    productId: string,
    rawSource: string = 'organic',
    clientMetadata: ClickMetadata
  ): Promise<{ destinationUrl: string }> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new NotFoundError(`Invalid product ID '${productId}'`);
    }

    const cacheKey = `product:cache:${productId}`;
    let destinationUrl: string | null = null;
    let productStatus: string | null = null;

    // Fast Path: Try reading product destination URL from Redis cache (5-min TTL)
    if (isRedisConnected()) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          destinationUrl = parsed.websiteUrl;
          productStatus = parsed.status;
        }
      } catch (cacheErr: any) {
        logger.warn({ err: cacheErr.message, productId }, 'Redis read failure in fast redirect path');
      }
    }

    // Cache Miss: Query MongoDB directly and warm the Redis cache
    if (!destinationUrl) {
      const product = await Product.findById(productId, { websiteUrl: 1, status: 1 }).lean();
      if (!product) {
        throw new NotFoundError(`Product '${productId}' not found`);
      }
      destinationUrl = product.websiteUrl;
      productStatus = product.status;

      if (isRedisConnected()) {
        try {
          await redis.set(
            cacheKey,
            JSON.stringify({ websiteUrl: destinationUrl, status: productStatus }),
            'EX',
            300
          );
        } catch {
          // Ignore cache warm failure
        }
      }
    }

    if (productStatus === ProductStatus.DELETED || productStatus === ProductStatus.SUSPENDED) {
      throw new NotFoundError(`Product '${productId}' is not available`);
    }

    // Bot Filter: Detect and tag automated scrapers
    const isBot = clientMetadata.userAgent
      ? this.botUserAgentRegex.test(clientMetadata.userAgent)
      : false;

    const source = isBot ? 'BOT' : rawSource.toUpperCase() === 'SPONSORED' ? 'SPONSORED' : 'ORGANIC';

    // Click Deduplication via Redis TTL Key (10-minute sliding window)
    const sessionHash = hashTelemetry(`${clientMetadata.ip}:${clientMetadata.userAgent || ''}`);
    const dedupKey = `click:dedup:${productId}:${sessionHash}`;
    let isDuplicate = false;

    if (isRedisConnected()) {
      try {
        const setOk = await redis.set(dedupKey, '1', 'EX', 10 * 60, 'NX');
        isDuplicate = setOk === null;
      } catch {
        isDuplicate = false;
      }
    } else {
      const now = Date.now();
      const existing = inMemoryDedupStore.get(dedupKey);
      if (existing && existing > now) {
        isDuplicate = true;
      } else {
        inMemoryDedupStore.set(dedupKey, now + 10 * 60 * 1000);
      }
    }

    // ASYNCHRONOUS FIRE-AND-FORGET TELEMETRY DISPATCH (NEVER BLOCKS REDIRECT!)
    setImmediate(async () => {
      try {
        const timestamp = new Date().toISOString();

        if (!isDuplicate && source === 'ORGANIC') {
          await clickEventsQueue.add('process-click', {
            productId,
            source: 'ORGANIC',
            sessionHash,
            referrer: clientMetadata.referrer,
            utmSource: clientMetadata.utmSource,
            timestamp,
          });
        }

        if (source === 'SPONSORED') {
          await sponsoredClickEventsQueue.add('process-sponsored-click', {
            productId,
            source: 'SPONSORED',
            sessionHash,
            referrer: clientMetadata.referrer,
            utmSource: clientMetadata.utmSource,
            timestamp,
            isDuplicate,
          });
        }

        let eventSource = EventSource.ORGANIC;
        if (source === 'SPONSORED') eventSource = EventSource.SPONSORED;
        if (source === 'BOT') eventSource = EventSource.BOT;

        await ActivityEvent.create({
          productId: new Types.ObjectId(productId),
          eventType: 'OUTBOUND_CLICK',
          eventSource,
          sessionHash,
          metadata: {
            source,
            isDuplicate,
            referrer: clientMetadata.referrer || 'direct',
            utmSource: clientMetadata.utmSource || null,
          },
        });
      } catch (asyncErr: any) {
        logger.error({ err: asyncErr.message, productId }, 'Async click telemetry dispatch error');
      }
    });

    const finalUrl = appendUtmSource(destinationUrl, 'launchproduct');
    return { destinationUrl: finalUrl };
  }

  /**
   * Helper method for express controller click handling
   */
  async recordClickAndGetRedirect(
    productId: string,
    isSponsored: boolean,
    req: any
  ): Promise<string> {
    const rawSource = isSponsored ? 'sponsored' : 'organic';
    const clientMetadata: ClickMetadata = {
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] as string | undefined,
      referrer: req.headers['referer'] as string | undefined,
      utmSource: (req.query?.utm_source as string) || undefined,
    };
    const { destinationUrl } = await this.processOutboundClick(productId, rawSource, clientMetadata);
    return destinationUrl;
  }

  /**
   * Track visitor atomic page visit.
   * Increments Redis & MongoDB persistent counter. Starts from 0.
   */
  async trackVisit(ip: string, userAgent?: string): Promise<{ visitors: number }> {
    if (userAgent && this.botUserAgentRegex.test(userAgent)) {
      const stats = await this.getPublicStats();
      return { visitors: stats.visitors };
    }

    let currentVisitors = 0;

    // 1. Update MongoDB persistent record
    try {
      const updated = await SystemSettings.findOneAndUpdate(
        { key: 'site_visitor_counter' },
        {
          $inc: { 'value.count': 1 },
          $setOnInsert: { description: 'Live platform visitor counter' },
          $set: { updatedAt: new Date() },
        },
        { upsert: true, new: true }
      );
      currentVisitors = updated?.value?.count || 1;
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Failed to persist visitor counter in Mongo');
    }

    // 2. Increment in Redis if available
    if (isRedisConnected()) {
      try {
        await redis.incr('stats:site:visitors');
      } catch {
        // fallback to Mongo
      }
    }

    return { visitors: currentVisitors };
  }

  /**
   * Public live platform statistics for Footer / About / Live stats.
   * Real-time calculation from authoritative DB records. Starts from 0.
   */
  async getPublicStats(): Promise<{
    visitors: number;
    paidRankingVolumeCents: number;
    paidRankingVolumeFormatted: string;
    productsListed: number;
  }> {
    let visitors = 0;
    try {
      const record = await SystemSettings.findOne({ key: 'site_visitor_counter' }).lean();
      visitors = record?.value?.count || 0;
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Error retrieving visitor counter');
    }

    let paidRankingVolumeCents = 0;
    try {
      const rankingAgg = await Payment.aggregate([
        {
          $match: {
            status: PaymentStatus.SUCCEEDED,
            paymentType: 'RANKING',
          },
        },
        {
          $group: {
            _id: null,
            totalCents: { $sum: '$amountCents' },
          },
        },
      ]);
      paidRankingVolumeCents = rankingAgg[0]?.totalCents || 0;
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Error aggregating paid ranking volume');
    }

    let productsListed = 0;
    try {
      productsListed = await Product.countDocuments({
        status: ProductStatus.LIVE,
        paidRankingAmountCents: { $gt: 0 },
      });
      if (productsListed === 0) {
        productsListed = await Product.countDocuments({
          status: ProductStatus.LIVE,
        });
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Error counting listed products');
    }

    const dollars = Math.floor(paidRankingVolumeCents / 100);
    const paidRankingVolumeFormatted = dollars > 0
      ? `$ ${dollars.toLocaleString('en-US')}`
      : '$ 0';

    return {
      visitors,
      paidRankingVolumeCents,
      paidRankingVolumeFormatted,
      productsListed,
    };
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
