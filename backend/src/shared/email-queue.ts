import { Queue } from 'bullmq';
import { bullMQRedisConnection, logQueueErrorOnce } from './redis';
import { logger } from './logger';

export type EmailJobType =
  | 'EMAIL_VERIFICATION'
  | 'send-verification-email'
  | 'PRODUCT_APPROVED'
  | 'PRODUCT_REJECTED'
  | 'CAMPAIGN_ACTIVATED'
  | 'OWNERSHIP_VERIFIED'
  | 'SECURITY_ALERT'
  | 'CAMPAIGN_EXPIRED'
  | 'send-campaign-activated'
  | 'send-notification';

export interface EmailJobPayload {
  type?: EmailJobType | string;
  to: string;
  verificationCode?: string;
  verificationUrl?: string;
  magicLinkUrl?: string;
  expiresInMinutes?: number;
  productName?: string;
  slug?: string;
  launchDate?: string;
  reason?: string;
  campaignId?: string;
  tier?: string;
  startsAt?: string;
  endsAt?: string;
  claimantEmail?: string;
  disputeReason?: string;
  timestamp?: string;
  subject?: string;
  html?: string;
  status?: string;
  [key: string]: unknown;
}

export type SendMagicLinkJobData = EmailJobPayload;

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
