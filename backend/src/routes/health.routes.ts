import { Router } from 'express';
import { healthController } from '../controllers/health.controller';

const router = Router();

/**
 * 1. GET /api/health
 * Comprehensive health check probe (MongoDB, Redis, BullMQ)
 */
router.get('/', (req, res) => healthController.getHealth(req, res));

/**
 * 2. GET /api/health/live
 * Kubernetes liveness probe (instant 200 OK)
 */
router.get('/live', (req, res) => healthController.getLiveness(req, res));

/**
 * 3. GET /api/health/ready
 * Kubernetes readiness probe (full dependency check)
 */
router.get('/ready', (req, res) => healthController.getReadiness(req, res));

export default router;
