import client from 'prom-client';
import { Vote } from '../models/Vote.model';
import { Campaign } from '../models/Campaign.model';
import { scraperQueue } from './scraper-queue';
import { logger } from './logger';

export const register = new client.Registry();

// 1. Enable standard Node.js process & runtime metrics
client.collectDefaultMetrics({
  register,
  prefix: 'launchproduct_',
});

// 2. HTTP Requests Total Counter
export const httpRequestsTotal = new client.Counter({
  name: 'launchproduct_http_requests_total',
  help: 'Total number of HTTP requests processed by LaunchProduct API',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// 3. Active Valid Votes Total Gauge
export const activeVotesTotal = new client.Gauge({
  name: 'launchproduct_active_votes_total',
  help: 'Current total count of active VALID community votes on LaunchProduct',
  registers: [register],
});

// 4. Scraper Queue Waiting Gauge
export const scraperQueueWaiting = new client.Gauge({
  name: 'launchproduct_scraper_queue_waiting',
  help: 'Number of pending scraping jobs waiting in BullMQ scraper-queue',
  registers: [register],
});

// 5. Quarantine Queue Depth Gauge
export const quarantineQueueDepth = new client.Gauge({
  name: 'launchproduct_quarantine_queue_depth',
  help: 'Number of quarantined votes pending moderator investigation',
  registers: [register],
});

// 6. Active Campaign Slots Gauge
export const campaignSlotsActive = new client.Gauge({
  name: 'launchproduct_campaign_slots_active',
  help: 'Number of currently active commercial sponsorship campaigns in inventory slots',
  registers: [register],
});

// 7. Deprecated Endpoint Hits Counter (RFC 8594 Sunset tracking)
export const deprecatedEndpointHitsTotal = new client.Counter({
  name: 'launchproduct_deprecated_endpoint_hits_total',
  help: 'Total number of requests hitting deprecated endpoints for RFC 8594 sunset monitoring',
  labelNames: ['endpoint', 'sunset_date'],
  registers: [register],
});

/**
 * Updates dynamic gauge metrics by querying MongoDB and BullMQ before scraping
 */
export async function updateDynamicMetrics(): Promise<void> {
  const now = new Date();

  // 1. Live VALID votes
  try {
    const validCount = await Vote.countDocuments({ status: 'VALID' });
    activeVotesTotal.set(validCount);
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to collect active votes metric');
  }

  // 2. QUARANTINED votes pending review
  try {
    const quarantinedCount = await Vote.countDocuments({ status: 'QUARANTINED' });
    quarantineQueueDepth.set(quarantinedCount);
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to collect quarantine queue depth metric');
  }

  // 3. Active campaign slots
  try {
    const activeCampaigns = await Campaign.countDocuments({
      status: 'ACTIVE',
      startsAt: { $lte: now },
      endsAt: { $gte: now },
    });
    campaignSlotsActive.set(activeCampaigns);
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to collect active campaigns metric');
  }

  // 4. Pending BullMQ scraper queue jobs
  try {
    const waitingScraperJobs = await scraperQueue.getWaitingCount();
    scraperQueueWaiting.set(waitingScraperJobs);
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to collect scraper queue metrics');
  }
}

export default {
  register,
  httpRequestsTotal,
  activeVotesTotal,
  scraperQueueWaiting,
  quarantineQueueDepth,
  campaignSlotsActive,
  deprecatedEndpointHitsTotal,
  updateDynamicMetrics,
};
