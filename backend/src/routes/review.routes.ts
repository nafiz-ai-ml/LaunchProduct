import { Router } from 'express';
import { z } from 'zod';
import { reviewController } from '../controllers/review.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { authRateLimit, publicRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();

// Validation Schemas
const submitReviewSchema = z
  .object({
    productId: z.string({ required_error: 'Product ID is required' }).trim().min(1),
    rating: z
      .number({ required_error: 'Rating is required' })
      .int('Rating must be an integer')
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating cannot exceed 5'),
    title: z.string().trim().min(3).max(100).optional(),
    body: z.string().trim().min(20).max(2000).optional(),
    content: z.string().trim().min(20).max(2000).optional(),
    conflictOfInterestDisclosed: z.boolean().optional(),
  })
  .refine((data) => !!(data.body || data.content), {
    message: 'Review body/content is required and must be at least 20 characters',
    path: ['body'],
  });

const founderReplySchema = z
  .object({
    body: z.string().trim().min(2).max(1000).optional(),
    content: z.string().trim().min(2).max(1000).optional(),
    replyBody: z.string().trim().min(2).max(1000).optional(),
  })
  .refine((data) => !!(data.body || data.content || data.replyBody), {
    message: 'Reply content is required',
    path: ['content'],
  });

const flagReviewSchema = z.object({
  reason: z
    .string({ required_error: 'Reason is required to flag a review' })
    .trim()
    .min(5, 'Reason must be at least 5 characters')
    .max(500, 'Reason cannot exceed 500 characters'),
});

/**
 * 1. POST /api/v1/reviews
 * Submit a community review for a live product (requires authentication)
 */
router.post(
  '/',
  requireAuth,
  authRateLimit,
  validate(submitReviewSchema, 'body'),
  (req, res, next) => reviewController.submitReview(req, res, next)
);

/**
 * 2. GET /api/v1/reviews
 * Query reviews by productId query parameter
 */
router.get(
  '/',
  publicRateLimit,
  (req, res, next) => reviewController.getProductReviews(req, res, next)
);

/**
 * 3. GET /api/v1/reviews/:id
 * Retrieve a single review by its ID
 */
router.get(
  '/:id',
  publicRateLimit,
  (req, res, next) => reviewController.getReviewById(req, res, next)
);

/**
 * 4. POST /api/v1/reviews/:id/reply
 * Post official founder response to an approved community review
 */
router.post(
  '/:id/reply',
  requireAuth,
  authRateLimit,
  validate(founderReplySchema, 'body'),
  (req, res, next) => reviewController.founderReply(req, res, next)
);

/**
 * 5. POST /api/v1/reviews/:id/flag
 * Report an abusive/fraudulent review for moderation investigation
 */
router.post(
  '/:id/flag',
  requireAuth,
  authRateLimit,
  validate(flagReviewSchema, 'body'),
  (req, res, next) => reviewController.flagReview(req, res, next)
);

export default router;
