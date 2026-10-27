import cors from 'cors';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { buildCorsOptions, clientOrigins } from '../src/config/clientOrigins.js';

/**
 * @description Minimal app with production-like CORS for preflight checks.
 * @returns {express.Express} Test app.
 */
function buildCorsApp() {
  const app = express();
  app.use(cors(buildCorsOptions()));
  app.options('/api/v1/health', cors(buildCorsOptions()));
  app.get('/api/v1/health', (_req, res) => {
    res.json({ success: true });
  });
  return app;
}

describe('CORS', () => {
  it('reflects allowed Origin on GET and OPTIONS preflight', async () => {
    const app = buildCorsApp();
    const origin = clientOrigins[0];
    if (!origin) {
      throw new Error('CLIENT_URL must define at least one origin for CORS tests');
    }

    const preflight = await request(app)
      .options('/api/v1/health')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'GET');

    expect(preflight.status).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe(origin);
    expect(preflight.headers['access-control-allow-credentials']).toBe('true');

    const getResponse = await request(app).get('/api/v1/health').set('Origin', origin);
    expect(getResponse.status).toBe(200);
    expect(getResponse.headers['access-control-allow-origin']).toBe(origin);
  });
});
