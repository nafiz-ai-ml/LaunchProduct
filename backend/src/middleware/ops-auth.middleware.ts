import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../shared/config';
import { redis, isRedisConnected } from '../shared/redis';
import { logger } from '../shared/logger';

/**
 * Constant-time string comparison using equal-length SHA-256 digests.
 * Prevents length-leakage and timing side-channel attacks.
 */
export function constantTimeCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Checks whether Bull Board dashboard should be mounted.
 * Both BULL_BOARD_USER and BULL_BOARD_PASSWORD must be configured,
 * and BULL_BOARD_PASSWORD must be at least 24 characters.
 */
export function isBullBoardEnabled(): boolean {
  const user = process.env.BULL_BOARD_USER || config.BULL_BOARD_USER;
  const password = process.env.BULL_BOARD_PASSWORD || config.BULL_BOARD_PASSWORD;

  if (!user || typeof user !== 'string' || user.trim().length === 0) {
    return false;
  }

  if (!password || typeof password !== 'string' || password.length < 24) {
    return false;
  }

  return true;
}

// In-memory rate limiting store for Bull Board access
const bullBoardRateLimitStore = new Map<string, number[]>();

export function resetBullBoardRateLimit(): void {
  bullBoardRateLimitStore.clear();
}

/**
 * Rate limiter: maximum 10 attempts per minute per req.ip.
 * Strictly uses req.ip (not X-Forwarded-For).
 */
export async function bullBoardRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Use req.ip directly (trust proxy is configured in Express)
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const limit = 10;
  const key = `rl:bull-board:${ip}`;

  let count = 0;

  try {
    if (isRedisConnected()) {
      const clearBefore = now - windowMs;
      await redis.zremrangebyscore(key, '-inf', clearBefore);
      count = await redis.zcard(key);

      if (count >= limit) {
        res.setHeader('Retry-After', '60');
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded for queue administration dashboard',
        });
        return;
      }

      await redis.zadd(key, now, `${now}:${Math.random()}`);
      await redis.pexpire(key, windowMs);
      next();
      return;
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Redis rate limiter error, using in-memory store');
  }

  // Fallback to in-memory store
  const timestamps = (bullBoardRateLimitStore.get(ip) || []).filter(
    (ts) => ts > now - windowMs
  );

  if (timestamps.length >= limit) {
    res.setHeader('Retry-After', '60');
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded for queue administration dashboard',
    });
    return;
  }

  timestamps.push(now);
  bullBoardRateLimitStore.set(ip, timestamps);
  next();
}

/**
 * HTTP Basic Authentication middleware for Bull Board.
 * Set Cache-Control: no-store and constant-time credentials verification.
 * On failure responds 401 with WWW-Authenticate: Basic realm="queues", no body details.
 */
export function bullBoardAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('Cache-Control', 'no-store');

  const expectedUser = process.env.BULL_BOARD_USER || config.BULL_BOARD_USER;
  const expectedPassword = process.env.BULL_BOARD_PASSWORD || config.BULL_BOARD_PASSWORD;

  if (!expectedUser || !expectedPassword || expectedPassword.length < 24) {
    res.setHeader('WWW-Authenticate', 'Basic realm="queues"');
    res.status(401).end();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="queues"');
    res.status(401).end();
    return;
  }

  try {
    const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
    const colonIndex = credentials.indexOf(':');
    if (colonIndex === -1) {
      res.setHeader('WWW-Authenticate', 'Basic realm="queues"');
      res.status(401).end();
      return;
    }

    const username = credentials.substring(0, colonIndex);
    const password = credentials.substring(colonIndex + 1);

    const userMatches = constantTimeCompare(username, expectedUser);
    const passwordMatches = constantTimeCompare(password, expectedPassword);

    if (!userMatches || !passwordMatches) {
      res.setHeader('WWW-Authenticate', 'Basic realm="queues"');
      res.status(401).end();
      return;
    }

    next();
  } catch {
    res.setHeader('WWW-Authenticate', 'Basic realm="queues"');
    res.status(401).end();
  }
}

/**
 * Prometheus metrics authorization middleware for /api/metrics.
 * Requires Authorization: Bearer <METRICS_TOKEN> compared in constant time.
 * Returns 404 if METRICS_TOKEN is not configured.
 */
export function metricsAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const expectedToken = process.env.METRICS_TOKEN || config.METRICS_TOKEN;
  if (!expectedToken || typeof expectedToken !== 'string' || expectedToken.trim().length === 0) {
    res.status(404).json({
      success: false,
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found on LaunchProduct API`,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized metrics scrape: Missing or invalid Bearer token',
    });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!constantTimeCompare(token, expectedToken)) {
    res.status(401).json({
      error: 'Unauthorized metrics scrape: Invalid token',
    });
    return;
  }

  next();
}
