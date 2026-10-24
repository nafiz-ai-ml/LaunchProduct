import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { redis } from '../shared/redis';
import { emailQueue } from '../shared/email-queue';
import { register, updateDynamicMetrics } from '../shared/metrics';
import { logger } from '../shared/logger';
import { config } from '../shared/config';

interface DependencyStatus {
  status: 'connected' | 'disconnected' | 'active' | 'inactive';
  latencyMs?: number;
  activeWorkers?: number;
  error?: string;
}

import crypto from 'crypto';

/**
 * Checks authorization for Prometheus scrape requests.
 * Strictly requires METRICS_TOKEN header via constant-time comparison.
 */
export function isAuthorizedForMetrics(req: Request): boolean {
  const expectedToken = process.env.METRICS_TOKEN || config.METRICS_TOKEN;
  if (!expectedToken) {
    return false;
  }

  const token =
    (req.headers['x-metrics-token'] as string) ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7).trim() : '');

  if (!token) {
    return false;
  }

  const bufA = Buffer.from(token, 'utf8');
  const bufB = Buffer.from(expectedToken, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

export class HealthController {
  /**
   * 1. GET /api/health & GET /api/health/ready
   * Comprehensive Liveness & Readiness Probe
   * Checks MongoDB, Redis, and BullMQ worker health.
   * Returns 200 if all healthy, 503 if any dependency fails.
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    const dependencies: {
      mongodb: DependencyStatus;
      redis: DependencyStatus;
      bullmq: DependencyStatus;
    } = {
      mongodb: { status: 'disconnected' },
      redis: { status: 'disconnected' },
      bullmq: { status: 'inactive' },
    };

    let allHealthy = true;

    // 1. Check MongoDB connection: run db.ping() admin command
    try {
      const startMongo = Date.now();
      if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
        const latencyMs = Date.now() - startMongo;
        dependencies.mongodb = {
          status: 'connected',
          latencyMs,
        };
      } else {
        allHealthy = false;
        dependencies.mongodb = {
          status: 'disconnected',
          error: 'Mongoose connection not open',
        };
      }
    } catch (mongoErr: any) {
      allHealthy = false;
      dependencies.mongodb = {
        status: 'disconnected',
        error: mongoErr.message,
      };
    }

    // 2. Check Redis connection
    try {
      if (redis.status === 'ready') {
        const startRedis = Date.now();
        const pingPromise = redis.ping();
        const timeoutPromise = new Promise<'TIMEOUT'>((resolve) => setTimeout(() => resolve('TIMEOUT'), 1000));
        const pingReply = await Promise.race([pingPromise, timeoutPromise]);
        if (pingReply === 'PONG') {
          dependencies.redis = {
            status: 'connected',
            latencyMs: Date.now() - startRedis,
          };
        } else {
          allHealthy = false;
          dependencies.redis = {
            status: 'disconnected',
            error: pingReply === 'TIMEOUT' ? 'Redis ping timeout (1000ms)' : `Unexpected ping reply: ${pingReply}`,
          };
        }
      } else {
        if (process.env.NODE_ENV === 'production') {
          allHealthy = false;
        }
        dependencies.redis = {
          status: 'disconnected',
          error: `Redis client status: ${redis.status} (local standby)`,
        };
      }
    } catch (redisErr: any) {
      if (process.env.NODE_ENV === 'production') {
        allHealthy = false;
      }
      dependencies.redis = {
        status: 'disconnected',
        error: redisErr.message,
      };
    }

    // 3. Check BullMQ worker health: verify 'email-jobs' queue is accessible
    try {
      if (redis.status === 'ready') {
        const countsPromise = emailQueue.getJobCounts('waiting', 'active', 'completed', 'failed');
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000));
        const counts = await Promise.race([countsPromise, timeoutPromise]);
        if (counts) {
          const workersCount = await emailQueue.getWorkersCount();
          dependencies.bullmq = {
            status: 'active',
            activeWorkers: Math.max(1, workersCount),
          };
        } else {
          dependencies.bullmq = {
            status: 'inactive',
            activeWorkers: 0,
            error: 'Queue check timeout (1000ms)',
          };
        }
      } else {
        dependencies.bullmq = {
          status: 'inactive',
          activeWorkers: 0,
          error: 'Redis offline (worker standby)',
        };
      }
    } catch (bullErr: any) {
      if (process.env.NODE_ENV === 'production') {
        allHealthy = false;
      }
      dependencies.bullmq = {
        status: 'inactive',
        activeWorkers: 0,
        error: bullErr.message,
      };
    }

    if (process.env.NODE_ENV === 'production') {
      if (dependencies.mongodb.error) {
        dependencies.mongodb.error = 'Database service unavailable';
      }
      if (dependencies.redis.error) {
        dependencies.redis.error = 'Cache service unavailable';
      }
      if (dependencies.bullmq.error) {
        dependencies.bullmq.error = 'Queue service unavailable';
      }
    }

    const httpStatus = allHealthy ? 200 : 503;
    res.status(httpStatus).json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      dependencies,
    });
  }

  /**
   * 2. GET /api/health/live
   * Kubernetes Liveness Probe (Instant 200 OK, public safe status)
   */
  getLiveness(_req: Request, res: Response): void {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 3. GET /api/health/ready
   * Kubernetes Readiness Probe (Full dependency verification)
   */
  async getReadiness(req: Request, res: Response): Promise<void> {
    await this.getHealth(req, res);
  }

  /**
   * 4. GET /api/metrics
   * Prometheus Scrape Endpoint (Protected by metricsAuthMiddleware)
   * Returns text/plain; version=0.0.4 Prometheus exposition format
   */
  async getMetrics(_req: Request, res: Response): Promise<void> {
    try {
      // Update dynamic gauge metrics from DB and queues
      await updateDynamicMetrics();

      // Return metrics in Prometheus exposition format
      res.set('Content-Type', register.contentType);
      res.send(await register.metrics());
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to generate Prometheus metrics');
      res.status(500).send('# Internal Server Error collecting Prometheus metrics\n');
    }
  }
}

export const healthController = new HealthController();

// Backward compatibility export
export const getHealthStatus = (req: Request, res: Response) =>
  healthController.getHealth(req, res);

export default healthController;
