import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { buildCorsOptions } from './config/clientOrigins.js';
import { buildOpenApiSpec } from './config/swagger.js';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFoundHandler } from './middlewares/notFoundHandler.js';
import { apiV1Router } from './routes/index.js';

/**
 * @description Creates the configured Express application (no listen).
 * @returns {Express} Express app instance.
 */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');

  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production',
    }),
  );

  app.use(cors(buildCorsOptions()));

  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  const openApiSpec = buildOpenApiSpec();
  app.get('/api-docs.json', (_req, res) => {
    res.json(openApiSpec);
  });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'Iturrieta API',
      docs: '/api-docs',
      health: '/api/v1/health',
    });
  });

  app.use('/api/v1', apiV1Router);

  app.use('/api', notFoundHandler);

  app.use(errorHandler);

  return app;
}
