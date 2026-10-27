import type { Response } from 'express';

/** @description Standard success envelope. */
export type ApiSuccess<T> = {
  success: true;
  data: T;
};

/** @description Standard error envelope. */
export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

/**
 * @description Sends a typed JSON success response.
 * @param {Response} res - Express response.
 * @param {number} status - HTTP status code.
 * @param {T} data - Payload.
 * @returns {Response} Express response.
 */
export function sendSuccess<T>(res: Response, status: number, data: T): Response {
  return res.status(status).json({ success: true, data } satisfies ApiSuccess<T>);
}

/**
 * @description Sends a typed JSON error response.
 * @param {Response} res - Express response.
 * @param {number} status - HTTP status code.
 * @param {string} code - Machine-readable error code.
 * @param {string} message - Safe user-facing message.
 * @param {unknown} [details] - Optional validation details.
 * @returns {Response} Express response.
 */
export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  const body: ApiFailure = {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
  return res.status(status).json(body);
}
