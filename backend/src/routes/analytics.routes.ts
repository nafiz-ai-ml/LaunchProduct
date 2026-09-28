import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { authRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();

/**
 * GET /api/v1/analytics/products/:id?days=30
 * Retrieve aggregated founder analytics, CTR, and referrer breakdown.
 * Protected: requires FOUNDER or ADMIN role.
 */
router.get(
  '/products/:id',
  requireAuth,
  authRateLimit,
  (req, res, next) => analyticsController.getFounderAnalytics(req, res, next)
);

export default router;
