import Redis, { RedisOptions } from 'ioredis';
import { config } from './config';
import { logger } from './logger';

// 2. Read REDIS_URL from process.env
const redisUrl = process.env.REDIS_URL || config.REDIS_URL || 'redis://localhost:6379';

// 4. Exponential backoff reconnection strategy with dev quiet backoff
let redisWarnLogged = false;
const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy(times) {
    if (process.env.NODE_ENV !== 'production' && times > 2) {
      if (!redisWarnLogged) {
        logger.warn('⚠️ Local Redis is offline on localhost:6379. Background queue workers are idle. The Express REST API and MongoDB Atlas endpoints remain fully operational.');
        redisWarnLogged = true;
      }
      return 20000; // Check only every 20 seconds in local dev
    }
    const delay = Math.min(Math.pow(2, Math.min(times, 10)) * 50, 5000);
    return delay;
  },
  lazyConnect: true,
};

// 1 & 3. Create a singleton redis client instance using ioredis
export const redis = new Redis(redisUrl, redisOptions);

// 4. Handle connection events and errors
redis.on('connect', () => {
  logger.info('Redis connection established successfully');
});

redis.on('ready', () => {
  logger.info('Redis client ready for commands');
});

let errorLoggedOnce = false;
redis.on('error', (err) => {
  if (process.env.NODE_ENV !== 'production') {
    if (!errorLoggedOnce) {
      logger.warn({ err: err.message }, 'Redis offline in local development. Background queues in standby.');
      errorLoggedOnce = true;
    }
  } else {
    logger.error({ err: err.message }, 'Redis connection error');
  }
});

redis.on('close', () => {
  // Silent close in dev to prevent repetitive logs
  if (process.env.NODE_ENV === 'production') {
    logger.warn('Redis connection closed');
  }
});

// 6. Separate dedicated BullMQ connection configuration object
let parsedRedisUrl: URL;
try {
  parsedRedisUrl = new URL(redisUrl);
} catch {
  parsedRedisUrl = new URL('redis://localhost:6379');
}

export const bullMQRedisConnection = {
  host: parsedRedisUrl.hostname || 'localhost',
  port: Number(parsedRedisUrl.port) || 6379,
  password: parsedRedisUrl.password || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times: number) {
    if (process.env.NODE_ENV !== 'production' && times > 2) {
      return 20000; // Quiet backoff in dev
    }
    return Math.min(Math.pow(2, Math.min(times, 10)) * 50, 5000);
  },
};

const loggedQueues = new Set<string>();
export function logQueueErrorOnce(queueName: string, err: any) {
  if (process.env.NODE_ENV !== 'production') {
    if (!loggedQueues.has(queueName)) {
      loggedQueues.add(queueName);
      logger.warn({ queue: queueName, err: err?.message || '' }, 'BullMQ queue connection in standby (Redis offline)');
    }
  } else {
    logger.warn({ queue: queueName, err: err?.message || '' }, 'BullMQ queue connection error');
  }
}

export function isRedisConnected(): boolean {
  return redis.status === 'ready';
}

// 5. Export the redis client as default
export default redis;
