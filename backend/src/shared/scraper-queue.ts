import { Queue } from 'bullmq';
import { bullMQRedisConnection, logQueueErrorOnce } from './redis';
import { logger } from './logger';

export interface ScraperJobPayload {
  url: string;
  userId: string;
  jobId: string;
}

export const scraperQueue = new Queue('scraper-jobs', {
  connection: bullMQRedisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

scraperQueue.on('error', (err) => {
  logQueueErrorOnce('scraperQueue', err);
});

export default scraperQueue;
