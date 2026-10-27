import { Router } from 'express';

import { getHealth } from './health.controller.js';

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Service health check
 *     description: Returns API uptime metadata and MongoDB connection state.
 *     responses:
 *       200:
 *         description: Service is reachable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                 environment:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 database:
 *                   type: string
 */
const healthRouter = Router();

healthRouter.get('/', getHealth);

export { healthRouter };
