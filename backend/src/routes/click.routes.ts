import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { publicRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();

/**
 * GET /api/v1/clicks/:productId?source=organic|sponsored
 * High-speed outbound attribution redirect (<= 25ms p95 latency)
 * Publicly accessible with publicRateLimit (60 req/min/IP).
 */
router.get(
  '/:productId',
  publicRateLimit,
  (req, res, next) => analyticsController.handleOutboundClick(req, res, next)
);

export default router;
