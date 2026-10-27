import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';

import { env } from '../config/env.js';
import { OtpChallenge, type OtpPurpose } from '../models/OtpChallenge.js';
import { RefreshSession } from '../models/RefreshSession.js';
import { User, type UserDocument, type UserRole } from '../models/User.js';
import { sendOtpEmail } from './email.service.js';
import { AppError } from '../utils/AppError.js';
import { generateOtpCode, hashOtp, verifyOtp } from '../utils/otp.js';
import { hashPassword, validatePasswordPolicy, verifyPassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
};

/**
 * @description Maps a user document to a public profile.
 * @param {UserDocument} user - Mongoose user.
 * @returns {PublicUser} Safe user payload.
 */
export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    emailVerified: user.emailVerified,
  };
}

/**
 * @description Creates OTP challenge and sends email.
 * @param {string} userId - User id.
 * @param {OtpPurpose} purpose - OTP purpose.
 * @param {string} email - Recipient email.
 * @returns {Promise<void>}
 */
async function issueOtp(userId: string, purpose: OtpPurpose, email: string): Promise<void> {
  await OtpChallenge.updateMany(
    { userId, purpose, consumedAt: null },
    { $set: { consumedAt: new Date() } },
  );

  const code = generateOtpCode();
  const codeHash = await hashOtp(code);
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60_000);

  await OtpChallenge.create({
    userId,
    purpose,
    codeHash,
    expiresAt,
    attempts: 0,
    lastSentAt: new Date(),
  });

  await sendOtpEmail({
    to: email,
    purpose,
    expiresMinutes: env.OTP_EXPIRY_MINUTES,
    code,
  });
}

/**
 * @description Registers a customer account and sends verification OTP.
 * @param {object} input - Signup payload.
 * @returns {Promise<{ message: string }>} Generic success message.
 */
export async function signupCustomer(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ message: string }> {
  const email = input.email.trim().toLowerCase();
  const policy = validatePasswordPolicy(input.password);
  if (!policy.valid) {
    throw new AppError(policy.message ?? 'Invalid password', 422);
  }

  const passwordHash = await hashPassword(input.password);
  let user = await User.findOne({ email });
  if (user?.emailVerified) {
    throw new AppError('If this email is available, a verification message was sent.', 409);
  }
  if (user) {
    user.name = input.name.trim();
    user.passwordHash = passwordHash;
    await user.save();
  } else {
    user = await User.create({
      name: input.name.trim(),
      email,
      passwordHash,
      role: 'customer',
      emailVerified: false,
      isActive: false,
    });
  }

  await issueOtp(user._id.toString(), 'email_verification', email);
  return { message: 'If this email is available, a verification code was sent.' };
}

/**
 * @description Verifies signup OTP and activates the account.
 * @param {object} input - Email and OTP code.
 * @returns {Promise<{ user: PublicUser; accessToken: string; refreshToken: string }>} Session tokens.
 */
export async function verifyEmailOtp(input: { email: string; code: string }): Promise<{
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}> {
  const user = await User.findOne({ email: input.email.trim().toLowerCase() }).select('+passwordHash');
  if (!user) {
    throw new AppError('Invalid verification request', 400);
  }

  const challenge = await OtpChallenge.findOne({
    userId: user._id,
    purpose: 'email_verification',
    consumedAt: null,
  }).sort({ createdAt: -1 });

  if (!challenge || challenge.expiresAt.getTime() < Date.now()) {
    throw new AppError('Verification code expired', 400);
  }
  if (challenge.attempts >= env.OTP_MAX_ATTEMPTS) {
    throw new AppError('Too many attempts. Request a new code.', 429);
  }

  const valid = await verifyOtp(input.code, challenge.codeHash);
  challenge.attempts += 1;
  await challenge.save();
  if (!valid) {
    throw new AppError('Invalid verification code', 400);
  }

  challenge.consumedAt = new Date();
  await challenge.save();
  user.emailVerified = true;
  user.isActive = true;
  await user.save();

  return createSession(user, '');
}

/**
 * @description Resends verification OTP when cooldown allows.
 * @param {string} email - Account email.
 * @returns {Promise<{ message: string }>} Generic response.
 */
export async function resendVerificationOtp(email: string): Promise<{ message: string }> {
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user || user.emailVerified) {
    return { message: 'If eligible, a new code was sent.' };
  }
  const latest = await OtpChallenge.findOne({
    userId: user._id,
    purpose: 'email_verification',
    consumedAt: null,
  }).sort({ createdAt: -1 });
  if (
    latest &&
    Date.now() - latest.lastSentAt.getTime() < env.OTP_RESEND_COOLDOWN_SECONDS * 1000
  ) {
    throw new AppError('Please wait before requesting another code.', 429);
  }
  await issueOtp(user._id.toString(), 'email_verification', user.email);
  return { message: 'If eligible, a new code was sent.' };
}

/**
 * @description Authenticates staff or customer with email/password.
 * @param {object} input - Login credentials.
 * @returns {Promise<{ user: PublicUser; accessToken: string; refreshToken: string }>} Session.
 */
export async function login(input: {
  email: string;
  password: string;
  userAgent?: string;
  staffOnly?: boolean;
}): Promise<{ user: PublicUser; accessToken: string; refreshToken: string }> {
  const user = await User.findOne({ email: input.email.trim().toLowerCase() }).select('+passwordHash');
  if (!user || !user.isActive || !user.emailVerified) {
    throw new AppError('Invalid email or password', 401);
  }
  if (input.staffOnly && user.role === 'customer') {
    throw new AppError('Invalid email or password', 401);
  }
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    throw new AppError('Invalid email or password', 401);
  }
  return createSession(user, input.userAgent ?? '');
}

/**
 * @description Creates access/refresh tokens and persists refresh hash.
 * @param {UserDocument} user - Authenticated user.
 * @param {string} userAgent - Client user agent.
 * @returns {Promise<{ user: PublicUser; accessToken: string; refreshToken: string }>} Tokens.
 */
async function createSession(
  user: UserDocument,
  userAgent: string,
): Promise<{ user: PublicUser; accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken({
    sub: user._id.toString(),
    role: user.role,
    email: user.email,
  });
  const refreshToken = signRefreshToken(user._id.toString());
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshSession.create({ userId: user._id, tokenHash, expiresAt, userAgent });
  return { user: toPublicUser(user), accessToken, refreshToken };
}

/**
 * @description Revokes refresh session and logs out.
 * @param {string | undefined} refreshToken - Refresh JWT from cookie.
 * @returns {Promise<void>}
 */
export async function logout(refreshToken?: string): Promise<void> {
  if (!refreshToken) {
    return;
  }
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await RefreshSession.updateOne({ tokenHash }, { $set: { revokedAt: new Date() } });
}

/**
 * @description Loads user by access token payload id.
 * @param {string} userId - User id.
 * @returns {Promise<PublicUser | null>} Profile or null.
 */
export async function getCurrentUser(userId: string): Promise<PublicUser | null> {
  const user = await User.findById(userId);
  return user ? toPublicUser(user) : null;
}

/**
 * @description Updates password for a signed-in user after verifying the current one.
 * @param {object} input - User id and password fields.
 * @returns {Promise<{ message: string }>} Success message.
 */
export async function changePassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<{ message: string }> {
  const policy = validatePasswordPolicy(input.newPassword);
  if (!policy.valid) {
    throw new AppError(policy.message ?? 'Invalid password', 422);
  }
  const user = await User.findById(input.userId).select('+passwordHash');
  if (!user || !user.isActive) {
    throw new AppError('Unauthorized', 401);
  }
  const matches = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!matches) {
    throw new AppError('Current password is incorrect', 401);
  }
  user.passwordHash = await hashPassword(input.newPassword);
  await user.save();
  return { message: 'Password updated successfully.' };
}

/**
 * @description Starts password reset flow.
 * @param {string} email - Account email.
 * @returns {Promise<{ message: string }>} Generic message.
 */
export async function forgotPassword(email: string): Promise<{ message: string }> {
  const user = await User.findOne({ email: email.trim().toLowerCase(), isActive: true });
  if (user) {
    await issueOtp(user._id.toString(), 'password_reset', user.email);
  }
  return { message: 'If an account exists, a reset code was sent.' };
}

/**
 * @description Resets password using OTP.
 * @param {object} input - Email, code, new password.
 * @returns {Promise<{ message: string }>} Success message.
 */
export async function resetPassword(input: {
  email: string;
  code: string;
  password: string;
}): Promise<{ message: string }> {
  const policy = validatePasswordPolicy(input.password);
  if (!policy.valid) {
    throw new AppError(policy.message ?? 'Invalid password', 422);
  }
  const user = await User.findOne({ email: input.email.trim().toLowerCase() }).select('+passwordHash');
  if (!user) {
    throw new AppError('Invalid reset request', 400);
  }
  const challenge = await OtpChallenge.findOne({
    userId: user._id,
    purpose: 'password_reset',
    consumedAt: null,
  }).sort({ createdAt: -1 });
  if (!challenge || challenge.expiresAt.getTime() < Date.now()) {
    throw new AppError('Reset code expired', 400);
  }
  if (challenge.attempts >= env.OTP_MAX_ATTEMPTS) {
    throw new AppError('Too many attempts', 429);
  }
  const valid = await verifyOtp(input.code, challenge.codeHash);
  challenge.attempts += 1;
  await challenge.save();
  if (!valid) {
    throw new AppError('Invalid reset code', 400);
  }
  challenge.consumedAt = new Date();
  await challenge.save();
  user.passwordHash = await hashPassword(input.password);
  await user.save();
  await RefreshSession.updateMany({ userId: user._id }, { $set: { revokedAt: new Date() } });
  return { message: 'Password updated. Please sign in again.' };
}

/**
 * @description Rotates refresh token and issues new access token.
 * @param {string} refreshToken - Existing refresh JWT.
 * @returns {Promise<{ accessToken: string; refreshToken: string }>} New tokens.
 */
export async function refreshSession(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const payload = verifyRefreshToken(refreshToken);
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const session = await RefreshSession.findOne({ tokenHash, revokedAt: null });
  if (!session || session.expiresAt.getTime() < Date.now()) {
    throw new AppError('Session expired', 401);
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new AppError('Session expired', 401);
  }
  session.revokedAt = new Date();
  await session.save();
  const next = await createSession(user, session.userAgent ?? '');
  return { accessToken: next.accessToken, refreshToken: next.refreshToken };
}
