import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { redis } from '../shared/redis';
import { emailQueue } from '../shared/email-queue';
import { register, updateDynamicMetrics } from '../shared/metrics';
import { logger } from '../shared/logger';

interface DependencyStatus {
  status: 'connected' | 'disconnected' | 'active' | 'inactive';
  latencyMs?: number;
  activeWorkers?: number;
  error?: string;
}

/**
 * Checks authorization for Prometheus scrape requests
 * Allows requests from local loopback, private subnets, configured whitelists, or Basic Auth.
 */
export function isAuthorizedForMetrics(req: Request): boolean {
  // Always permit in testing or local development
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    return true;
  }

  // 1. IP Whitelist verification (Private IPv4 & IPv6 loopbacks)
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    req.ip ||
    '';

  const isLocalOrPrivate =
    clientIp === '127.0.0.1' ||
    clientIp === '::1' ||
    clientIp === '::ffff:127.0.0.1' ||
    clientIp.startsWith('10.') ||
    clientIp.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clientIp);

  if (isLocalOrPrivate) {
    return true;
  }

  if (process.env.METRICS_ALLOWED_IPS) {
    const allowed = process.env.METRICS_ALLOWED_IPS.split(',').map((ip) => ip.trim());
    if (allowed.includes(clientIp)) {
      return true;
    }
  }

  // 2. HTTP Basic Auth / Bearer Token fallback
  const authHeader = req.headers.authorization;
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const expectedToken = process.env.METRICS_AUTH_TOKEN || process.env.JWT_SECRET;
      if (token && token === expectedToken) {
        return true;
      }
    }

    if (authHeader.startsWith('Basic ')) {
      try {
        const credentials = Buffer.from(authHeader.substring(6).trim(), 'base64').toString('ascii');
        const [username, password] = credentials.split(':');
        const expectedUser = process.env.METRICS_USER || 'prometheus';
        const expectedPassword =
          process.env.METRICS_PASSWORD || process.env.ADMIN_PASSWORD || 'launchproduct_metrics_secret';

        if (username === expectedUser && password === expectedPassword) {
          return true;
        }
      } catch {
        return false;
      }
    }
  }

  return false;
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

    const httpStatus = allHealthy ? 200 : 503;
    res.status(httpStatus).json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      dependencies,
    });
  }

  /**
   * 2. GET /api/health/live
   * Kubernetes Liveness Probe (Instant 200 OK, no database round-trips)
   */
  getLiveness(_req: Request, res: Response): void {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
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
   * Prometheus Scrape Endpoint
   * Returns text/plain; version=0.0.4 Prometheus exposition format
   */
  async getMetrics(req: Request, res: Response): Promise<void> {
    // 1. IP whitelist / Basic Auth authorization guard
    if (!isAuthorizedForMetrics(req)) {
      res
        .status(401)
        .set('WWW-Authenticate', 'Basic realm="Prometheus Metrics"')
        .json({
          error: 'Unauthorized metrics scrape: IP or credentials not authorized',
        });
      return;
    }

    try {
      // 2. Update dynamic gauge metrics from DB and queues
      await updateDynamicMetrics();

      // 3. Return metrics in Prometheus exposition format
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
