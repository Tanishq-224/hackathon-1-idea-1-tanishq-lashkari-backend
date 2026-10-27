import type { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from './authenticate.js';
import { AppError } from '../utils/AppError.js';

/**
 * @description Restricts route to one or more roles.
 * @param {string[]} roles - Allowed roles.
 * @returns {(req: AuthenticatedRequest, res: Response, next: NextFunction) => void} Middleware.
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new AppError('Forbidden', 403));
      return;
    }
    next();
  };
}
