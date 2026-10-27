import { describe, expect, it } from 'vitest';

import {
  clientOrigins,
  corsOriginDelegate,
  isAllowedClientOrigin,
  isIturrietaVercelHost,
  normalizeOrigin,
  parseClientOrigins,
} from '../src/config/clientOrigins.js';

describe('clientOrigins', () => {
  it('parses comma-separated CLIENT_URL values', () => {
    const origins = parseClientOrigins(
      'https://iturrieta-sagardotegia.vercel.app,http://localhost:5173',
    );
    expect(origins).toEqual([
      'https://iturrieta-sagardotegia.vercel.app',
      'http://localhost:5173',
    ]);
  });

  it('allows origins listed in CLIENT_URL via CORS delegate', () => {
    const origin = clientOrigins[0];
    expect(origin).toBeTruthy();
    let allowed: boolean | string | undefined;
    corsOriginDelegate(origin, (_err, value) => {
      allowed = value;
    });
    expect(allowed).toBe(origin);
  });

  it('rejects unknown origins without server errors', () => {
    let allowed: boolean | string | undefined;
    corsOriginDelegate('https://evil.example', (_err, value) => {
      allowed = value;
    });
    expect(allowed).toBe(false);
  });

  it('allows Vercel preview hosts for the Iturrieta project', () => {
    expect(isIturrietaVercelHost('iturrieta-sagardotegia.vercel.app')).toBe(true);
    expect(isIturrietaVercelHost('iturrieta-sagardotegia-git-main.vercel.app')).toBe(true);
    expect(
      isAllowedClientOrigin('https://iturrieta-sagardotegia-git-main.vercel.app'),
    ).toBe(true);
  });

  it('normalizes URLs with trailing paths', () => {
    expect(normalizeOrigin('http://localhost:5173/')).toBe('http://localhost:5173');
  });
});
