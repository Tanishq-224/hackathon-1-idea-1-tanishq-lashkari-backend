import type { CorsOptions } from 'cors';

import { env } from './env.js';

/**
 * @description Normalizes a browser origin (scheme + host, no path).
 * @param {string} raw - Full URL or origin string.
 * @returns {string} Canonical origin.
 * @throws {Error} When the value is not a valid http(s) URL.
 */
export function normalizeOrigin(raw: string): string {
  const trimmed = raw.trim();
  const url = new URL(trimmed);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Unsupported protocol in CLIENT_URL entry: ${trimmed}`);
  }
  return `${url.protocol}//${url.host}`;
}

/**
 * @description Parses comma-separated CLIENT_URL into unique allowed origins.
 * @param {string} clientUrlEnv - Raw CLIENT_URL environment value.
 * @returns {string[]} Deduped origin list.
 * @throws {Error} When no valid origins are present.
 */
export function parseClientOrigins(clientUrlEnv: string): string[] {
  const parts = clientUrlEnv
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    throw new Error('CLIENT_URL must include at least one origin URL');
  }

  const origins = parts.map((part) => normalizeOrigin(part));
  return [...new Set(origins)];
}

/** @description Allowed browser origins from validated environment. */
export const clientOrigins = parseClientOrigins(env.CLIENT_URL);

/**
 * @description Whether auth cookies must be sent cross-site (frontend host ≠ API host).
 * @returns {boolean} True when production uses cross-origin credentialed requests.
 */
export function requiresCrossSiteAuthCookies(): boolean {
  if (env.NODE_ENV !== 'production') {
    return false;
  }

  const apiOrigin = env.API_BASE_URL ? normalizeOrigin(env.API_BASE_URL) : null;
  if (!apiOrigin) {
    return clientOrigins.some((origin) => {
      try {
        return !origin.includes('localhost');
      } catch {
        return true;
      }
    });
  }

  return clientOrigins.some((origin) => origin !== apiOrigin);
}

/**
 * @description Validates request Origin against configured CLIENT_URL list.
 * @param {string | undefined} origin - Request Origin header.
 * @param {(err: Error | null, allow?: boolean | string) => void} callback - CORS callback.
 * @returns {void}
 */
export function corsOriginDelegate(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean | string) => void,
): void {
  if (!origin) {
    callback(null, true);
    return;
  }

  let normalized: string;
  try {
    normalized = normalizeOrigin(origin);
  } catch {
    callback(new Error('CORS: invalid Origin header'));
    return;
  }

  if (clientOrigins.includes(normalized)) {
    callback(null, normalized);
    return;
  }

  callback(new Error(`CORS: origin not allowed: ${normalized}`));
}

/**
 * @description Shared Express CORS options (credentials + preflight).
 * @returns {CorsOptions} CORS middleware configuration.
 */
export function buildCorsOptions(): CorsOptions {
  return {
    origin: corsOriginDelegate,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  };
}
