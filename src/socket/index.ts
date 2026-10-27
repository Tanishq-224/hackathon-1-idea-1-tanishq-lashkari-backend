import type { Server as HttpServer } from 'node:http';

import { Server } from 'socket.io';

import { clientOrigins } from '../config/clientOrigins.js';
import { verifyAccessToken } from '../utils/jwt.js';

/** @description Socket.IO instance attached to HTTP server. */
let io: Server | null = null;

/**
 * @description Initializes Socket.IO with cookie-less token auth via handshake auth token.
 * @param {HttpServer} httpServer - Node HTTP server.
 * @returns {Server} Socket.IO server.
 */
export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: clientOrigins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error('Unauthorized'));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      if (!['staff', 'admin'].includes(payload.role)) {
        next(new Error('Forbidden'));
        return;
      }
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join('staff');
  });

  return io;
}

/**
 * @description Emits booking event to authorized staff room after DB success.
 * @param {string} event - Event name.
 * @param {Record<string, unknown>} payload - Minimal payload.
 * @returns {void}
 */
export function emitStaffBookingEvent(
  event: 'booking:created' | 'booking:updated' | 'booking:cancelled',
  payload: Record<string, unknown>,
): void {
  io?.to('staff').emit(event, payload);
}
