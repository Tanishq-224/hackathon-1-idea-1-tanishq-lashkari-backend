import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const USER_ROLES = ['customer', 'staff', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'customer', required: true },
    emailVerified: { type: Boolean, default: false, required: true },
    isActive: { type: Boolean, default: false, required: true },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};

/** @description Mongoose user model. */
export const User = mongoose.model('User', userSchema);
