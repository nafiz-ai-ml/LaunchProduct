import { Router } from 'express';
import { badgeController } from '../controllers/badge.controller';
import { publicRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();

// Rate limit badge embeds (60 req/min per IP)
router.use(publicRateLimit);

/**
 * GET /api/badge/:slug.svg
 * Dynamic SVG Badge embed route (unversioned for stability across API versions)
 */
router.get('/:slug.svg', (req, res, next) => badgeController.getBadgeSvg(req, res, next));
router.get('/:slug', (req, res, next) => badgeController.getBadgeSvg(req, res, next));

export default router;
