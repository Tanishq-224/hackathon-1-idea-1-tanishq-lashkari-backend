import type { NextFunction, Request, Response } from 'express';

import { getCurrentUser } from '../services/auth.service.js';
import { AppError } from '../utils/AppError.js';
import { getAccessCookieName } from '../utils/cookies.js';
import { verifyAccessToken } from '../utils/jwt.js';

export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: string;
    email: string;
  };
};

/**
 * @description Requires a valid access token cookie.
 * @param {AuthenticatedRequest} req - Express request.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Next handler.
 * @returns {void}
 */
export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.[getAccessCookieName()] as string | undefined;
    if (!token) {
      throw new AppError('Authentication required', 401);
    }
    const payload = verifyAccessToken(token);
    const user = await getCurrentUser(payload.sub);
    if (!user) {
      throw new AppError('Authentication required', 401);
    }
    req.user = { id: user.id, role: user.role, email: user.email };
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError('Authentication required', 401));
  }
}

/**
 * @description Optional authentication — attaches user when cookie valid.
 * @param {AuthenticatedRequest} req - Express request.
 * @param {Response} _res - Express response.
 * @param {NextFunction} next - Next handler.
 * @returns {void}
 */
export async function optionalAuthenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.[getAccessCookieName()] as string | undefined;
  if (!token) {
    next();
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
  } catch {
    // ignore invalid token for optional auth
  }
  next();
}
