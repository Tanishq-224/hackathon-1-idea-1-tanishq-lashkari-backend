import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '../config/env.js';

export type AccessTokenPayload = {
  sub: string;
  role: string;
  email: string;
};

/**
 * @description Signs a short-lived access token.
 * @param {AccessTokenPayload} payload - Token claims.
 * @returns {string} JWT access token.
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN,
  } as SignOptions);
}

/**
 * @description Verifies an access token.
 * @param {string} token - JWT string.
 * @returns {AccessTokenPayload} Parsed payload.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

/**
 * @description Signs a refresh token JWT (stored hashed server-side).
 * @param {string} userId - User identifier.
 * @returns {string} Refresh JWT.
 */
export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
  } as SignOptions);
}

/**
 * @description Verifies refresh token structure.
 * @param {string} token - Refresh JWT.
 * @returns {{ sub: string }} Payload with user id.
 */
export function verifyRefreshToken(token: string): { sub: string } {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; type?: string };
  if (payload.type !== 'refresh') {
    throw new Error('Invalid refresh token type');
  }
  return { sub: payload.sub };
}
