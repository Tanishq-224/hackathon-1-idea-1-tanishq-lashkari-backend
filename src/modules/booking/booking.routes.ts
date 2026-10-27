import { Router } from 'express';

import {
  authenticate,
  optionalAuthenticate,
  type AuthenticatedRequest,
} from '../../middlewares/authenticate.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validateBody, validateQuery } from '../../middlewares/validate.js';
import {
  cancelBookingByGuest,
  createBooking,
  getAvailability,
  getBookingStats,
  getOperationalSettings,
  listAreas,
  listBookingsForStaff,
  lookupBooking,
  updateBookingStatusStaff,
} from '../../services/booking.service.js';
import { emitStaffBookingEvent } from '../../socket/index.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import {
  availabilityQuerySchema,
  createBookingSchema,
  lookupBookingSchema,
  updateStatusSchema,
} from './booking.schemas.js';
import type { z } from 'zod';

type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

/** @description Public and staff booking routes. */
export const bookingRouter = Router();

/**
 * @openapi
 * /booking/areas:
 *   get:
 *     tags: [Booking]
 *     summary: List dining areas
 */
bookingRouter.get('/areas', async (_req, res, next) => {
  try {
    const areas = await listAreas();
    sendSuccess(res, 200, areas);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /booking/availability:
 *   get:
 *     tags: [Booking]
 *     summary: Query table availability for date/time/guests
 */
bookingRouter.get('/availability', validateQuery(availabilityQuerySchema), async (req, res, next) => {
  try {
    const data = await getAvailability(req.validatedQuery as AvailabilityQuery);
    sendSuccess(res, 200, data);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /booking/reservations:
 *   post:
 *     tags: [Booking]
 *     summary: Create a reservation
 */
bookingRouter.post(
  '/reservations',
  optionalAuthenticate,
  validateBody(createBookingSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const booking = await createBooking(req.body, req.user?.id ?? null);
      emitStaffBookingEvent('booking:created', {
        reference: booking.reference,
        status: booking.status,
        date: booking.date,
        time: booking.time,
        tableId: booking.tableId,
      });
      sendSuccess(res, 201, booking);
    } catch (error) {
      next(error);
    }
  },
);

bookingRouter.post('/lookup', validateBody(lookupBookingSchema), async (req, res, next) => {
  try {
    const booking = await lookupBooking(req.body.reference, req.body.email);
    sendSuccess(res, 200, booking);
  } catch (error) {
    next(error);
  }
});

bookingRouter.post('/cancel', validateBody(lookupBookingSchema), async (req, res, next) => {
  try {
    const booking = await cancelBookingByGuest(req.body.reference, req.body.email);
    sendSuccess(res, 200, booking);
  } catch (error) {
    next(error);
  }
});

bookingRouter.get(
  '/staff/reservations',
  authenticate,
  requireRole('staff', 'admin'),
  async (req, res, next) => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const data = await listBookingsForStaff(
        status as 'pending' | 'confirmed' | 'cancellation_requested' | 'cancelled' | undefined,
      );
      sendSuccess(res, 200, data);
    } catch (error) {
      next(error);
    }
  },
);

bookingRouter.patch(
  '/staff/reservations/:reference/status',
  authenticate,
  requireRole('staff', 'admin'),
  validateBody(updateStatusSchema),
  async (req, res, next) => {
    try {
      const reference = String(req.params.reference);
      const booking = await updateBookingStatusStaff(reference, req.body.status);
      sendSuccess(res, 200, booking);
    } catch (error) {
      next(error);
    }
  },
);

bookingRouter.get(
  '/staff/stats',
  authenticate,
  requireRole('staff', 'admin'),
  async (_req, res, next) => {
    try {
      sendSuccess(res, 200, await getBookingStats());
    } catch (error) {
      next(error);
    }
  },
);

bookingRouter.get(
  '/staff/operations',
  authenticate,
  requireRole('staff', 'admin'),
  async (_req, res, next) => {
    try {
      sendSuccess(res, 200, await getOperationalSettings());
    } catch (error) {
      next(error);
    }
  },
);
