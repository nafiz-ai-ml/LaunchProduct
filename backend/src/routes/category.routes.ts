import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { publicRateLimit } from '../middleware/rate-limit.middleware';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../shared/constants';

const router = Router();

/**
 * 1. GET /api/v1/categories
 * Return full category hierarchy tree (parent + children).
 * Cached in Redis with 1-hour TTL. Public sliding window rate limited.
 */
router.get('/', publicRateLimit, (req, res, next) =>
  categoryController.getCategoryTree(req, res, next)
);

/**
 * 2. GET /api/v1/categories/:slug
 * Category detail with live product count.
 */
router.get('/:slug', publicRateLimit, (req, res, next) =>
  categoryController.getCategoryBySlug(req, res, next)
);

/**
 * 3. POST /api/v1/categories
 * Create taxonomy category (requires ADMIN role).
 */
router.post(
  '/',
  requireAuth,
  requireRole(UserRole.ADMIN),
  (req, res, next) => categoryController.createCategory(req, res, next)
);

/**
 * 4. PATCH /api/v1/categories/:id
 * Update category (requires ADMIN role).
 */
router.patch(
  '/:id',
  requireAuth,
  requireRole(UserRole.ADMIN),
  (req, res, next) => categoryController.updateCategory(req, res, next)
);

export default router;
