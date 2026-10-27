import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';

/**
 * @description Generates a cryptographically secure six-digit OTP string.
 * @returns {string} Six-digit OTP.
 */
export function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/**
 * @description Hashes an OTP for storage.
 * @param {string} code - Plain OTP.
 * @returns {Promise<string>} Bcrypt hash.
 */
export async function hashOtp(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

/**
 * @description Verifies an OTP against a stored hash.
 * @param {string} code - Plain OTP.
 * @param {string} hash - Stored hash.
 * @returns {Promise<boolean>} Match result.
 */
export async function verifyOtp(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

/**
 * @description Generates an unpredictable booking reference.
 * @returns {string} Reference such as ITU-XXXXXX.
 */
export function generateBookingReference(): string {
  const token = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ITU-${token}`;
}
