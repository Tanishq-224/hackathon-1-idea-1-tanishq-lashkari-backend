import swaggerJsdoc from 'swagger-jsdoc';

import { env } from './env.js';

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Iturrieta API',
    version: '0.0.1',
    description: 'Backend API for Iturrieta Sagardotegia — bookings, staff, and realtime features.',
  },
  servers: [
    {
      url: `http://localhost:${String(env.PORT)}/api/v1`,
      description: 'Local development',
    },
  ],
  tags: [{ name: 'Health', description: 'Service health and readiness' }],
};

/**
 * @description Builds the OpenAPI specification from JSDoc annotations.
 * @returns {object} OpenAPI document.
 */
export function buildOpenApiSpec(): object {
  return swaggerJsdoc({
    definition: swaggerDefinition,
    apis: ['./src/modules/**/*.ts', './src/routes/**/*.ts'],
  });
}
