import { Types } from 'mongoose';
import { Product } from '../models/Product.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { EventSource, ProductStatus } from '../shared/constants';
import { clickEventsQueue, sponsoredClickEventsQueue } from '../shared/click-queue';
import { hashTelemetry } from './fraud.service';
import { NotFoundError, AuthorizationError } from '../shared/errors';
import { redis, isRedisConnected } from '../shared/redis';
import { logger } from '../shared/logger';

export interface ClickMetadata {
  ip: string;
  userAgent?: string;
  referrer?: string;
  utmSource?: string;
}

export interface DailyMetricItem {
  date: string;
  impressions: number;
  organicClicks: number;
  sponsoredClicks: number;
  votes: number;
}

export interface ReferrerMetricItem {
  referrer: string;
  count: number;
}

export interface AnalyticsSummary {
  totalImpressions: number;
  totalOrganicClicks: number;
  totalSponsoredClicks: number;
  organicCtr: number;
  totalValidVotes: number;
}

export interface AnalyticsData {
  productId: string;
  summary: AnalyticsSummary;
  dailyMetrics: DailyMetricItem[];
  referrerBreakdown: ReferrerMetricItem[];
}

// In-memory deduplication fallback when Redis is offline (local development)
const inMemoryDedupStore = new Map<string, number>();

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
        logger.warn({ err: cacheErr.message }, 'Redis product cache read error');
      }
    }

    // Database Fallback: Read product from MongoDB
    if (!destinationUrl || !productStatus) {
      const product = await Product.findById(productId).select('websiteUrl status name').lean();
      if (!product || product.status === ProductStatus.DELETED) {
        throw new NotFoundError(`Product '${productId}' not found`);
      }

      destinationUrl = product.websiteUrl;
      productStatus = product.status;

      // Populate Redis hot-cache
      if (isRedisConnected() && destinationUrl) {
        try {
          await redis.set(
            cacheKey,
            JSON.stringify({ websiteUrl: destinationUrl, status: productStatus }),
            'EX',
            300
          );
        } catch {
          // Ignore cache set error
        }
      }
    }

    if (productStatus !== ProductStatus.LIVE) {
      throw new NotFoundError(`Product '${productId}' is not live (status: ${productStatus})`);
    }

    // Classify source: Bot User-Agents are strictly identified and forced to 'BOT'
    const isBot = this.botUserAgentRegex.test(clientMetadata.userAgent || '');
    let source: 'ORGANIC' | 'SPONSORED' | 'BOT';
    if (isBot) {
      source = 'BOT';
    } else if (rawSource.toLowerCase() === 'sponsored') {
      source = 'SPONSORED';
    } else {
      source = 'ORGANIC';
    }

    // Compute session hash: HMAC-SHA256(ip + userAgent)
    const sessionPayload = `${clientMetadata.ip}:${clientMetadata.userAgent || ''}`;
    const sessionHash = hashTelemetry(sessionPayload);

    // Redis Deduplication: 10-minute session window (600s TTL)
    const dedupKey = `click:dedup:${productId}:${sessionHash}`;
    let isDuplicate = false;

    if (isRedisConnected()) {
      try {
        const setResult = await redis.set(dedupKey, '1', 'EX', 600, 'NX');
        isDuplicate = setResult !== 'OK';
      } catch (dedupErr: any) {
        logger.warn({ err: dedupErr.message }, 'Redis click deduplication error');
      }
    } else {
      // In-memory deduplication fallback
      const now = Date.now();
      const existing = inMemoryDedupStore.get(dedupKey);
      if (existing && existing > now) {
        isDuplicate = true;
      } else {
        inMemoryDedupStore.set(dedupKey, now + 10 * 60 * 1000);
      }
    }

    // =========================================================================
    // ASYNCHRONOUS FIRE-AND-FORGET TELEMETRY DISPATCH (NEVER BLOCKS REDIRECT!)
    // =========================================================================
    setImmediate(async () => {
      try {
        const timestamp = new Date().toISOString();

        // 1. Organic clicks: Enqueue to 'click-events' queue for ranking calculations
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

        // 2. Sponsored clicks: Enqueue to 'sponsored-click-events' for campaign analytics ONLY
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

        // 3. Activity Event Log
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

    return { destinationUrl };
  }

  /**
   * 2. Retrieve aggregated founder analytics over the last N days
   */
  async getFounderAnalytics(
    productId: string,
    founderId: string,
    days: number = 30
  ): Promise<AnalyticsData> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new NotFoundError(`Invalid product ID '${productId}'`);
    }

    const product = await Product.findById(productId);
    if (!product || product.status === ProductStatus.DELETED) {
      throw new NotFoundError(`Product '${productId}' not found`);
    }

    // Assert founder/submitter ownership
    const isOwner =
      (product.founderId && product.founderId.toString() === founderId) ||
      (product.submittedById && product.submittedById.toString() === founderId);
    if (!isOwner) {
      throw new AuthorizationError(
        'You do not have administrative permission to view analytics for this product',
        'FORBIDDEN'
      );
    }

    const clampedDays = Math.max(1, Math.min(days, 90));
    const since = new Date(Date.now() - clampedDays * 24 * 60 * 60 * 1000);

    // MongoDB Aggregation Pipeline on ActivityEvent
    const matchStage = {
      $match: {
        productId: product._id,
        createdAt: { $gte: since },
      },
    };

    const dailyFacet = [
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          organicClicks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$eventType', 'OUTBOUND_CLICK'] },
                    { $eq: ['$eventSource', 'ORGANIC'] },
                    { $ne: ['$metadata.isDuplicate', true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          sponsoredClicks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$eventType', 'OUTBOUND_CLICK'] },
                    { $eq: ['$eventSource', 'SPONSORED'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          votes: {
            $sum: {
              $cond: [{ $eq: ['$eventType', 'VOTE_CAST'] }, 1, 0],
            },
          },
          impressions: {
            $sum: {
              $cond: [{ $eq: ['$eventType', 'PRODUCT_VIEW'] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 as const } },
    ];

    const referrerFacet = [
      {
        $match: {
          eventType: 'OUTBOUND_CLICK',
        },
      },
      {
        $group: {
          _id: { $ifNull: ['$metadata.referrer', 'direct'] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 as const } },
      { $limit: 10 },
    ];

    const [results] = await ActivityEvent.aggregate([
      matchStage,
      {
        $facet: {
          daily: dailyFacet as any,
          referrers: referrerFacet as any,
        },
      } as any,
    ]);

    const dailyMetrics: DailyMetricItem[] = (results?.daily || []).map((item: any) => ({
      date: item._id,
      impressions: item.impressions || 0,
      organicClicks: item.organicClicks || 0,
      sponsoredClicks: item.sponsoredClicks || 0,
      votes: item.votes || 0,
    }));

    const referrerBreakdown: ReferrerMetricItem[] = (results?.referrers || []).map((item: any) => ({
      referrer: item._id,
      count: item.count,
    }));

    // Calculate totals
    let totalImpressions = 0;
    let totalOrganicClicks = 0;
    let totalSponsoredClicks = 0;
    let totalValidVotes = 0;

    for (const d of dailyMetrics) {
      totalImpressions += d.impressions;
      totalOrganicClicks += d.organicClicks;
      totalSponsoredClicks += d.sponsoredClicks;
      totalValidVotes += d.votes;
    }

    // Default impression count to at least clicks to prevent invalid CTR if view tracking is emerging
    const effectiveImpressions = Math.max(totalImpressions, totalOrganicClicks);
    const organicCtr = effectiveImpressions > 0
      ? Math.round((totalOrganicClicks / effectiveImpressions) * 10000) / 10000
      : 0;

    return {
      productId: product._id.toString(),
      summary: {
        totalImpressions: effectiveImpressions,
        totalOrganicClicks,
        totalSponsoredClicks,
        organicCtr,
        totalValidVotes,
      },
      dailyMetrics,
      referrerBreakdown,
    };
  }
}

export const analyticsService = new AnalyticsService();
