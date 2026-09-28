import { Router } from 'express';
import { ogController } from '../controllers/og.controller';
import { publicRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();

// Rate limit OG image requests (60 req/min per IP)
router.use(publicRateLimit);

/**
 * GET /api/og/:slug
 * Dynamic 1200x630 OpenGraph card route (unversioned for stability across API versions)
 */
router.get('/:slug', (req, res, next) => ogController.getOgImage(req, res, next));

export default router;
