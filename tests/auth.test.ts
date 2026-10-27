import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { authRouter } from '../src/modules/auth/auth.routes.js';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import { runSeed } from '../src/seed/runSeed.js';
import { getLastMockOtpForTests, mockEmailOutbox } from '../src/services/email.service.js';

/**
 * @description Builds a minimal auth app for integration tests.
 * @returns {express.Express} Test app.
 */
function buildAuthApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/auth', authRouter);
  app.use(errorHandler);
  return app;
}

describe('Auth API', () => {
  beforeAll(async () => {
    await connectDatabase();
    await runSeed();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('signs up and verifies email with OTP mock', async () => {
    mockEmailOutbox.length = 0;
    const app = buildAuthApp();
    const email = 'guest@example.com';

    await request(app).post('/auth/signup').send({
      name: 'Guest User',
      email,
      password: 'Password1',
    }).expect(200);

    const code = getLastMockOtpForTests();
    expect(code).toMatch(/^\d{6}$/);

    const verify = await request(app).post('/auth/verify-email').send({ email, code });
    expect(verify.status).toBe(200);
    expect(verify.body.success).toBe(true);
    expect(verify.body.data.user.email).toBe(email);
  });

  it('returns 200 with null user when session cookies are absent', async () => {
    const app = buildAuthApp();
    const response = await request(app).get('/auth/me');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toBeNull();
  });
});
