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

  // Public-facing site URL — used in the Order confirmation emails,
  // sitemap, canonical links, and the admin's "view on site" buttons.
  PUBLIC_SITE_URL: z.string().default('http://localhost:3020'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
