import nodemailer from 'nodemailer';

import { env } from '../config/env.js';

type SendOtpEmailInput = {
  to: string;
  purpose: 'email_verification' | 'password_reset';
  expiresMinutes: number;
  code: string;
};

/** @description Captured mock emails during tests (never exposed via API). */
export const mockEmailOutbox: Array<{ to: string; subject: string; preview?: string }> = [];

export type BookingEmailKind =
  | 'reservation_received'
  | 'reservation_confirmed'
  | 'cancellation_requested'
  | 'cancellation_confirmed';

type SendBookingEmailInput = {
  to: string;
  kind: BookingEmailKind;
  guestName: string;
  reference: string;
  date: string;
  time: string;
  guests: number;
  tableName: string;
};

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
/**
 * @description Builds subject and bodies for booking lifecycle emails.
 * @param {SendBookingEmailInput} input - Template data.
 * @returns {{ subject: string; text: string; html: string }} Email content.
 */
function buildBookingEmailContent(input: SendBookingEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const when = `${input.date} at ${input.time}`;
  const tableLine = input.tableName ? ` Table: ${input.tableName}.` : '';
  const subjects: Record<BookingEmailKind, string> = {
    reservation_received: `Booking request received — ${input.reference}`,
    reservation_confirmed: `Your table is confirmed — ${input.reference}`,
    cancellation_requested: `Cancellation request received — ${input.reference}`,
    cancellation_confirmed: `Booking cancelled — ${input.reference}`,
  };
  const bodies: Record<BookingEmailKind, string> = {
    reservation_received: `Hello ${input.guestName}, we received your reservation request (${input.reference}) for ${when}, ${String(input.guests)} guests.${tableLine} We will confirm by phone or email shortly.`,
    reservation_confirmed: `Hello ${input.guestName}, your reservation ${input.reference} for ${when} is confirmed.${tableLine} We look forward to welcoming you.`,
    cancellation_requested: `Hello ${input.guestName}, we received your cancellation request for ${input.reference} (${when}). Our team will confirm shortly.`,
    cancellation_confirmed: `Hello ${input.guestName}, your reservation ${input.reference} for ${when} has been cancelled. Contact us if your plans change.`,
  };
  const subject = subjects[input.kind];
  const text = bodies[input.kind];
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#1E211D;line-height:1.5">
  <h2>Iturrieta Sagardotegia</h2>
  <p>${text}</p>
  <p style="color:#666;font-size:13px">Reference: <strong>${input.reference}</strong></p>
  </body></html>`;
  return { subject, text, html };
}

/**
 * @description Sends booking lifecycle email via SMTP or logs in mock mode.
 * @param {SendBookingEmailInput} input - Recipient and booking details.
 * @returns {Promise<void>}
 */
export async function sendBookingEmail(input: SendBookingEmailInput): Promise<void> {
  const { subject, text, html } = buildBookingEmailContent(input);

  if (env.EMAIL_MOCK || env.NODE_ENV === 'test') {
    mockEmailOutbox.push({ to: input.to, subject, preview: text });
    console.info(`[email:mock] ${input.kind} → ${input.to} (${input.reference})`);
    return;
  }

  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.MAIL_FROM_ADDRESS) {
    console.warn('[email] SMTP not configured — booking email skipped for', input.reference);
    return;
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
    html,
  });
}

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
