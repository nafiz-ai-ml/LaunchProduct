import client from 'prom-client';
import { Product } from '../models/Product.model';
import { ProductStatus } from './constants';
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

// 3. Live Products Total Gauge
export const liveProductsTotal = new client.Gauge({
  name: 'launchproduct_live_products_total',
  help: 'Current total count of LIVE products on LaunchProduct',
  registers: [register],
});

// 4. Scraper Queue Waiting Gauge
export const scraperQueueWaiting = new client.Gauge({
  name: 'launchproduct_scraper_queue_waiting',
  help: 'Number of pending scraping jobs waiting in BullMQ scraper-queue',
  registers: [register],
});

// 5. Deprecated Endpoint Hits Counter (RFC 8594 Sunset tracking)
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
  // 1. Live products
  try {
    const liveCount = await Product.countDocuments({ status: ProductStatus.LIVE });
    liveProductsTotal.set(liveCount);
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to collect live products metric');
  }

  // 2. Pending BullMQ scraper queue jobs
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
  liveProductsTotal,
  scraperQueueWaiting,
  deprecatedEndpointHitsTotal,
  updateDynamicMetrics,
};
