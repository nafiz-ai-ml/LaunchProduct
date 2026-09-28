import { Router } from 'express';
import { z } from 'zod';
import { productController } from '../controllers/product.controller';
import { ownershipController } from '../controllers/ownership.controller';
import { reviewController } from '../controllers/review.controller';
import { validate } from '../middleware/validate.middleware';
import {
  publicRateLimit,
  authRateLimit,
  submissionRateLimit,
} from '../middleware/rate-limit.middleware';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Validation Schemas
const scrapePreviewSchema = z
  .object({
    url: z.string().trim().min(1).optional(),
    websiteUrl: z.string().trim().min(1).optional(),
  })
  .refine((data) => !!(data.url || data.websiteUrl), {
    message: 'Either url or websiteUrl must be provided',
    path: ['url'],
  });

const confirmDraftSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(2).max(100),
  tagline: z.string({ required_error: 'Tagline is required' }).trim().min(10).max(140),
  description: z.string({ required_error: 'Description is required' }).trim().min(10).max(5000),
  categoryId: z.string({ required_error: 'Category ID is required' }),
  pricing: z
    .object({
      model: z.enum(['free', 'freemium', 'paid', 'open_source']),
      startingPrice: z.number().min(0).optional(),
      currency: z.string().optional(),
    })
    .optional(),
  media: z
    .object({
      logoUrl: z.string().optional(),
      bannerUrl: z.string().optional(),
      screenshotUrls: z.array(z.string()).max(10).optional(),
    })
    .optional(),
  websiteUrl: z.string().optional(),
});

const manualSubmitSchema = confirmDraftSchema.extend({
  websiteUrl: z.string({ required_error: 'Website URL is required' }).trim().min(1),
});

const updateProductSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  tagline: z.string().trim().min(10).max(140).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  websiteUrl: z.string().trim().optional(),
  categoryId: z.string().optional(),
  pricing: z
    .object({
      model: z.enum(['free', 'freemium', 'paid', 'open_source']).optional(),
      startingPrice: z.number().min(0).optional(),
      currency: z.string().optional(),
    })
    .optional(),
  media: z
    .object({
      logoUrl: z.string().optional(),
      bannerUrl: z.string().optional(),
      screenshotUrls: z.array(z.string()).max(10).optional(),
    })
    .optional(),
  changeReason: z.string().max(500).optional(),
});

/**
 * 1. POST /api/v1/products/scrape-preview (and /submit-url)
 * Submit website URL for asynchronous sandboxed scraping.
 * Guarded by submissionRateLimit (10 req/hour) & requireAuth.
 */
router.post(
  ['/scrape-preview', '/submit-url'],
  requireAuth,
  submissionRateLimit,
  validate(scrapePreviewSchema, 'body'),
  (req, res, next) => productController.scrapePreview(req, res, next)
);

/**
 * 2. GET /api/v1/products/scrape-status/:jobId
 * Poll status of an active scrape ingestion job.
 */
router.get(
  ['/scrape-status/:jobId', '/scrape-job/:jobId'],
  requireAuth,
  authRateLimit,
  (req, res, next) => productController.getScrapeStatus(req, res, next)
);

/**
 * 3. POST /api/v1/products
 * Manual fallback product submission.
 */
router.post(
  '/',
  requireAuth,
  authRateLimit,
  validate(manualSubmitSchema, 'body'),
  (req, res, next) => productController.manualSubmit(req, res, next)
);

/**
 * 4. PUT / POST /api/v1/products/:id/confirm (and /draft/:id/confirm)
 * Confirm draft product metadata and submit for moderation review.
 */
router.put(
  ['/:id/confirm', '/draft/:id/confirm'],
  requireAuth,
  authRateLimit,
  validate(confirmDraftSchema, 'body'),
  (req, res, next) => productController.confirmDraft(req, res, next)
);
router.post(
  ['/:id/confirm', '/draft/:id/confirm'],
  requireAuth,
  authRateLimit,
  validate(confirmDraftSchema, 'body'),
  (req, res, next) => productController.confirmDraft(req, res, next)
);

/**
 * POST /api/v1/products/:id/claim
 * Initiate ownership verification challenge for this product (API Spec Module 3 Section 4.1)
 */
router.post(
  '/:id/claim',
  requireAuth,
  submissionRateLimit,
  (req, res, next) => ownershipController.initiateClaim(req, res, next)
);

/**
 * 5. GET /api/v1/products
 * Public search & directory browse with faceted filters.
 */
router.get(
  '/',
  publicRateLimit,
  (req, res, next) => productController.search(req, res, next)
);

/**
 * 5.5 GET /api/v1/products/me/mine
 * Authenticated founder's products
 */
router.get(
  '/me/mine',
  requireAuth,
  authRateLimit,
  (req, res, next) => productController.getMyProducts(req, res, next)
);

/**
 * 6. GET /api/v1/products/:slug
 * Public product detail page.
 */
router.get(
  '/:slug',
  publicRateLimit,
  (req, res, next) => productController.getBySlug(req, res, next)
);

/**
 * 7. PATCH /api/v1/products/:id
 * Founder update product details (records revision snapshot).
 */
router.patch(
  '/:id',
  requireAuth,
  requireRole('FOUNDER', 'ADMIN'),
  authRateLimit,
  validate(updateProductSchema, 'body'),
  (req, res, next) => productController.update(req, res, next)
);

/**
 * 8. DELETE /api/v1/products/:id
 * Soft delete product.
 */
router.delete(
  '/:id',
  requireAuth,
  authRateLimit,
  (req, res, next) => productController.delete(req, res, next)
);

/**
 * 9. GET /api/v1/products/:id/revisions
 * Retrieve revision audit history for a product.
 */
router.get(
  '/:id/revisions',
  publicRateLimit,
  (req, res, next) => productController.getRevisions(req, res, next)
);

/**
 * 10. GET /api/v1/products/:id/reviews
 * Retrieve paginated community reviews with ratings distribution (API Spec Module 5.1).
 */
router.get(
  '/:id/reviews',
  publicRateLimit,
  (req, res, next) => reviewController.getProductReviews(req, res, next)
);

export default router;
