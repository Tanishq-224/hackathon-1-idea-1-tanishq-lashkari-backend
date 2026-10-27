import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

/**
 * @description Hashes a plaintext password.
 * @param {string} password - Raw password.
 * @returns {Promise<string>} Bcrypt hash.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * @description Compares a plaintext password to a stored hash.
 * @param {string} password - Raw password.
 * @param {string} hash - Stored bcrypt hash.
 * @returns {Promise<boolean>} Whether the password matches.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * @description Validates password policy for signup/reset.
 * @param {string} password - Candidate password.
 * @returns {{ valid: boolean; message?: string }} Validation result.
 */
export function validatePasswordPolicy(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters.' };
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return { valid: false, message: 'Password must include letters and numbers.' };
  }
  return { valid: true };
}
