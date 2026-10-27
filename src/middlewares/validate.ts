import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

import '../types/express.js';
import { AppError } from '../utils/AppError.js';

/** @description Request with Zod-validated query attached by {@link validateQuery}. */
export type ValidatedQueryRequest<T> = Request & { validatedQuery: T };

/**
 * @description Validates request body with a Zod schema.
 * @param {ZodType} schema - Zod validator.
 * @returns {(req: Request, res: Response, next: NextFunction) => void} Middleware.
 */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError('Validation failed', 422));
      return;
    }
    req.body = parsed.data;
    next();
  };
}

/**
 * @description Validates request query with a Zod schema.
 * @param {ZodType} schema - Zod validator.
 * @returns {(req: Request, res: Response, next: NextFunction) => void} Middleware.
 */
export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      next(new AppError('Validation failed', 422));
      return;
    }
    req.validatedQuery = parsed.data;
    next();
  };
}
