import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../shared/errors';

export type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Zod validation middleware factory.
 * Parses and validates req[target] against the provided Zod schema.
 * On ZodError, normalizes errors into { field, code, message } and calls next(ValidationError).
 * On success, replaces req[target] with the parsed, coerced output.
 */
export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const dataToValidate = req[target];
      const parsedData = await schema.parseAsync(dataToValidate);
      
      // Replace req[target] with validated and transformed data
      req[target] = parsedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((issue) => ({
          field: issue.path.join('.'),
          code: issue.code.toUpperCase(),
          message: issue.message,
        }));

        const validationError = new ValidationError(
          `Validation failed for request ${target}`,
          details,
          target
        );
        return next(validationError);
      }

      next(error);
    }
  };
}

export default validate;
