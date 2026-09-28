import { Router } from 'express';
import { z } from 'zod';
import { voteController } from '../controllers/vote.controller';
import { validate } from '../middleware/validate.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { voteRateLimit, authRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();

const castVoteSchema = z.object({
  productId: z.string({ required_error: 'Product ID is required' }).trim().min(1),
  clientFingerprint: z.string().trim().optional(),
  deviceFingerprint: z.string().trim().optional(),
  navTelemetryToken: z.string().trim().optional(),
});

/**
 * 1. POST /api/v1/votes
 * Cast product upvote with dynamic 6-factor risk scoring
 * Rate limited to 10 votes / minute per user + /24 subnet
 */
router.post(
  '/',
  requireAuth,
  voteRateLimit,
  validate(castVoteSchema, 'body'),
  (req, res, next) => voteController.castVote(req, res, next)
);

/**
 * 2. GET /api/v1/votes/user
 * Fetch all product IDs upvoted by the requesting user
 */
router.get(
  '/user',
  requireAuth,
  authRateLimit,
  (req, res, next) => voteController.getUserVotes(req, res, next)
);

/**
 * 3. GET /api/v1/votes/status
 * Batch check current user vote status for specified product IDs
 */
router.get(
  '/status',
  requireAuth,
  authRateLimit,
  (req, res, next) => voteController.getVoteStatus(req, res, next)
);

/**
 * 4. DELETE /api/v1/votes/:productId
 * Retract a previously cast upvote (within 15-minute window)
 */
router.delete(
  '/:productId',
  requireAuth,
  authRateLimit,
  (req, res, next) => voteController.retractVote(req, res, next)
);

export default router;
