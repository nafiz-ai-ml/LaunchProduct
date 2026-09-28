import { Router } from 'express';
import { z } from 'zod';
import { campaignController } from '../controllers/campaign.controller';
import { validate } from '../middleware/validate.middleware';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { authRateLimit, publicRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();

const checkoutSchema = z.object({
  productId: z.string({ required_error: 'Product ID is required' }).trim().min(1),
  tier: z.enum(['LAUNCH_BOOST', 'CATEGORY_FEATURED', 'HOMEPAGE_SPOTLIGHT', 'LAUNCH_PARTNER'], {
    required_error: 'Valid sponsorship tier is required',
  }),
  startsAt: z.string().optional(),
  startDate: z.string().optional(),
  targetCategorySlug: z.string().trim().optional(),
  provider: z.enum(['paddle', 'lemonsqueezy']).optional(),
});

/**
 * 1. GET /api/v1/campaigns/inventory & /api/v1/campaigns/availability
 * Query slot availability, concurrency status, and pricing
 */
router.get(
  '/inventory',
  publicRateLimit,
  (req, res, next) => campaignController.checkSlotInventory(req, res, next)
);
router.get(
  '/availability',
  publicRateLimit,
  (req, res, next) => campaignController.checkSlotInventory(req, res, next)
);

/**
 * 2. POST /api/v1/campaigns/checkout & /api/v1/campaigns/reserve
 * Initiate 15-minute slot reservation hold and generate MoR checkout session
 */
router.post(
  '/checkout',
  requireAuth,
  requireRole('FOUNDER', 'ADMIN'),
  authRateLimit,
  validate(checkoutSchema, 'body'),
  (req, res, next) => campaignController.createCheckout(req, res, next)
);
router.post(
  '/reserve',
  requireAuth,
  requireRole('FOUNDER', 'ADMIN'),
  authRateLimit,
  validate(checkoutSchema, 'body'),
  (req, res, next) => campaignController.createCheckout(req, res, next)
);

/**
 * 3. GET /api/v1/campaigns/my-campaigns
 * List all campaigns owned by the requesting founder
 */
router.get(
  '/my-campaigns',
  requireAuth,
  requireRole('FOUNDER', 'ADMIN'),
  authRateLimit,
  (req, res, next) => campaignController.getMyCampaigns(req, res, next)
);

/**
 * 4. GET /api/v1/campaigns/:id
 * Retrieve campaign delivery performance metrics
 */
router.get(
  '/:id',
  requireAuth,
  requireRole('FOUNDER', 'ADMIN'),
  authRateLimit,
  (req, res, next) => campaignController.getCampaignDetails(req, res, next)
);

export default router;
