/**
 * LaunchProduct Standardized Error Hierarchy (RFC 7807 Problem Details compliant)
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: unknown[];
  public readonly target?: 'body' | 'query' | 'params' | 'header';
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details: unknown[] = [],
    isOperational: boolean = true,
    target?: 'body' | 'query' | 'params' | 'header'
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    this.target = target;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed for request parameters',
    details: unknown[] = [],
    target: 'body' | 'query' | 'params' | 'header' = 'body'
  ) {
    super(400, 'VALIDATION_FAILED', message, details, true, target);
  }
}

export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication required or invalid session token',
    code: string = 'UNAUTHORIZED'
  ) {
    super(401, code, message);
  }
}

export class AuthorizationError extends AppError {
  constructor(
    message: string = 'Insufficient permissions for this resource',
    code: string = 'FORBIDDEN'
  ) {
    super(403, code, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Requested resource was not found') {
    super(404, 'RESOURCE_NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(
    message: string = 'Resource already exists or state conflict detected',
    code: string = 'DUPLICATE_RESOURCE'
  ) {
    super(409, code, message);
  }
}

export class UnprocessableError extends AppError {
  constructor(
    message: string = 'Payload cannot be processed due to semantic violations',
    arg2?: string | unknown[],
    arg3?: string | unknown[]
  ) {
    let code = 'UNPROCESSABLE_ENTITY';
    let details: unknown[] = [];

    if (typeof arg2 === 'string') {
      code = arg2;
      if (Array.isArray(arg3)) {
        details = arg3;
      }
    } else if (Array.isArray(arg2)) {
      details = arg2;
      if (typeof arg3 === 'string') {
        code = arg3;
      }
    }

    super(422, code, message, details);
  }
}


export class RateLimitError extends AppError {
  constructor(
    arg1?: number | string,
    arg2?: string,
    arg3?: string
  ) {
    let statusCode = 429;
    let code = 'RATE_LIMIT_EXCEEDED';
    let message = 'Too many requests. Please retry after the cooldown period';

    if (typeof arg1 === 'number') {
      statusCode = arg1;
      code = arg2 || 'RATE_LIMIT_EXCEEDED';
      message = arg3 || 'Too many requests. Please retry after the cooldown period';
    } else if (typeof arg1 === 'string') {
      message = arg1;
      code = arg2 || 'RATE_LIMIT_EXCEEDED';
    }

    super(statusCode, code, message);
  }
}

export class InternalError extends AppError {
  constructor(message: string = 'An unexpected internal error occurred on our servers') {
    super(500, 'INTERNAL_SERVER_ERROR', message, [], false);
  }
}
