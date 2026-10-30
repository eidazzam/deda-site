import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

/**
 * Domain-level error. Carries an HTTP status and a stable machine code
 * so the frontend can branch on `error.code` rather than message text.
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (code: string, message: string) =>
  new AppError(400, code, message);

export const notFound = (code: string, message: string) =>
  new AppError(404, code, message);

export const conflict = (code: string, message: string) =>
  new AppError(409, code, message);

export const unauthorized = (code: string, message: string) =>
  new AppError(401, code, message);

/**
 * Single error handler for every route. Maps Zod and AppError into the
 * { error: { code, message, details? } } envelope, lets Fastify's own
 * HTTP errors pass through (sensible already shapes them), and treats
 * everything else as a 500 without leaking the stack.
 */
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      // Log every validation failure with the field errors AND the
      // offending request body so we can retrace what broke after the
      // fact — the Docker container throws its own logs away on rebuild,
      // and 400 responses used to leave zero trail. User-agent is
      // included because Instagram/Facebook in-app browsers are known
      // to strip cookies and mangle payloads in ways Safari does not.
      req.log.warn(
        {
          fieldErrors: err.flatten().fieldErrors,
          body: req.body,
          userAgent: req.headers['user-agent'],
          referer: req.headers.referer,
        },
        'zod validation failed',
      );
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: err.flatten().fieldErrors,
        },
      });
    }

    if (err instanceof AppError) {
      return reply.code(err.statusCode).send({
        error: { code: err.code, message: err.message },
      });
    }

    // Fastify HTTP errors (from sensible / validation) — carry statusCode.
    const maybeHttp = err as { statusCode?: number; message?: string };
    if (typeof maybeHttp.statusCode === 'number' && maybeHttp.statusCode < 500) {
      return reply.code(maybeHttp.statusCode).send({
        error: {
          code: 'HTTP_ERROR',
          message: maybeHttp.message ?? 'Request failed',
        },
      });
    }

    req.log.error({ err }, 'unhandled error');
    return reply.code(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    });
  });
}
