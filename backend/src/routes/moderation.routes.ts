import { Router } from 'express';
import { moderationController } from '../controllers/moderation.controller';
import { adminController } from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { authRateLimit } from '../middleware/rate-limit.middleware';
import { UserRole } from '../shared/constants';

const router = Router();

// Apply authenticated rate limiting and strict role enforcement (MODERATOR or ADMIN)
router.use(authRateLimit);
router.use(requireAuth);
router.use(requireRole(UserRole.MODERATOR, UserRole.ADMIN));

/**
 * 1. Queue Retrieval Endpoints
 */
router.get('/queue/products', (req, res, next) =>
  moderationController.getPendingProductsQueue(req, res, next)
);

router.get('/queue/votes', (req, res, next) =>
  moderationController.getQuarantinedVotesQueue(req, res, next)
);

router.get('/queue/claims', (req, res, next) =>
  moderationController.getDisputedClaimsQueue(req, res, next)
);

router.get('/audit-logs', (req, res, next) =>
  adminController.getAuditLogs(req, res, next)
);

/**
 * 2. Unified Moderation Action (API Specification Section 14.4)
 */
router.post('/action', (req, res, next) =>
  moderationController.submitUnifiedModerationAction(req, res, next)
);

/**
 * 3. Dedicated Resource-Level Moderation Actions (Accepts POST and PATCH)
 */
router.post('/products/:id/approve', (req, res, next) =>
  moderationController.approveProduct(req, res, next)
);
router.patch('/products/:id/approve', (req, res, next) =>
  moderationController.approveProduct(req, res, next)
);

router.post('/products/:id/reject', (req, res, next) =>
  moderationController.rejectProduct(req, res, next)
);
router.patch('/products/:id/reject', (req, res, next) =>
  moderationController.rejectProduct(req, res, next)
);

router.post('/votes/:id/approve', (req, res, next) =>
  moderationController.approveVote(req, res, next)
);

router.post('/votes/:id/reject', (req, res, next) =>
  moderationController.rejectVote(req, res, next)
);

router.post('/claims/:id/resolve', (req, res, next) =>
  moderationController.resolveClaim(req, res, next)
);

router.post('/users/:id/ban', (req, res, next) =>
  moderationController.banUser(req, res, next)
);

export default router;
