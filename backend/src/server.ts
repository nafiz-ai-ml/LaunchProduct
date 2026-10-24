import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import { config } from './shared/config';
import { logger, requestLogger } from './shared/logger';
import { connectDB, isDBConnected } from './shared/db';
import { redis, isRedisConnected } from './shared/redis';
import { errorHandler } from './middleware/error.middleware';
import apiRouter from './routes';
import badgeRoutes from './routes/badge.routes';
import ogRoutes from './routes/og.routes';
import healthRoutes from './routes/health.routes';
import { healthController } from './controllers/health.controller';
import { metricsMiddleware } from './middleware/metrics.middleware';
import { setupBullBoard, startAllWorkers, stopAllWorkers } from './workers';
import { PaymentWebhookEvent, Payment, Product } from './models';
import {
  isBullBoardEnabled,
  bullBoardRateLimiter,
  bullBoardAuthMiddleware,
  metricsAuthMiddleware,
} from './middleware/ops-auth.middleware';

export async function assertCriticalProductionIndexes(): Promise<void> {
  const assertions = [
    {
      model: PaymentWebhookEvent,
      name: 'PaymentWebhookEvent.providerEventId (unique)',
      check: (indexes: any[]) =>
        indexes.some((idx) => idx.key?.providerEventId === 1 && idx.unique === true),
    },
    {
      model: Payment,
      name: 'Payment.providerPaymentId (unique)',
      check: (indexes: any[]) =>
        indexes.some((idx) => idx.key?.providerPaymentId === 1 && idx.unique === true),
    },
    {
      model: Payment,
      name: 'Payment.providerEventId (unique)',
      check: (indexes: any[]) =>
        indexes.some((idx) => idx.key?.providerEventId === 1 && idx.unique === true),
    },
    {
      model: Product,
      name: 'Product.slug (unique)',
      check: (indexes: any[]) =>
        indexes.some((idx) => idx.key?.slug === 1 && idx.unique === true),
    },
  ];

  for (const assertion of assertions) {
    const indexes = await assertion.model.collection.indexes();
    if (!assertion.check(indexes)) {
      logger.fatal(
        `Critical index check failed: missing required unique index ${assertion.name}. Run 'npm run sync-indexes:prod' before starting server.`
      );
      process.exit(1);
    }
  }
  logger.info('Verified all critical production unique indexes are present');
}

export function createApp(): Express {
  // 1. Create an Express app instance
  const app = express();

  // Trust proxy when behind reverse proxy (Render, Cloudflare, etc.)
  app.set('trust proxy', 1);

  // 2. Apply global middleware in this exact order:
  // a. helmet() — Security headers
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));

  // b. cors() — Allow frontend origin (NEXT_PUBLIC_API_URL / FRONTEND_URL) with credentials: false
  const frontendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.FRONTEND_URL || config.FRONTEND_URL || 'http://localhost:3000';
  const corsOrigins = [
    frontendUrl,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://launchproduct.com',
    'https://app.launchproduct.com',
    ...(process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim()) : []),
  ];
  app.use(cors({
    origin: corsOrigins,
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'Accept', 'X-Requested-With', 'x-request-id', 'x-metrics-token'],
  }));

  // c. express.json({ limit: '2mb' }) — JSON body parser with rawBody retention for webhooks
  app.use(
    express.json({
      limit: '2mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  // d. express.urlencoded({ extended: true }) — URL-encoded body parser
  app.use(express.urlencoded({ extended: true }));

  // e. requestLogger — Pino HTTP request logging
  app.use(requestLogger);

  // f. metricsMiddleware — Prometheus HTTP metrics tracking
  app.use(metricsMiddleware);

  // g. mongo-sanitize — Prevent NoSQL injection
  app.use(mongoSanitize());

  // 3. Mount health check routes at /api/health (liveness and readiness probes)
  app.use('/api/health', healthRoutes);

  // 4. Mount Prometheus metrics scrape endpoint at /api/metrics (constant-time token authorization)
  app.get('/api/metrics', metricsAuthMiddleware, (req: Request, res: Response) => {
    healthController.getMetrics(req, res);
  });

  // 5. Mount BullMQ Board UI at /admin/queues (only when enabled via secure credentials)
  if (isBullBoardEnabled()) {
    try {
      app.use(
        '/admin/queues',
        bullBoardRateLimiter,
        bullBoardAuthMiddleware,
        setupBullBoard('/admin/queues')
      );
      logger.info('Bull Board queue dashboard is ENABLED at /admin/queues (HTTP Basic auth protected)');
    } catch (boardErr: any) {
      logger.warn({ err: boardErr.message }, 'Failed to initialize BullMQ board UI');
    }
  } else {
    logger.info('Bull Board queue dashboard is DISABLED (BULL_BOARD_USER / BULL_BOARD_PASSWORD not configured or password under 24 chars)');
  }

  // 5. Mount unversioned embed routes for SVG Badges and OpenGraph cards
  app.use('/api/badge', badgeRoutes);
  app.use('/api/og', ogRoutes);

  // 6. Mount all API routes at /api/v1 (import from routes/index.ts)
  app.use('/api/v1', apiRouter);

  // 404 Catch-All Handler for unmatched routes
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found on LaunchProduct API`,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // 7. Apply the global error handler middleware last (import from middleware/error.middleware.ts)
  app.use(errorHandler);

  return app;
}

// 8. Export a startServer() async function
export async function startServer(): Promise<void> {
  try {
    // a. Calls connectDB()
    await connectDB();

    // In production, assert that critical unique indexes exist before accepting traffic
    if (process.env.NODE_ENV === 'production') {
      await assertCriticalProductionIndexes();
    }

    // b. Connects Redis (with fallback in local dev if Redis daemon is offline)
    redis.connect().catch((redisErr) => {
      logger.warn({ err: (redisErr as Error).message }, 'Redis initial connection delayed (will retry via backoff)');
    });

    // c. Starts all BullMQ background workers
    startAllWorkers().catch((workerErr) => {
      logger.warn({ err: (workerErr as Error).message }, 'Failed to start BullMQ workers');
    });

    // d. Graceful shutdown handler for BullMQ workers and connections
    const gracefulShutdown = async (signal: string) => {
      logger.info({ signal }, 'Received shutdown signal, terminating workers...');
      try {
        await stopAllWorkers();
      } catch (err: any) {
        logger.error({ err: err.message }, 'Error during graceful shutdown');
      }
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // e. Starts the Express HTTP server on process.env.PORT (default 4000)
    const port = Number(process.env.PORT) || Number(config.PORT) || 4000;
    const app = createApp();

    app.listen(port, () => {
      // f. Logs "LaunchProduct API server running on port 4000"
      logger.info(`LaunchProduct API server running on port ${port}`);
    });
  } catch (error) {
    logger.fatal({ error }, 'Fatal error during server bootstrap');
    process.exit(1);
  }
}

// 9. Call startServer() at the bottom of server.ts when not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default createApp;
