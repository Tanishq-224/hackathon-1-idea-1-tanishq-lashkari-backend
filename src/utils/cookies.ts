import type { CookieOptions, Response } from 'express';

import { env } from '../config/env.js';

const ACCESS_COOKIE = 'iturrieta_access';
const REFRESH_COOKIE = 'iturrieta_refresh';

/**
 * @description Base cookie options for auth tokens.
 * @returns {CookieOptions} Cookie configuration.
 */
function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

/**
 * @description Sets access and refresh token cookies.
 * @param {Response} res - Express response.
 * @param {string} accessToken - Short-lived JWT.
 * @param {string} refreshToken - Refresh JWT.
 * @returns {void}
 */
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions(),
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

/**
 * @description Clears authentication cookies.
 * @param {Response} res - Express response.
 * @returns {void}
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, baseCookieOptions());
  res.clearCookie(REFRESH_COOKIE, baseCookieOptions());
}

/**
 * @description Reads access token cookie name for middleware.
 * @returns {string} Cookie key.
 */
export function getAccessCookieName(): string {
  return ACCESS_COOKIE;
}

/**
 * @description Reads refresh token cookie name.
 * @returns {string} Cookie key.
 */
export function getRefreshCookieName(): string {
  return REFRESH_COOKIE;
}
