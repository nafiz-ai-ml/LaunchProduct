import { Request, Response, NextFunction } from 'express';
import { redis, isRedisConnected } from '../shared/redis';
import { RateLimitError } from '../shared/errors';
import { logger } from '../shared/logger';

// Sliding Window Redis Lua Script
const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]

-- Remove items outside the sliding window
local clearBefore = now - windowMs
redis.call('ZREMRANGEBYSCORE', key, '-inf', clearBefore)

-- Count remaining requests in current window
local currentCount = redis.call('ZCARD', key)

if currentCount < limit then
  -- Add current timestamp to sorted set
  redis.call('ZADD', key, now, member)
  redis.call('PEXPIRE', key, windowMs)
  local remaining = limit - currentCount - 1
  local resetTime = math.floor((now + windowMs) / 1000)
  return { 1, remaining, resetTime }
else
  -- Quota exceeded: compute earliest expiration
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local resetTime = math.floor((now + windowMs) / 1000)
  if #oldest >= 2 then
    resetTime = math.floor((tonumber(oldest[2]) + windowMs) / 1000)
  end
  return { 0, 0, resetTime }
end
`;

// In-memory sliding window fallback for local testing when Redis is offline
const inMemoryFallbackStore = new Map<string, number[]>();

function executeInMemorySlidingWindow(
  key: string,
  now: number,
  windowMs: number,
  limit: number
): [number, number, number] {
  const timestamps = (inMemoryFallbackStore.get(key) || []).filter(
    (ts) => ts > now - windowMs
  );

  if (timestamps.length < limit) {
    timestamps.push(now);
    inMemoryFallbackStore.set(key, timestamps);
    const remaining = limit - timestamps.length;
    const resetTime = Math.floor((now + windowMs) / 1000);
    return [1, remaining, resetTime];
  } else {
    const oldest = timestamps[0] || now;
    const resetTime = Math.floor((oldest + windowMs) / 1000);
    return [0, 0, resetTime];
  }
}

/**
 * Extracts normalized client IP address
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

/**
 * Derives /24 IPv4 subnet or /48 IPv6 subnet for rate-limiting concentration
 */
export function getSubnet24(ip: string): string {
  if (!ip) return '0.0.0';
  const cleanIp = ip.replace(/^::ffff:/, '');
  if (cleanIp.includes('.')) {
    const parts = cleanIp.split('.');
    return `${parts[0] || '0'}.${parts[1] || '0'}.${parts[2] || '0'}.0/24`;
  }
  if (cleanIp.includes(':')) {
    const parts = cleanIp.split(':');
    return `${parts.slice(0, 3).join(':')}::/48`;
  }
  return cleanIp;
}

/**
 * Extracts lowercase domain from email address
 */
export function getEmailDomain(email?: string): string {
  if (!email || typeof email !== 'string') return 'unknown';
  const parts = email.split('@');
  return parts.length > 1 ? parts[1].toLowerCase().trim() : 'unknown';
}

interface RateLimitConfig {
  prefix: string;
  limit: number;
  windowMs: number;
  keyGenerator: (req: Request) => string;
}

/**
 * Generic sliding window rate limiter factory
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const identifier = config.keyGenerator(req);
    const key = `rl:${config.prefix}:${identifier}`;
    const now = Date.now();
    const member = `${now}:${Math.random().toString(36).substring(2, 9)}`;

    let allowed = 1;
    let remaining = config.limit - 1;
    let resetTime = Math.floor((now + config.windowMs) / 1000);

    try {
      if (isRedisConnected()) {
        const result = (await redis.eval(
          SLIDING_WINDOW_LUA,
          1,
          key,
          now.toString(),
          config.windowMs.toString(),
          config.limit.toString(),
          member
        )) as [number, number, number];

        allowed = Number(result[0]);
        remaining = Number(result[1]);
        resetTime = Number(result[2]);
      } else {
        // Fallback to in-memory sliding window if Redis is not currently ready
        const fallbackResult = executeInMemorySlidingWindow(
          key,
          now,
          config.windowMs,
          config.limit
        );
        allowed = fallbackResult[0];
        remaining = fallbackResult[1];
        resetTime = fallbackResult[2];
      }
    } catch (err) {
      logger.warn({ err, key }, 'Redis rate limiter error, falling back to in-memory window');
      const fallbackResult = executeInMemorySlidingWindow(
        key,
        now,
        config.windowMs,
        config.limit
      );
      allowed = fallbackResult[0];
      remaining = fallbackResult[1];
      resetTime = fallbackResult[2];
    }

    // Set standard rate limit headers
    res.setHeader('X-RateLimit-Limit', config.limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));
    res.setHeader('X-RateLimit-Reset', resetTime);

    if (allowed === 0) {
      const retryAfter = Math.max(1, resetTime - Math.floor(now / 1000));
      res.setHeader('Retry-After', retryAfter);
      return next(new RateLimitError(429, 'RATE_LIMIT_EXCEEDED'));
    }

    next();
  };
}

/**
 * 1. publicRateLimit: 60 req/min per IP
 */
export const publicRateLimit = createRateLimiter({
  prefix: 'public',
  limit: 60,
  windowMs: 60 * 1000,
  keyGenerator: (req) => getClientIp(req),
});

/**
 * 2. authRateLimit: 120 req/min per userId (falls back to IP if not authenticated)
 */
export const authRateLimit = createRateLimiter({
  prefix: 'auth',
  limit: 120,
  windowMs: 60 * 1000,
  keyGenerator: (req) => req.user?.userId || getClientIp(req),
});

/**
 * 3. voteRateLimit: 10 req/min per userId + /24 IP subnet
 */
export const voteRateLimit = createRateLimiter({
  prefix: 'vote',
  limit: 10,
  windowMs: 60 * 1000,
  keyGenerator: (req) => {
    const userOrIp = req.user?.userId || 'anon';
    const subnet = getSubnet24(getClientIp(req));
    return `${userOrIp}:${subnet}`;
  },
});

/**
 * 4. magicLinkRateLimit: 5 req/hour per /24 IP subnet + email domain
 */
export const magicLinkRateLimit = createRateLimiter({
  prefix: 'magic',
  limit: 5,
  windowMs: 60 * 60 * 1000,
  keyGenerator: (req) => {
    const subnet = getSubnet24(getClientIp(req));
    const domain = getEmailDomain(req.body?.email);
    return `${subnet}:${domain}`;
  },
});

/**
 * 5. submissionRateLimit: 10 req/hour per userId
 */
export const submissionRateLimit = createRateLimiter({
  prefix: 'submission',
  limit: 10,
  windowMs: 60 * 60 * 1000,
  keyGenerator: (req) => req.user?.userId || getClientIp(req),
});

export default {
  publicRateLimit,
  authRateLimit,
  voteRateLimit,
  magicLinkRateLimit,
  submissionRateLimit,
};
