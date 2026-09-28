import { Queue } from 'bullmq';
import { bullMQRedisConnection, logQueueErrorOnce } from './redis';
import { logger } from './logger';

export interface RankingJobPayload {
  type: 'DAILY_FREEZE' | 'RECOMPUTE_TRENDING' | 'MANUAL_RECOMPUTE';
  targetDate?: string;
  requestedBy?: string;
}

/**
 * BullMQ queue for ranking engine and daily leaderboard snapshot freeze jobs
 */
export const rankingQueue = new Queue('ranking-jobs', {
  connection: bullMQRedisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

rankingQueue.on('error', (err) => {
  logQueueErrorOnce('rankingQueue', err);
});

export default rankingQueue;
