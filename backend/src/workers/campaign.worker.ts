import { Worker, Job } from 'bullmq';
import { Types } from 'mongoose';
import { bullMQRedisConnection, logQueueErrorOnce } from '../shared/redis';
import { campaignQueue, CampaignJobPayload } from '../shared/campaign-queue';
import { emailQueue } from '../shared/email-queue';
import { Campaign } from '../models/Campaign.model';
import { User } from '../models/User.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { EventSource } from '../shared/constants';
import { logger } from '../shared/logger';

let campaignWorkerInstance: Worker<CampaignJobPayload> | null = null;

/**
 * Handles expiration of an active campaign
 */
export async function handleExpireCampaign(campaignId: string): Promise<{ status: string; campaignId: string }> {
  if (!Types.ObjectId.isValid(campaignId)) {
    return { status: 'INVALID_ID', campaignId };
  }

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    return { status: 'NOT_FOUND', campaignId };
  }

  if (campaign.status === 'EXPIRED') {
    return { status: 'ALREADY_EXPIRED', campaignId };
  }

  // 1. Update campaign status to EXPIRED (releases slot from all active inventory checks)
  campaign.status = 'EXPIRED';
  campaign.updatedAt = new Date();
  await campaign.save();

  // 2. Log activity_event: CAMPAIGN_EXPIRED
  try {
    await ActivityEvent.create({
      userId: campaign.founderId,
      productId: campaign.productId,
      eventType: 'CAMPAIGN_EXPIRED',
      eventSource: EventSource.ORGANIC, // Standard internal activity log
      metadata: {
        campaignId: campaign._id.toString(),
        slotKey: campaign.slotKey,
        tier: campaign.tier,
        startsAt: campaign.startsAt,
        endsAt: campaign.endsAt,
      },
      createdAt: new Date(),
    });
  } catch (err: any) {
    logger.warn({ err: err.message, campaignId }, 'Failed to log CAMPAIGN_EXPIRED activity event');
  }

  // 3. Notify founder
  try {
    const founder = await User.findById(campaign.founderId).select('email').lean();
    if (founder?.email) {
      await emailQueue.add('CAMPAIGN_EXPIRED', {
        type: 'CAMPAIGN_EXPIRED',
        to: founder.email,
        campaignId: campaign._id.toString(),
        tier: campaign.tier,
        subject: `Your LaunchProduct ${campaign.tier} sponsorship has concluded`,
        html: `
          <h2 style="font-size: 20px; font-weight: 700; color: #0f172a;">Your Sponsorship Has Concluded</h2>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">
            Your sponsorship tier <strong>${campaign.tier}</strong> in slot <code>${campaign.slotKey}</code> has completed its scheduled run.
          </p>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">
            Thank you for supporting the creator ecosystem on LaunchProduct. Check your founder dashboard to review final campaign performance and click analytics.
          </p>
        `,
      });
    }
  } catch (err: any) {
    logger.warn({ err: err.message, campaignId }, 'Failed to enqueue founder expiration email');
  }

  logger.info({ campaignId, slotKey: campaign.slotKey }, 'Campaign successfully expired and slot released');
  return { status: 'EXPIRED', campaignId };
}

/**
 * Handles releasing an uncompleted/timed-out 15-minute reservation
 */
export async function handleReleaseReservation(campaignId: string): Promise<{ status: string; campaignId: string }> {
  if (!Types.ObjectId.isValid(campaignId)) {
    return { status: 'INVALID_ID', campaignId };
  }

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    return { status: 'NOT_FOUND', campaignId };
  }

  if (campaign.status !== 'RESERVED') {
    return { status: 'NOT_RESERVED', campaignId };
  }

  // Update reservation status to EXPIRED to immediately release the inventory slot
  campaign.status = 'EXPIRED';
  campaign.updatedAt = new Date();
  await campaign.save();

  // Log activity event
  try {
    await ActivityEvent.create({
      userId: campaign.founderId,
      productId: campaign.productId,
      eventType: 'CAMPAIGN_RESERVATION_RELEASED',
      eventSource: EventSource.ORGANIC,
      metadata: {
        campaignId: campaign._id.toString(),
        slotKey: campaign.slotKey,
        tier: campaign.tier,
      },
      createdAt: new Date(),
    });
  } catch (err: any) {
    logger.warn({ err: err.message, campaignId }, 'Failed to log CAMPAIGN_RESERVATION_RELEASED activity event');
  }

  logger.info({ campaignId, slotKey: campaign.slotKey }, 'Reserved campaign slot released due to checkout timeout');
  return { status: 'RELEASED', campaignId };
}

/**
 * Scans for expired active campaigns and abandoned 15-minute reservations
 */
export async function scanAndExpireCampaigns(): Promise<{ expiredCount: number; releasedCount: number }> {
  const now = new Date();
  let expiredCount = 0;
  let releasedCount = 0;

  // 1. Scan for ACTIVE campaigns that have reached their scheduled endsAt
  const expiredActive = await Campaign.find({
    status: 'ACTIVE',
    endsAt: { $lte: now },
  }).select('_id').lean();

  for (const camp of expiredActive) {
    await handleExpireCampaign(camp._id.toString());
    expiredCount++;
  }

  // 2. Scan for RESERVED campaigns older than 15-min or past expiresAt
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const expiredReservations = await Campaign.find({
    status: 'RESERVED',
    $or: [
      { expiresAt: { $lte: now } },
      { createdAt: { $lte: fifteenMinAgo } },
    ],
  }).select('_id').lean();

  for (const camp of expiredReservations) {
    await handleReleaseReservation(camp._id.toString());
    releasedCount++;
  }

  logger.info({ expiredCount, releasedCount }, 'Campaign scan completed');
  return { expiredCount, releasedCount };
}

/**
 * Initializes and starts the BullMQ campaign lifecycle worker
 */
export async function startCampaignWorker(): Promise<Worker<CampaignJobPayload>> {
  if (campaignWorkerInstance) {
    return campaignWorkerInstance;
  }

  // 1. Register repeatable cron job: '*/5 * * * *' (every 5 min)
  try {
    await campaignQueue.add(
      'SCAN_EXPIRED_CAMPAIGNS',
      { type: 'SCAN_EXPIRED_CAMPAIGNS' },
      {
        repeat: {
          pattern: '*/5 * * * *',
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      }
    );
    logger.info('Registered repeatable 5-minute cron job for SCAN_EXPIRED_CAMPAIGNS on campaignQueue');
  } catch (cronErr: any) {
    logger.warn({ err: cronErr.message }, 'Could not register repeatable cron job on campaignQueue');
  }

  // 2. Instantiate BullMQ Worker
  campaignWorkerInstance = new Worker<CampaignJobPayload>(
    'campaign-jobs',
    async (job: Job<CampaignJobPayload>) => {
      const jobName = job.name;
      const jobType = job.data?.type || jobName;
      logger.info({ jobId: job.id, jobType, data: job.data }, 'Processing campaign worker job');

      if (jobName === 'EXPIRE_CAMPAIGN' || jobType === 'EXPIRE_CAMPAIGN' || jobName === 'expire-campaign') {
        const campaignId = job.data.campaignId;
        if (!campaignId) throw new Error('Missing campaignId in EXPIRE_CAMPAIGN job data');
        return await handleExpireCampaign(campaignId);
      }

      if (jobName === 'RELEASE_RESERVATION' || jobType === 'RELEASE_RESERVATION' || jobName === 'release-reservation') {
        const campaignId = job.data.campaignId;
        if (!campaignId) throw new Error('Missing campaignId in RELEASE_RESERVATION job data');
        return await handleReleaseReservation(campaignId);
      }

      if (jobName === 'SCAN_EXPIRED_CAMPAIGNS' || jobType === 'SCAN_EXPIRED_CAMPAIGNS') {
        return await scanAndExpireCampaigns();
      }

      logger.warn({ jobName }, 'Unknown campaign job type, skipping');
      return { status: 'SKIPPED' };
    },
    {
      connection: bullMQRedisConnection,
      concurrency: 3,
    }
  );

  campaignWorkerInstance.on('completed', (job: Job) => {
    logger.info({ jobId: job.id, name: job.name }, 'Campaign worker job completed successfully');
  });

  campaignWorkerInstance.on('failed', (job: Job | undefined, err: Error) => {
    logger.error(
      { jobId: job?.id, name: job?.name, attemptsMade: job?.attemptsMade, err: err.message },
      'Campaign worker job failed'
    );
  });

  campaignWorkerInstance.on('error', (err: Error) => {
    logQueueErrorOnce('campaignWorker', err);
  });

  logger.info('Campaign BullMQ Worker initialized and listening on "campaign-jobs"');
  return campaignWorkerInstance;
}

/**
 * Gracefully shuts down the campaign worker
 */
export async function stopCampaignWorker(): Promise<void> {
  if (campaignWorkerInstance) {
    await campaignWorkerInstance.close();
    campaignWorkerInstance = null;
    logger.info('Campaign BullMQ Worker stopped');
  }
}

export default {
  startCampaignWorker,
  stopCampaignWorker,
  handleExpireCampaign,
  handleReleaseReservation,
  scanAndExpireCampaigns,
};
