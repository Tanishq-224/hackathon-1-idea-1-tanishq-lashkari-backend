import type { RequestHandler } from 'express';

import { getDatabaseStatus } from '../../config/database.js';
import { env } from '../../config/env.js';

/**
 * @description Returns API and database connectivity status.
 * @type {RequestHandler}
 */
export const getHealth: RequestHandler = (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    database: getDatabaseStatus(),
  });
};
