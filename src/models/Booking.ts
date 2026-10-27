import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

const bookingSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    date: { type: String, required: true, index: true },
    time: { type: String, required: true },
    slot: { type: String, enum: ['lunch', 'dinner'], required: true },
    guests: { type: Number, required: true, min: 1 },
    busGuests: { type: Number, default: 0 },
    areaId: { type: String, required: true, index: true },
    tableId: { type: String, required: true, index: true },
    tableName: { type: String, default: '' },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    notes: { type: String, default: '' },
    status: { type: String, enum: BOOKING_STATUSES, default: 'pending', index: true },
  },
  { timestamps: true },
);

bookingSchema.index(
  { tableId: 1, date: 1, time: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } },
  },
);

export type BookingDocument = InferSchemaType<typeof bookingSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

/** @description Reservation record. */
export const Booking = mongoose.model('Booking', bookingSchema);
