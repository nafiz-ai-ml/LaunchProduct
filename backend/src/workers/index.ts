import { Router } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue } from '../shared/email-queue';
import { campaignQueue } from '../shared/campaign-queue';
import { clickEventsQueue, sponsoredClickEventsQueue } from '../shared/click-queue';
import { rankingQueue } from '../shared/ranking-queue';
import { scraperQueue } from '../shared/scraper-queue';
import { startEmailWorker, stopEmailWorker } from './email.worker';
import { startCampaignWorker, stopCampaignWorker } from './campaign.worker';
import { startEventsWorker, stopEventsWorker } from './events.worker';
import { startRankingWorker, stopRankingWorker } from './ranking.worker';
import { logger } from '../shared/logger';

export * from './email.worker';
export * from './campaign.worker';
export * from './events.worker';
export * from './ranking.worker';

/**
 * Registry of all LaunchProduct BullMQ queues
 */
export const registeredQueues = {
  email: emailQueue,
  campaign: campaignQueue,
  clickEvents: clickEventsQueue,
  sponsoredClickEvents: sponsoredClickEventsQueue,
  ranking: rankingQueue,
  scraper: scraperQueue,
};

/**
 * Creates and configures the BullMQ UI board router mounted at /admin/queues
 */
export function setupBullBoard(basePath: string = '/admin/queues'): Router {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(basePath);

  createBullBoard({
    queues: [
      new BullMQAdapter(emailQueue),
      new BullMQAdapter(campaignQueue),
      new BullMQAdapter(clickEventsQueue),
      new BullMQAdapter(sponsoredClickEventsQueue),
      new BullMQAdapter(rankingQueue),
      new BullMQAdapter(scraperQueue),
    ],
    serverAdapter,
  });

  return serverAdapter.getRouter();
}

/**
 * Retrieves aggregate real-time metrics across all queues
 */
export async function getQueuesOverview(): Promise<
  Record<string, { waiting: number; active: number; completed: number; failed: number; delayed: number; paused: boolean }>
> {
  const overview: Record<
    string,
    { waiting: number; active: number; completed: number; failed: number; delayed: number; paused: boolean }
  > = {};

  for (const [key, queue] of Object.entries(registeredQueues)) {
    try {
      const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused');
      const isPaused = await queue.isPaused();
      overview[key] = {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
        paused: isPaused,
      };
    } catch (err: any) {
      logger.warn({ queue: key, err: err.message }, 'Failed to fetch queue metrics');
      overview[key] = {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: false,
      };
    }
  }

  return overview;
}

/**
 * Bootstraps all BullMQ background workers on server startup
 */
export async function startAllWorkers(): Promise<void> {
  logger.info('Initializing all LaunchProduct BullMQ background workers...');
  try {
    await Promise.allSettled([
      startEmailWorker(),
      startCampaignWorker(),
      startEventsWorker(),
      startRankingWorker(),
    ]);
    logger.info('All LaunchProduct BullMQ workers successfully initialized');
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error during background workers initialization');
  }
}

/**
 * Gracefully terminates all BullMQ background workers on server shutdown
 */
export async function stopAllWorkers(): Promise<void> {
  logger.info('Stopping all LaunchProduct BullMQ background workers...');
  try {
    await Promise.allSettled([
      stopEmailWorker(),
      stopCampaignWorker(),
      stopEventsWorker(),
      stopRankingWorker(),
    ]);
    logger.info('All LaunchProduct BullMQ workers stopped gracefully');
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error shutting down background workers');
  }
}

export default {
  startAllWorkers,
  stopAllWorkers,
  setupBullBoard,
  getQueuesOverview,
  registeredQueues,
};
