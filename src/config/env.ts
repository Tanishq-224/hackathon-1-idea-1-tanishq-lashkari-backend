import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  CLIENT_URL: z.url({ message: 'CLIENT_URL must be a valid URL' }),
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
