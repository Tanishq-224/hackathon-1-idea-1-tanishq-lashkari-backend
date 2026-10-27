import mongoose from 'mongoose';

import { Booking, type BookingDocument, type BookingStatus } from '../models/Booking.js';
import { VenueConfig } from '../models/VenueConfig.js';
import { sendBookingEmail } from './email.service.js';
import { AppError } from '../utils/AppError.js';
import { generateBookingReference } from '../utils/otp.js';

const ACTIVE_TABLE_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'cancellation_requested'];

/**
 * @description Queues a booking email without failing the API request.
 * @param {Parameters<typeof sendBookingEmail>[0]} input - Email payload.
 * @returns {void}
 */
function queueBookingEmail(input: Parameters<typeof sendBookingEmail>[0]): void {
  void sendBookingEmail(input).catch((error: unknown) => {
    console.error('[email] Booking email failed', error);
  });
}

export type BookingDto = {
  reference: string;
  date: string;
  time: string;
  slot: 'lunch' | 'dinner';
  guests: number;
  busGuests: number;
  areaId: string;
  tableId: string;
  tableName: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  status: BookingStatus;
  createdAt: string;
};

/**
 * @description Maps booking document to API DTO (staff views may include PII by role).
 * @param {BookingDocument} doc - Booking document.
 * @param {boolean} includeContact - Whether to include contact fields.
 * @returns {Partial<BookingDto>} Serialized booking.
 */
function toDto(doc: BookingDocument, includeContact: boolean): BookingDto {
  return {
    reference: doc.reference,
    date: doc.date,
    time: doc.time,
    slot: doc.slot as 'lunch' | 'dinner',
    guests: doc.guests,
    busGuests: doc.busGuests ?? 0,
    areaId: doc.areaId,
    tableId: doc.tableId,
    tableName: doc.tableName ?? doc.tableId,
    name: includeContact ? doc.name : '',
    email: includeContact ? doc.email : '',
    phone: includeContact ? doc.phone : '',
    notes: includeContact ? doc.notes : '',
    status: doc.status as BookingStatus,
    createdAt: doc.createdAt.toISOString(),
  };
}

/**
 * @description Loads default venue configuration.
 * @returns {Promise<NonNullable<Awaited<ReturnType<typeof VenueConfig.findOne>>>>} Venue config.
 */
async function getVenueConfig() {
  const config = await VenueConfig.findOne({ key: 'default' });
  if (!config) {
    throw new AppError('Venue is not configured', 503);
  }
  return config;
}

/**
 * @description Returns dining areas for public booking UI.
 * @returns {Promise<unknown[]>} Areas list.
 */
export async function listAreas() {
  const config = await getVenueConfig();
  return config.areas.filter((area) => area.active);
}

/**
 * @description Computes table availability for a slot.
 * @param {object} query - Availability query.
 * @returns {Promise<Array<Record<string, unknown>>>} Tables with status.
 */
export async function getAvailability(query: {
  areaId: string;
  date: string;
  time: string;
  guests: number;
}): Promise<Array<Record<string, unknown>>> {
  const config = await getVenueConfig();
  if (config.closedDays.some((day) => day.date === query.date)) {
    return [];
  }
  const tables = config.tables.filter(
    (table) => table.areaId === query.areaId && table.active,
  );
  const activeBookings = await Booking.find({
    date: query.date,
    time: query.time,
    status: { $in: ACTIVE_TABLE_STATUSES },
    areaId: query.areaId,
  }).select('tableId');

  const booked = new Set(activeBookings.map((item) => item.tableId));

  return tables.map((table) => {
    let status: 'available' | 'booked' | 'unavailable' = 'available';
    if (query.guests > table.capacity) {
      status = 'unavailable';
    } else if (booked.has(table.id)) {
      status = 'booked';
    }
    return {
      id: table.id,
      areaId: table.areaId,
      capacity: table.capacity,
      label: table.label,
      status,
    };
  });
}

/**
 * @description Creates a reservation with conflict protection.
 * @param {object} input - Booking payload.
 * @param {string | null} userId - Optional authenticated customer id.
 * @returns {Promise<BookingDto>} Created booking.
 */
export async function createBooking(
  input: {
    date: string;
    time: string;
    slot: 'lunch' | 'dinner';
    guests: number;
    busGuests?: number;
    areaId: string;
    tableId: string;
    name: string;
    email: string;
    phone: string;
    notes?: string;
  },
  userId: string | null,
): Promise<BookingDto> {
  const config = await getVenueConfig();
  const table = config.tables.find((item) => item.id === input.tableId && item.active);
  if (!table || table.areaId !== input.areaId) {
    throw new AppError('Invalid table selection', 400);
  }
  if (input.guests > table.capacity) {
    throw new AppError('Party size exceeds table capacity', 422);
  }
  if (config.closedDays.some((day) => day.date === input.date)) {
    throw new AppError('Venue is closed on this date', 409);
  }

  const reference = generateBookingReference();
  try {
    const created = await Booking.create({
      reference,
      userId,
      date: input.date,
      time: input.time,
      slot: input.slot,
      guests: input.guests,
      busGuests: input.busGuests ?? 0,
      areaId: input.areaId,
      tableId: input.tableId,
      tableName: table.label ?? table.id,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      notes: input.notes?.trim() ?? '',
      status: 'pending',
    });
    const dto = toDto(created, true);
    queueBookingEmail({
      to: dto.email,
      kind: 'reservation_received',
      guestName: dto.name,
      reference: dto.reference,
      date: dto.date,
      time: dto.time,
      guests: dto.guests,
      tableName: dto.tableName,
    });
    return dto;
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      throw new AppError('This table was just reserved. Choose another table.', 409);
    }
    throw error;
  }
}

/**
 * @description Public lookup by reference + email verification.
 * @param {string} reference - Booking reference.
 * @param {string} email - Guest email.
 * @returns {Promise<BookingDto>} Booking without over-sharing.
 */
export async function lookupBooking(reference: string, email: string): Promise<BookingDto> {
  const booking = await Booking.findOne({
    reference: reference.trim().toUpperCase(),
    email: email.trim().toLowerCase(),
  });
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }
  return toDto(booking, true);
}

/**
 * @description Cancels booking for verified guest.
 * @param {string} reference - Booking reference.
 * @param {string} email - Guest email.
 * @returns {Promise<BookingDto>} Updated booking.
 */
export async function cancelBookingByGuest(reference: string, email: string): Promise<BookingDto> {
  const booking = await Booking.findOne({
    reference: reference.trim().toUpperCase(),
    email: email.trim().toLowerCase(),
  });
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }
  if (booking.status === 'cancelled') {
    return toDto(booking, true);
  }
  if (booking.status === 'cancellation_requested') {
    return toDto(booking, true);
  }
  booking.status = 'cancellation_requested';
  await booking.save();
  const dto = toDto(booking, true);
  queueBookingEmail({
    to: dto.email,
    kind: 'cancellation_requested',
    guestName: dto.name,
    reference: dto.reference,
    date: dto.date,
    time: dto.time,
    guests: dto.guests,
    tableName: dto.tableName,
  });
  return dto;
}

/**
 * @description Lists bookings for staff/admin with optional status filter.
 * @param {BookingStatus | undefined} status - Optional filter.
 * @returns {Promise<BookingDto[]>} Bookings newest first.
 */
export async function listBookingsForStaff(status?: BookingStatus): Promise<BookingDto[]> {
  const filter = status ? { status } : {};
  const rows = await Booking.find(filter).sort({ createdAt: -1 }).limit(200);
  return rows.map((row) => toDto(row, true));
}

/**
 * @description Updates booking status from staff dashboard.
 * @param {string} reference - Booking reference.
 * @param {BookingStatus} status - New status.
 * @returns {Promise<BookingDto>} Updated booking.
 */
export async function updateBookingStatusStaff(
  reference: string,
  status: BookingStatus,
): Promise<BookingDto> {
  const booking = await Booking.findOne({ reference: reference.trim().toUpperCase() });
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }
  const previousStatus = booking.status as BookingStatus;
  booking.status = status;
  await booking.save();
  const dto = toDto(booking, true);
  if (status === 'confirmed' && previousStatus !== 'confirmed') {
    queueBookingEmail({
      to: dto.email,
      kind: 'reservation_confirmed',
      guestName: dto.name,
      reference: dto.reference,
      date: dto.date,
      time: dto.time,
      guests: dto.guests,
      tableName: dto.tableName,
    });
  }
  if (status === 'cancelled' && previousStatus !== 'cancelled') {
    queueBookingEmail({
      to: dto.email,
      kind: 'cancellation_confirmed',
      guestName: dto.name,
      reference: dto.reference,
      date: dto.date,
      time: dto.time,
      guests: dto.guests,
      tableName: dto.tableName,
    });
  }
  return dto;
}

/**
 * @description Returns dashboard stats from persistent bookings.
 * @returns {Promise<Record<string, number>>} Counts by status.
 */
export async function getBookingStats(): Promise<Record<string, number>> {
  const [pending, confirmed, cancellationRequested, cancelled, total] = await Promise.all([
    Booking.countDocuments({ status: 'pending' }),
    Booking.countDocuments({ status: 'confirmed' }),
    Booking.countDocuments({ status: 'cancellation_requested' }),
    Booking.countDocuments({ status: 'cancelled' }),
    Booking.countDocuments({}),
  ]);
  return { pending, confirmed, cancellationRequested, cancelled, total };
}

/**
 * @description Returns operational shifts and closed days for staff UI.
 * @returns {Promise<{ shifts: unknown[]; closedDays: unknown[] }>} Operational config.
 */
export async function getOperationalSettings(): Promise<{
  shifts: unknown[];
  closedDays: unknown[];
}> {
  const config = await getVenueConfig();
  return { shifts: config.shifts, closedDays: config.closedDays };
}
