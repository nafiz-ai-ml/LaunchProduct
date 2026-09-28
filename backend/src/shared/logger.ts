import pino from 'pino';
import pinoHttp from 'pino-http';
import { config } from './config';

// 1. Use pino for structured JSON logging
// 2. In development, use pino-pretty for human-readable output
// 3. In production, output raw JSON
const nodeEnv = process.env.NODE_ENV || config.NODE_ENV || 'development';
const isDev = nodeEnv === 'development';

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

// 5. Export a requestLogger middleware using pino-http for Express
export const requestLogger = pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  autoLogging: {
    ignore: (req) => req.url === '/api/health' || req.url === '/api/metrics',
  },
});

// 4. Export a default logger instance
export default logger;
