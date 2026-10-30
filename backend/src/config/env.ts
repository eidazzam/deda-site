import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(8),

  UPLOAD_DIR: z.string().default('/app/uploads'),

  // Origin allowed by CORS. In production this is the storefront URL.
  // Comma-separate for multiple origins.
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // ---- Tap Payments -----------------------------------------------------
  // Secret API key (sk_test_xxx for sandbox, sk_live_xxx for production).
  // Optional so the stack still boots without Tap configured — we only
  // require it when the checkout actually calls Tap.
  TAP_SECRET_KEY: z.string().optional(),
  // Webhook signing secret — used to verify HMAC on incoming Tap callbacks.
  TAP_WEBHOOK_SECRET: z.string().optional(),
  // Tap API base. Same host for sandbox + live; the key prefix decides
  // which environment Tap routes the request to.
  TAP_BASE_URL: z.string().default('https://api.tap.company'),
  // Public-facing site URL Tap should redirect the customer back to after
  // payment. Used to build the redirect.url field on the charge.
  PUBLIC_SITE_URL: z.string().default('http://localhost:3020'),
  // Public-facing API URL Tap calls back with the webhook. Separate from
  // PUBLIC_SITE_URL because the storefront and API live on different hosts
  // in production (Cloudflare Pages for storefront, api.dedawomenswear.shop for
  // backend). Falls back to PUBLIC_SITE_URL for local dev where both run
  // off the same host.
  PUBLIC_API_URL: z.string().optional(),
  // Local-development convenience: when "true", the checkout init route
  // skips the real Tap API and hands the customer off to our own
  // /checkout/mock-tap page where they can simulate any outcome with a
  // button click. Never enable on production.
  TAP_MOCK_MODE: z
    .string()
    .optional()
    .transform((v) => v?.toLowerCase() === 'true'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
