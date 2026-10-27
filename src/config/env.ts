import { z } from 'zod';

/**
 * @description Treats blank env strings as unset for optional fields.
 * @param {unknown} value - Raw environment value.
 * @returns {unknown} Undefined when empty, otherwise original value.
 */
function emptyToUndefined(value: unknown): unknown {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }
  return value;
}

const optionalEmail = z.preprocess(emptyToUndefined, z.string().email().optional());
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    API_BASE_URL: z.string().url().optional(),
    CLIENT_URL: z.string().url(),
    MONGODB_URI: z.string().min(1),

    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
    REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

    SMTP_HOST: optionalString,
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    SMTP_USER: optionalString,
    SMTP_PASS: optionalString,
    MAIL_FROM_NAME: z.string().default('Iturrieta Sagardotegia'),
    MAIL_FROM_ADDRESS: optionalEmail,

    OTP_EXPIRY_MINUTES: z.coerce.number().int().positive().default(10),
    OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),

    EMAIL_MOCK: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),

    VENUE_TIMEZONE: z.string().default('Europe/Madrid'),

    STAFF_BOOTSTRAP_EMAIL: optionalEmail,
    STAFF_BOOTSTRAP_PASSWORD: z.preprocess(
      emptyToUndefined,
      z.string().min(8).optional(),
    ),
    ADMIN_BOOTSTRAP_EMAIL: optionalEmail,
    ADMIN_BOOTSTRAP_PASSWORD: z.preprocess(
      emptyToUndefined,
      z.string().min(8).optional(),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production' && data.EMAIL_MOCK) {
      ctx.addIssue({
        code: 'custom',
        message: 'EMAIL_MOCK must be false in production',
      });
    }
    if (data.NODE_ENV === 'production' && !data.EMAIL_MOCK) {
      if (!data.SMTP_HOST || !data.SMTP_USER || !data.SMTP_PASS || !data.MAIL_FROM_ADDRESS) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Production requires SMTP_HOST, SMTP_USER, SMTP_PASS, and MAIL_FROM_ADDRESS when sending real email',
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

/**
 * @description Parses and validates process environment variables with Zod.
 * @returns {Env} Validated environment configuration.
 * @throws {Error} When validation fails.
 */
export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${message}`);
  }
  return parsed.data;
}

/** @description Application environment (loaded once at startup). */
export const env = loadEnv();
