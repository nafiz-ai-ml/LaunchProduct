import { Router } from 'express';
import { z } from 'zod';
import { productController } from '../controllers/product.controller';
import { validate } from '../middleware/validate.middleware';
import { publicRateLimit, submissionRateLimit } from '../middleware/rate-limit.middleware';
import { safeUrlSchema, safeOptionalUrlSchema } from '../shared/zod-schemas';

const router = Router();

const publicSubmitSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(2).max(100),
  tagline: z.string({ required_error: 'Tagline is required' }).trim().min(10).max(140),
  description: z.string({ required_error: 'Description is required' }).trim().min(10).max(5000),
  websiteUrl: safeUrlSchema,
  categoryId: z.string({ required_error: 'Category ID is required' }),
  contactEmail: z.string().email().optional(),
  logoUrl: safeOptionalUrlSchema,
  initialPaymentCents: z.number().int().min(100).optional(),
  provider: z.enum(['paddle']).optional(),
  successUrl: safeOptionalUrlSchema,
  cancelUrl: safeOptionalUrlSchema,
});

/**
 * 1. POST /api/v1/products (and /public-submit)
 * Anonymous public product submission & Pay-to-Rank entry point.
 * Rate limited per client IP using req.ip (submissionRateLimit: 10 req/hour).
 * New products enter in status DRAFT.
 */
router.post(
  ['/', '/public-submit'],
  submissionRateLimit,
  validate(publicSubmitSchema, 'body'),
  (req, res, next) => productController.publicSubmit(req, res, next)
);

/**
 * 2. GET /api/v1/products
 * Public search & directory browse with faceted filters.
 */
router.get(
  '/',
  publicRateLimit,
  (req, res, next) => productController.search(req, res, next)
);

/**
 * 2.5 GET /api/v1/products/preview-domain
 * Public domain preview & ranking estimator
 */
router.get(
  '/preview-domain',
  publicRateLimit,
  (req, res, next) => productController.previewDomain(req, res, next)
);

/**
 * 3. GET /api/v1/products/:slug
 * Public product detail page.
 */
router.get(
  '/:slug',
  publicRateLimit,
  (req, res, next) => productController.getBySlug(req, res, next)
);

export default router;
