import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const OTP_PURPOSES = ['email_verification', 'password_reset'] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

const otpChallengeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    purpose: { type: String, enum: OTP_PURPOSES, required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0, required: true },
    consumedAt: { type: Date, default: null },
    lastSentAt: { type: Date, required: true },
  },
  { timestamps: true },
);

otpChallengeSchema.index({ userId: 1, purpose: 1, consumedAt: 1 });

export type OtpChallengeDocument = InferSchemaType<typeof otpChallengeSchema> & {
  _id: mongoose.Types.ObjectId;
};

/** @description Stored OTP challenge (hashed). */
export const OtpChallenge = mongoose.model('OtpChallenge', otpChallengeSchema);
