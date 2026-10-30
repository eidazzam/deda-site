import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';

import { env } from '../config/env.js';
import { unauthorized } from '../lib/errors.js';

// Make `req.user` typed when we read it inside admin routes.
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: 'admin' };
    user: { sub: string; role: 'admin' };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function registerAuth(app: FastifyInstance) {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  app.decorate('authenticate', async (req: FastifyRequest, _reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      throw unauthorized('UNAUTHORIZED', 'Login required');
    }
  });
}
