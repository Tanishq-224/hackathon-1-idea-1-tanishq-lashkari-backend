import 'dotenv/config';

import type { Server } from 'node:http';

import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';

/** @description HTTP server instance for graceful shutdown. */
let httpServer: Server | null = null;

/** @description Whether shutdown hooks are already registered. */
let shutdownHooksRegistered = false;

/**
 * @description Closes the HTTP server and MongoDB connection.
 * @param {string} signal - Signal or reason name for logging.
 * @returns {Promise<void>}
 */
async function shutdown(signal: string): Promise<void> {
  console.info(`[server] Received ${signal}, shutting down gracefully…`);

  const closeServer = new Promise<void>((resolve, reject) => {
    if (!httpServer) {
      resolve();
      return;
    }
    httpServer.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });

  try {
    await closeServer;
    await disconnectDatabase();
    console.info('[server] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[server] Error during shutdown', error);
    process.exit(1);
  }
}

/**
 * @description Registers process signal handlers once.
 * @returns {void}
 */
function registerShutdownHooks(): void {
  if (shutdownHooksRegistered) {
    return;
  }
  shutdownHooksRegistered = true;
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

/**
 * @description Connects to MongoDB and starts the HTTP listener.
 * @returns {Promise<void>}
 */
async function start(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  httpServer = app.listen(env.PORT, () => {
    console.info(
      `[server] Listening on http://localhost:${String(env.PORT)} (${env.NODE_ENV})`,
    );
    console.info(`[server] Swagger UI: http://localhost:${String(env.PORT)}/api-docs`);
  });

  registerShutdownHooks();
}

start().catch((error: unknown) => {
  console.error('[server] Failed to start', error);
  process.exit(1);
});
