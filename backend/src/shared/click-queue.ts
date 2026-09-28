import { Queue } from 'bullmq';
import { bullMQRedisConnection, logQueueErrorOnce } from './redis';
import { logger } from './logger';

export interface ClickJobPayload {
  productId: string;
  source: 'ORGANIC' | 'SPONSORED' | 'BOT';
  sessionHash: string;
  referrer?: string;
  utmSource?: string;
  timestamp: string;
  isDuplicate?: boolean;
}

/**
 * BullMQ queue for organic ranking-eligible click events.
 * Processed by leaderboard/ranking counter workers.
 */
export const clickEventsQueue = new Queue('click-events', {
  connection: bullMQRedisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 500,
    removeOnFail: 1000,
  },
});

clickEventsQueue.on('error', (err) => {
  logQueueErrorOnce('clickEventsQueue', err);
});

/**
 * BullMQ queue for commercial sponsored clicks.
 * STRICTLY ISOLATED from organic ranking formulas; consumed by campaign analytics workers only.
 */
export const sponsoredClickEventsQueue = new Queue('sponsored-click-events', {
  connection: bullMQRedisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 500,
    removeOnFail: 1000,
  },
});

sponsoredClickEventsQueue.on('error', (err) => {
  logQueueErrorOnce('sponsoredClickEventsQueue', err);
});

export default {
  clickEventsQueue,
  sponsoredClickEventsQueue,
};
