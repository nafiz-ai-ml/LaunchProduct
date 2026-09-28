import { Queue } from 'bullmq';
import { bullMQRedisConnection, logQueueErrorOnce } from './redis';
import { logger } from './logger';

export type CampaignJobType =
  | 'EXPIRE_CAMPAIGN'
  | 'RELEASE_RESERVATION'
  | 'SCAN_EXPIRED_CAMPAIGNS'
  | 'expire-campaign'
  | 'release-reservation';

export interface CampaignJobPayload {
  type?: CampaignJobType | string;
  campaignId?: string;
  slotKey?: string;
  tier?: string;
  reason?: string;
}

export type ExpireCampaignJobData = CampaignJobPayload;

/**
 * BullMQ queue for delayed and scheduled campaign lifecycle jobs (Queue: 'campaign-jobs').
 */
export const campaignQueue = new Queue<CampaignJobPayload>('campaign-jobs', {
  connection: bullMQRedisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 200,
    removeOnFail: 500,
  },
});

campaignQueue.on('error', (err) => {
  logQueueErrorOnce('campaignQueue', err);
});

export default campaignQueue;
