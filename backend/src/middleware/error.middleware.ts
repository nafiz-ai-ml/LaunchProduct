import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors';
import { logger } from '../shared/logger';
import { config } from '../shared/config';

interface MongoError extends Error {
  code?: number;
  keyPattern?: Record<string, number>;
  keyValue?: Record<string, unknown>;
}

interface CastError extends Error {
  name: string;
  kind?: string;
  value?: unknown;
  path?: string;
}

/**
 * Centralized 4-argument Express Error Handler
 * Specification: API Specification.md section 1.4.6
 */
export function errorHandler(
  err: Error | AppError | ZodError | MongoError | CastError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const requestId =
    (req.headers['x-request-id'] as string) ||
    (req as unknown as { id?: string }).id ||
    `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const timestamp = new Date().toISOString();

  // 1. Handle Known Operational Application Errors (AppError hierarchy)
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error(
        { requestId, err, path: req.originalUrl, method: req.method },
        'Non-operational AppError occurred'
      );
    }

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details && err.details.length > 0 ? err.details : undefined,
        target: err.target,
        timestamp,
        documentationUrl: `https://docs.launchproduct.io/errors/${err.code}`,
      },
      meta: {
        requestId,
        timestamp,
      },
    });
    return;
  }

  // 2. Handle Zod Schema Validation Failures
  if (err instanceof ZodError) {
    const details = err.errors.map((issue) => ({
      field: issue.path.join('.'),
      code: issue.code.toUpperCase(),
      message: issue.message,
    }));

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Request payload failed schema validation.',
        details,
        target: 'body',
        timestamp,
        documentationUrl: 'https://docs.launchproduct.io/errors/VALIDATION_FAILED',
      },
      meta: {
        requestId,
        timestamp,
      },
    });
    return;
  }

  // 3. Handle MongoDB Duplicate Key (E11000)
  const mongoErr = err as MongoError;
  if (mongoErr.code === 11000) {
    const field =
      Object.keys(mongoErr.keyPattern || mongoErr.keyValue || {})[0] || 'resource';

    res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_RESOURCE',
        message: `A resource with the specified ${field} already exists.`,
        target: 'body',
        timestamp,
        documentationUrl: 'https://docs.launchproduct.io/errors/DUPLICATE_RESOURCE',
      },
      meta: {
        requestId,
        timestamp,
      },
    });
    return;
  }

  // 4. Handle Mongoose CastError (invalid ObjectId or types)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_IDENTIFIER',
        message: 'The provided resource ID is invalid.',
        target: 'params',
        timestamp,
        documentationUrl: 'https://docs.launchproduct.io/errors/INVALID_IDENTIFIER',
      },
      meta: {
        requestId,
        timestamp,
      },
    });
    return;
  }

  // 5. Handle All Other Errors (500 Internal Server Error)
  logger.error(
    {
      requestId,
      err: err.message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
    },
    'Unhandled Exception occurred'
  );

  const isProduction =
    process.env.NODE_ENV === 'production' || config.NODE_ENV === 'production';

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isProduction
        ? 'An unexpected server error occurred. Please try again later.'
        : err.message,
      ...(isProduction ? {} : { stack: err.stack }),
      timestamp,
      documentationUrl: 'https://docs.launchproduct.io/errors/INTERNAL_SERVER_ERROR',
    },
    meta: {
      requestId,
      timestamp,
    },
  });
}

export default errorHandler;
