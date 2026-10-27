import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';

describe('404 handling', () => {
  it('returns 404 for unknown API routes', async () => {
    const app = createApp();
    const response = await request(app).get('/api/v1/does-not-exist');

    const body = response.body as { success: false; message: string };

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.message).toContain('Route not found');
  });
});
