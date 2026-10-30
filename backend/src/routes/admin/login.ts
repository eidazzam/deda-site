import { timingSafeEqual } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { env } from '../../config/env.js';
import { unauthorized } from '../../lib/errors.js';

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

// Constant-time string compare to avoid leaking length/prefix via response time.
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export const adminLoginRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/login',
    {
      // Brute-force protection: 5 attempts per IP per 15 minutes. The
      // global limiter (200/min) sits above this; the per-route config
      // here just clamps failed-login rate harder than raw browsing.
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
        },
      },
    },
    async (req, reply) => {
      const body = loginSchema.parse(req.body);

    const usernameOk = safeEqual(body.username, env.ADMIN_USERNAME);
    const passwordOk = safeEqual(body.password, env.ADMIN_PASSWORD);

    if (!usernameOk || !passwordOk) {
      throw unauthorized('INVALID_CREDENTIALS', 'Username or password is incorrect');
    }

    const token = await reply.jwtSign({ sub: env.ADMIN_USERNAME, role: 'admin' });

      return {
        data: {
          token,
          username: env.ADMIN_USERNAME,
          expiresIn: env.JWT_EXPIRES_IN,
        },
      };
    },
  );

  // Echo back the current admin — useful for the frontend to verify the
  // stored token is still valid on page load.
  app.get('/me', { preHandler: app.authenticate }, async (req) => ({
    data: { username: req.user.sub, role: req.user.role },
  }));
};
