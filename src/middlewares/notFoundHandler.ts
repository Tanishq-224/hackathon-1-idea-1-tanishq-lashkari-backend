import type { RequestHandler } from 'express';

import { AppError } from '../utils/AppError.js';

/**
 * @description Sends a 404 for unmatched API routes.
 * @type {RequestHandler}
 */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};
