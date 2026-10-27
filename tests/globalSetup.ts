import { MongoMemoryServer } from 'mongodb-memory-server';

/** @description Holds in-memory MongoDB for Vitest runs. */
let mongod: MongoMemoryServer | undefined;

/**
 * @description Starts MongoDB memory server and sets MONGODB_URI.
 * @returns {Promise<void>}
 */
export async function setup(): Promise<void> {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
}

/**
 * @description Stops MongoDB memory server.
 * @returns {Promise<void>}
 */
export async function teardown(): Promise<void> {
  if (mongod) {
    await mongod.stop();
  }
}

export default setup;
