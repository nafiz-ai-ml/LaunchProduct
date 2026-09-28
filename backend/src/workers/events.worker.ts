import { Worker, Job } from 'bullmq';
import { Types } from 'mongoose';
import { bullMQRedisConnection, redis, logQueueErrorOnce } from '../shared/redis';
import { ClickJobPayload } from '../shared/click-queue';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { EventSource } from '../shared/constants';
import { logger } from '../shared/logger';

let organicClickWorkerInstance: Worker<ClickJobPayload> | null = null;
let sponsoredClickWorkerInstance: Worker<ClickJobPayload> | null = null;

/**
 * Processes organic click events (Queue: 'click-events')
 * Increments organic click counters for dynamic leaderboard rankings.
 */
export async function processOrganicClickJob(job: Job<ClickJobPayload>): Promise<{ status: string; productId: string }> {
  const { productId, source, sessionHash, referrer, utmSource, timestamp, isDuplicate } = job.data;

  if (!productId || !Types.ObjectId.isValid(productId)) {
    return { status: 'INVALID_PRODUCT_ID', productId };
  }

  const eventTime = timestamp ? new Date(timestamp) : new Date();
  const dateKey = eventTime.toISOString().split('T')[0];

  // 1. Log ActivityEvent to MongoDB
  try {
    await ActivityEvent.create({
      productId: new Types.ObjectId(productId),
      eventType: 'OUTBOUND_CLICK',
      eventSource: EventSource.ORGANIC,
      sessionHash: sessionHash || null,
      metadata: {
        referrer: referrer || null,
        utmSource: utmSource || null,
        isDuplicate: !!isDuplicate,
        rawSource: source,
      },
      createdAt: eventTime,
    });
  } catch (dbErr: any) {
    logger.warn({ err: dbErr.message, productId }, 'Failed to record organic click ActivityEvent to DB');
  }

  // 2. Increment organic click counter on Redis sorted set
  // Business Rule: ONLY non-duplicate, non-bot organic clicks contribute to ranking calculations
  if (!isDuplicate && source !== 'BOT') {
    try {
      const redisKey = `leaderboard:today:${dateKey}:organic_clicks`;
      await redis.zincrby(redisKey, 1, productId);
      // Ensure 7-day retention for daily analytics
      await redis.expire(redisKey, 7 * 86400);
    } catch (redisErr: any) {
      logger.warn({ err: redisErr.message, productId }, 'Failed to increment organic click Redis sorted set');
    }
  } else {
    logger.debug({ productId, isDuplicate, source }, 'Organic click excluded from ranking (duplicate or bot)');
  }

  return { status: 'RECORDED', productId };
}

/**
 * Processes sponsored click events (Queue: 'sponsored-click-events')
 * CRITICAL (PRD Section 7.7): NEVER touches organic ranking sets.
 */
export async function processSponsoredClickJob(job: Job<ClickJobPayload>): Promise<{ status: string; productId: string }> {
  const { productId, sessionHash, referrer, utmSource, timestamp } = job.data;

  if (!productId || !Types.ObjectId.isValid(productId)) {
    return { status: 'INVALID_PRODUCT_ID', productId };
  }

  const eventTime = timestamp ? new Date(timestamp) : new Date();
  const dateKey = eventTime.toISOString().split('T')[0];

  // 1. Log ActivityEvent to MongoDB with eventSource = 'SPONSORED'
  try {
    await ActivityEvent.create({
      productId: new Types.ObjectId(productId),
      eventType: 'OUTBOUND_CLICK',
      eventSource: EventSource.SPONSORED,
      sessionHash: sessionHash || null,
      metadata: {
        referrer: referrer || null,
        utmSource: utmSource || null,
      },
      createdAt: eventTime,
    });
  } catch (dbErr: any) {
    logger.warn({ err: dbErr.message, productId }, 'Failed to record sponsored click ActivityEvent to DB');
  }

  // 2. Update commercial campaign impression/click counters
  // STRICTLY ISOLATED: Stored exclusively in campaign analytics keys.
  try {
    const dailyCampaignKey = `campaign:analytics:${productId}:${dateKey}`;
    await redis.hincrby(dailyCampaignKey, 'clicks', 1);
    await redis.expire(dailyCampaignKey, 90 * 86400); // 90 days retention for advertiser reports

    const totalCampaignKey = `campaign:total_clicks:${productId}`;
    await redis.hincrby(totalCampaignKey, 'clicks', 1);
  } catch (redisErr: any) {
    logger.warn({ err: redisErr.message, productId }, 'Failed to increment sponsored campaign counter in Redis');
  }

  return { status: 'SPONSORED_RECORDED', productId };
}

/**
 * Initializes and starts both the organic and sponsored event workers
 */
export async function startEventsWorker(): Promise<{
  organicWorker: Worker<ClickJobPayload>;
  sponsoredWorker: Worker<ClickJobPayload>;
}> {
  // 1. Organic click worker
  if (!organicClickWorkerInstance) {
    organicClickWorkerInstance = new Worker<ClickJobPayload>(
      'click-events',
      async (job: Job<ClickJobPayload>) => {
        return await processOrganicClickJob(job);
      },
      {
        connection: bullMQRedisConnection,
        concurrency: 10,
      }
    );

    organicClickWorkerInstance.on('completed', (job: Job) => {
      logger.debug({ jobId: job.id }, 'Organic click job completed');
    });

    organicClickWorkerInstance.on('failed', (job: Job | undefined, err: Error) => {
      logger.error({ jobId: job?.id, err: err.message }, 'Organic click job failed');
    });

    organicClickWorkerInstance.on('error', (err: Error) => {
      logQueueErrorOnce('organicClickWorker', err);
    });
  }

  // 2. Sponsored click worker
  if (!sponsoredClickWorkerInstance) {
    sponsoredClickWorkerInstance = new Worker<ClickJobPayload>(
      'sponsored-click-events',
      async (job: Job<ClickJobPayload>) => {
        return await processSponsoredClickJob(job);
      },
      {
        connection: bullMQRedisConnection,
        concurrency: 10,
      }
    );

    sponsoredClickWorkerInstance.on('completed', (job: Job) => {
      logger.debug({ jobId: job.id }, 'Sponsored click job completed');
    });

    sponsoredClickWorkerInstance.on('failed', (job: Job | undefined, err: Error) => {
      logger.error({ jobId: job?.id, err: err.message }, 'Sponsored click job failed');
    });

    sponsoredClickWorkerInstance.on('error', (err: Error) => {
      logQueueErrorOnce('sponsoredClickWorker', err);
    });
  }

  logger.info('Events BullMQ Workers initialized and listening on "click-events" & "sponsored-click-events"');
  return {
    organicWorker: organicClickWorkerInstance,
    sponsoredWorker: sponsoredClickWorkerInstance,
  };
}

/**
 * Gracefully shuts down the event workers
 */
export async function stopEventsWorker(): Promise<void> {
  if (organicClickWorkerInstance) {
    await organicClickWorkerInstance.close();
    organicClickWorkerInstance = null;
  }
  if (sponsoredClickWorkerInstance) {
    await sponsoredClickWorkerInstance.close();
    sponsoredClickWorkerInstance = null;
  }
  logger.info('Events BullMQ Workers stopped');
}

export default {
  startEventsWorker,
  stopEventsWorker,
  processOrganicClickJob,
  processSponsoredClickJob,
};
