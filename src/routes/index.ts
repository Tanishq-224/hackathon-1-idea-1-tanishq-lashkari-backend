import { Router } from 'express';

import { authRouter } from '../modules/auth/auth.routes.js';
import { bookingRouter } from '../modules/booking/booking.routes.js';
import { healthRouter } from '../modules/health/health.routes.js';
import { notFoundHandler } from '../middlewares/notFoundHandler.js';

/** @description Versioned API router mounted at `/api/v1`. */
export const apiV1Router = Router();

apiV1Router.use('/health', healthRouter);
apiV1Router.use('/auth', authRouter);
apiV1Router.use('/booking', bookingRouter);
apiV1Router.use(notFoundHandler);
