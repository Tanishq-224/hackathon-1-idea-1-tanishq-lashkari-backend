import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const diningAreaSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    imageSrc: { type: String, default: '' },
    imageAlt: { type: String, default: '' },
    tableCount: { type: Number, default: 0 },
    capacityRange: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { _id: false },
);

const diningTableSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    areaId: { type: String, required: true, index: true },
    capacity: { type: Number, required: true, min: 1 },
    label: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { _id: false },
);

const serviceShiftSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    service: { type: String, enum: ['lunch', 'dinner'], required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    lastBookingTime: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { _id: false },
);

const closedDaySchema = new Schema(
  {
    date: { type: String, required: true, unique: true },
    reason: { type: String, default: '' },
  },
  { _id: false },
);

const venueConfigSchema = new Schema(
  {
    key: { type: String, default: 'default', unique: true },
    areas: { type: [diningAreaSchema], default: [] },
    tables: { type: [diningTableSchema], default: [] },
    shifts: { type: [serviceShiftSchema], default: [] },
    closedDays: { type: [closedDaySchema], default: [] },
  },
  { timestamps: true },
);

export type VenueConfigDocument = InferSchemaType<typeof venueConfigSchema> & {
  _id: mongoose.Types.ObjectId;
};

/** @description Sample-configurable venue layout and operations. */
export const VenueConfig = mongoose.model('VenueConfig', venueConfigSchema);
