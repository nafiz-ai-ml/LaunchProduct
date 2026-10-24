import { Queue } from 'bullmq';
import { bullMQRedisConnection, logQueueErrorOnce } from './redis';

export type EmailJobType =
  | 'RANKING_PAYMENT_CONFIRMED'
  | 'send-notification';

export interface EmailJobPayload {
  type?: EmailJobType | string;
  to: string;
  productName?: string;
  slug?: string;
  amountCents?: number;
  contributionType?: string;
  targetDailyDate?: string;
  subject?: string;
  html?: string;
  [key: string]: unknown;
}

/**
 * BullMQ queue for transactional emails (Queue name: 'email-jobs').
 * Retries configured for 3 attempts with exponential backoff.
 */
export const emailQueue = new Queue<EmailJobPayload>('email-jobs', {
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

emailQueue.on('error', (err) => {
  logQueueErrorOnce('emailQueue', err);
});

export const emailJobsQueue = emailQueue;
export default emailQueue;
