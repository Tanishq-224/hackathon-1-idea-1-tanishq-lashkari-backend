import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const refreshSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true },
);

export type RefreshSessionDocument = InferSchemaType<typeof refreshSessionSchema> & {
  _id: mongoose.Types.ObjectId;
};

/** @description Rotating refresh token sessions. */
export const RefreshSession = mongoose.model('RefreshSession', refreshSessionSchema);
