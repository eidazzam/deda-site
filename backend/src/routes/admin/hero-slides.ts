import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyPluginAsync } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import sharp from 'sharp';
import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { badRequest, notFound } from '../../lib/errors.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Fields that ride alongside the file part on create. Everything is
// optional — the admin can upload an image first and fill the alt text
// later via the PATCH endpoint.
const createFieldSchema = z.object({
  altEn: z.string().trim().max(200).optional(),
  altAr: z.string().trim().max(200).optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v.toLowerCase() === 'true')),
});

const updateSchema = z.object({
  altEn: z.string().trim().max(200).nullable().optional(),
  altAr: z.string().trim().max(200).nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const adminHeroSlideRoutes: FastifyPluginAsync = async (app) => {
  // GET — list every slide (active + hidden) so admin can toggle.
  app.get('/hero-slides', async () => {
    const slides = await prisma.heroSlide.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return { data: slides };
  });

  // POST (multipart) — upload an image and create the row.
  app.post('/hero-slides', async (req, reply) => {
    if (!req.isMultipart()) {
      throw badRequest('NOT_MULTIPART', 'Use multipart/form-data');
    }

    let file: MultipartFile | undefined;
    let buf: Buffer | undefined;
    const fields: Record<string, string> = {};

    for await (const part of req.parts()) {
      if (part.type === 'file') {
        if (file) {
          throw badRequest('MULTIPLE_FILES', 'Only one file per upload request');
        }
        file = part;
        buf = await part.toBuffer();
      } else if (typeof part.value === 'string') {
        fields[part.fieldname] = part.value;
      }
    }

    if (!file || !buf) throw badRequest('NO_FILE', 'No file was uploaded');
    if (!ACCEPTED_MIME.has(file.mimetype)) {
      throw badRequest('BAD_MIME', `Unsupported file type: ${file.mimetype}`);
    }
    if (buf.byteLength > MAX_FILE_BYTES) {
      throw badRequest('FILE_TOO_LARGE', 'File exceeds 10MB');
    }
    const parsed = createFieldSchema.parse(fields);

    const existingCount = await prisma.heroSlide.count();
    const filename = `slide-${existingCount + 1}-${Date.now()}.webp`;
    const heroDir = path.join(env.UPLOAD_DIR, 'hero');
    await mkdir(heroDir, { recursive: true });
    const fullPath = path.join(heroDir, filename);

    // Hero ratio matches the storefront's 4:5 aspect frame, sized large
    // enough for retina displays. The sharp pipeline trims EXIF and
    // converts to webp in one pass.
    const processed = await sharp(buf)
      .rotate()
      .resize({ width: 1400, height: 1750, fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .toBuffer();

    await writeFile(fullPath, processed);

    const publicUrl = `/uploads/hero/${filename}`;
    const slide = await prisma.heroSlide.create({
      data: {
        url: publicUrl,
        altEn: parsed.altEn ?? null,
        altAr: parsed.altAr ?? null,
        isActive: parsed.isActive ?? true,
        sortOrder: parsed.sortOrder ?? existingCount,
      },
    });

    return reply.code(201).send({ data: slide });
  });

  // PATCH — metadata only (alt text, sort order, active flag). The
  // image itself cannot be changed; admin deletes and re-uploads.
  app.patch<{ Params: { id: string } }>('/hero-slides/:id', async (req) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw notFound('SLIDE_NOT_FOUND', 'Slide not found');
    }
    const body = updateSchema.parse(req.body);
    const cleaned = Object.fromEntries(
      Object.entries(body).map(([k, v]) => [k, v === '' ? null : v]),
    );
    const slide = await prisma.heroSlide.update({
      where: { id },
      data: cleaned,
    });
    return { data: slide };
  });

  // DELETE — drop the row and best-effort remove the file from disk.
  app.delete<{ Params: { id: string } }>('/hero-slides/:id', async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw notFound('SLIDE_NOT_FOUND', 'Slide not found');
    }
    const slide = await prisma.heroSlide.findUnique({ where: { id } });
    if (!slide) throw notFound('SLIDE_NOT_FOUND', 'Slide not found');

    await prisma.heroSlide.delete({ where: { id } });

    if (slide.url.startsWith('/uploads/')) {
      const rel = slide.url.replace(/^\/uploads\//, '');
      const full = path.join(env.UPLOAD_DIR, rel);
      try {
        await unlink(full);
      } catch (err) {
        req.log.warn({ err, path: full }, 'failed to delete hero slide file');
      }
    }

    return reply.code(204).send();
  });
};
