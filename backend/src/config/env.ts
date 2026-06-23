import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Parse and validate environment variables at startup.
 * The process exits immediately if required vars are missing or malformed —
 * fail-fast is preferable to mysterious runtime errors later.
 */
const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),
  ADMIN_PASSWORD: z.string().min(1, 'ADMIN_PASSWORD is required for dashboard security'),
  /**
   * When true, POST /api/events requires an X-API-Key header matching ADMIN_PASSWORD.
   * Defaults to false for backward compatibility with existing self-hosted deployments.
   * Set to true in production environments.
   */
  REQUIRE_API_KEY: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('false'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:\n', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
