import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { authRateLimit, publicRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();

/**
 * GET /api/v1/analytics/public-stats
 * Real-time dynamic stats: visitors, paid ranking volume, products listed.
 * Public rate-limited (60 req/min). Backed by DB records, defaults to 0.
 */
router.get('/public-stats', publicRateLimit, (req, res, next) =>
  analyticsController.getPublicStats(req, res, next)
);

/**
 * POST /api/v1/analytics/track-visit
 * Real-time visitor counter increment.
 * Public rate-limited.
 */
router.post('/track-visit', publicRateLimit, (req, res, next) =>
  analyticsController.trackVisit(req, res, next)
);

/**
 * GET /api/v1/analytics/products/:id?days=30
 * Retrieve aggregated founder analytics, CTR, and referrer breakdown.
 * Protected: requires auth.
 */
router.get(
  '/products/:id',
  requireAuth,
  authRateLimit,
  (req, res, next) => analyticsController.getFounderAnalytics(req, res, next)
);

export default router;
