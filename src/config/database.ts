import mongoose from 'mongoose';

import { env } from './env.js';

/**
 * @description Opens the Mongoose connection to MongoDB.
 * @returns {Promise<void>}
 */
export async function connectDatabase(): Promise<void> {
  if (env.NODE_ENV === 'test') {
    return;
  }

  await mongoose.connect(env.MONGODB_URI);
}

/**
 * @description Closes the Mongoose connection gracefully.
 * @returns {Promise<void>}
 */
export async function disconnectDatabase(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- Mongoose readyState enum
  if (mongoose.connection.readyState === 0) {
    return;
  }
  await mongoose.disconnect();
}

/**
 * @description Returns a short label for the current MongoDB connection state.
 * @returns {'connected' | 'connecting' | 'disconnected' | 'disconnecting' | 'unknown'} Connection label.
 */
export function getDatabaseStatus():
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'disconnecting'
  | 'unknown' {
  /* eslint-disable @typescript-eslint/no-unsafe-enum-comparison -- Mongoose types readyState as enum */
  if (mongoose.connection.readyState === 0) return 'disconnected';
  if (mongoose.connection.readyState === 1) return 'connected';
  if (mongoose.connection.readyState === 2) return 'connecting';
  if (mongoose.connection.readyState === 3) return 'disconnecting';
  /* eslint-enable @typescript-eslint/no-unsafe-enum-comparison */
  return 'unknown';
}
