import { Router } from 'express';

import { notFoundHandler } from '../middlewares/notFoundHandler.js';
import { healthRouter } from '../modules/health/health.routes.js';

/** @description Versioned API router mounted at `/api/v1`. */
export const apiV1Router = Router();

apiV1Router.use('/health', healthRouter);
apiV1Router.use(notFoundHandler);
