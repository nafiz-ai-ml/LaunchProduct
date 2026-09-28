import { Router } from 'express';
import { z } from 'zod';
import { ownershipController } from '../controllers/ownership.controller';
import { validate } from '../middleware/validate.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { authRateLimit, submissionRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();

const initiateClaimSchema = z.object({
  verificationMethod: z.enum(['DNS_TXT', 'HTML_META', 'EMAIL_DOMAIN'], {
    required_error: 'verificationMethod is required and must be one of: DNS_TXT, HTML_META, EMAIL_DOMAIN',
  }),
});

/**
 * 1. GET /api/v1/claims
 * Retrieve all ownership claims initiated by the authenticated user
 */
router.get(
  '/',
  requireAuth,
  authRateLimit,
  (req, res, next) => ownershipController.getUserClaims(req, res, next)
);

/**
 * 2. POST /api/v1/claims/:productId
 * Initiate ownership verification challenge for product
 */
router.post(
  '/:productId',
  requireAuth,
  submissionRateLimit,
  validate(initiateClaimSchema, 'body'),
  (req, res, next) => ownershipController.initiateClaim(req, res, next)
);

/**
 * 3. GET /api/v1/claims/:claimId
 * Get current state of an ownership claim
 */
router.get(
  '/:claimId',
  requireAuth,
  authRateLimit,
  (req, res, next) => ownershipController.getClaimStatus(req, res, next)
);

/**
 * 4. POST /api/v1/claims/:claimId/verify
 * Execute automated verification validation check
 */
router.post(
  '/:claimId/verify',
  requireAuth,
  authRateLimit,
  (req, res, next) => ownershipController.verifyClaim(req, res, next)
);

export default router;
