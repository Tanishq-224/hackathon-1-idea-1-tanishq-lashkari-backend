import nodemailer from 'nodemailer';

import { env } from '../config/env.js';

type SendOtpEmailInput = {
  to: string;
  purpose: 'email_verification' | 'password_reset';
  expiresMinutes: number;
  code: string;
};

/** @description Captured mock emails during tests (never exposed via API). */
export const mockEmailOutbox: Array<{ to: string; subject: string }> = [];

/** @description Last OTP sent in mock mode (tests only, not exposed over HTTP). */
let lastMockOtpCode: string | null = null;

/**
 * @description Returns last mock OTP for automated tests.
 * @returns {string | null} OTP code or null outside mock sends.
 */
export function getLastMockOtpForTests(): string | null {
  return env.NODE_ENV === 'test' ? lastMockOtpCode : null;
}

/**
 * @description Builds HTML for OTP emails.
 * @param {SendOtpEmailInput} input - Template data.
 * @returns {string} HTML body.
 */
function buildOtpHtml(input: SendOtpEmailInput): string {
  const title =
    input.purpose === 'email_verification' ? 'Verify your email' : 'Reset your password';
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#1E211D">
  <h2>Iturrieta Sagardotegia</h2>
  <p>${title}</p>
  <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${input.code}</p>
  <p>This code expires in ${String(input.expiresMinutes)} minutes. Do not share it.</p>
  <p>If you did not request this, ignore this email.</p>
  </body></html>`;
}

/**
 * @description Sends an OTP email via SMTP or mock transport.
 * @param {SendOtpEmailInput} input - Recipient and OTP metadata.
 * @returns {Promise<void>}
 * @throws {Error} When delivery fails in non-mock mode.
 */
export async function sendOtpEmail(input: SendOtpEmailInput): Promise<void> {
  const subject =
    input.purpose === 'email_verification'
      ? 'Your Iturrieta verification code'
      : 'Your Iturrieta password reset code';
  const text = `${subject}: ${input.code} (expires in ${String(input.expiresMinutes)} minutes)`;

  if (env.EMAIL_MOCK || env.NODE_ENV === 'test') {
    mockEmailOutbox.push({ to: input.to, subject });
    lastMockOtpCode = input.code;
    return;
  }

  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.MAIL_FROM_ADDRESS) {
    throw new Error('SMTP is not configured');
  }

  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  await transport.sendMail({
    from: `"${env.MAIL_FROM_NAME}" <${env.MAIL_FROM_ADDRESS}>`,
    to: input.to,
    subject,
    text,
    html: buildOtpHtml(input),
  });
}

/**
 * @description Verifies SMTP connectivity without blocking startup indefinitely.
 * @returns {Promise<{ ok: boolean; message: string }>} Diagnostic result.
 */
export async function verifySmtpConfiguration(): Promise<{ ok: boolean; message: string }> {
  if (env.EMAIL_MOCK || env.NODE_ENV === 'test') {
    return { ok: true, message: 'Email mock mode enabled' };
  }
  if (!env.SMTP_HOST) {
    return { ok: false, message: 'SMTP_HOST not set' };
  }
  try {
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
    await transport.verify();
    return { ok: true, message: 'SMTP ready' };
  } catch {
    return { ok: false, message: 'SMTP verification failed' };
  }
}
