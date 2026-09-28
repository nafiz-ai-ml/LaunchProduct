import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { authRateLimit } from '../middleware/rate-limit.middleware';
import { UserRole } from '../shared/constants';

const router = Router();

// Strict RBAC: All administration endpoints are gated by requireAuth + requireRole('ADMIN')
router.use(authRateLimit);
router.use(requireAuth);
router.use(requireRole(UserRole.ADMIN));

/**
 * 1. GET /api/v1/admin/settings & PATCH /api/v1/admin/settings/:key
 * System configuration parameters & formula weights
 */
router.get('/settings', (req, res, next) => adminController.getSettings(req, res, next));
router.patch('/settings/:key', (req, res, next) => adminController.updateSetting(req, res, next));

/**
 * 2. POST /api/v1/admin/leaderboard/recompute
 * Manually trigger asynchronous leaderboard recomputation in BullMQ
 */
router.post('/leaderboard/recompute', (req, res, next) =>
  adminController.recomputeLeaderboard(req, res, next)
);

/**
 * 3. GET /api/v1/admin/audit-logs
 * Unified governance audit log (moderation_actions + activity_events)
 */
router.get('/audit-logs', (req, res, next) => adminController.getAuditLogs(req, res, next));

/**
 * 4. GET /api/v1/admin/users & PATCH /api/v1/admin/users/:id
 * User directory with search, filtering, role reassignment, and banning
 */
router.get('/users', (req, res, next) => adminController.getUsers(req, res, next));
router.patch('/users/:id', (req, res, next) => adminController.updateUser(req, res, next));

/**
 * 5. GET /api/v1/admin/campaigns
 * Sponsorship campaign inventory overview with real-time slot utilization
 */
router.get('/campaigns', (req, res, next) => adminController.getCampaignsOverview(req, res, next));

/**
 * 6. GET /api/v1/admin/queues
 * Real-time BullMQ background workers status and queue depth overview
 */
router.get('/queues', (req, res, next) => adminController.getQueues(req, res, next));

export default router;
