import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { publicRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();

/**
 * 1. GET /api/v1/analytics/public-stats
 * Real-time dynamic stats: visitors, paid ranking volume, products listed.
 * Public rate-limited (60 req/min). Backed by DB records.
 */
router.get('/public-stats', publicRateLimit, (req, res, next) =>
  analyticsController.getPublicStats(req, res, next)
);

/**
 * 2. POST /api/v1/analytics/track-visit
 * Real-time visitor counter increment.
 * Public rate-limited.
 */
router.post('/track-visit', publicRateLimit, (req, res, next) =>
  analyticsController.trackVisit(req, res, next)
);

export default router;
