import { z } from 'zod';

export const availabilityQuerySchema = z.object({
  areaId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  guests: z.coerce.number().int().min(1).max(30),
});

export const createBookingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  slot: z.enum(['lunch', 'dinner']),
  guests: z.number().int().min(1).max(30),
  busGuests: z.number().int().min(0).max(120).optional(),
  areaId: z.string().min(1),
  tableId: z.string().min(1),
  name: z.string().trim().min(2),
  email: z.string().email(),
  phone: z.string().trim().min(6),
  notes: z.string().max(500).optional(),
});

export const lookupBookingSchema = z.object({
  reference: z.string().min(3),
  email: z.string().email(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled']),
});
