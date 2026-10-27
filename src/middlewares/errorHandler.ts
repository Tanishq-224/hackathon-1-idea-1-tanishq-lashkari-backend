import type { ErrorRequestHandler } from 'express';

import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

type ErrorBody = {
  success: false;
  message: string;
  stack?: string;
};

/**
 * @description Centralized Express error handler (must be registered last).
 * @type {ErrorRequestHandler}
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express requires 4-arg error middleware
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message =
    err instanceof AppError
      ? err.message
      : env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err instanceof Error
          ? err.message
          : 'Internal server error';

  const body: ErrorBody = {
    success: false,
    message,
  };

  if (env.NODE_ENV !== 'production' && err instanceof Error && err.stack) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};
