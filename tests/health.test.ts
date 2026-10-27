import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';

type HealthBody = {
  success: boolean;
  status: string;
  environment: string;
  timestamp: string;
  database: string;
};

describe('GET /api/v1/health', () => {
  it('returns 200 with service metadata', async () => {
    const app = createApp();
    const response = await request(app).get('/api/v1/health');
    const body = response.body as HealthBody;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      status: 'ok',
      environment: 'test',
    });
    expect(typeof body.timestamp).toBe('string');
    expect(body.database).toBe('disconnected');
  });
});
