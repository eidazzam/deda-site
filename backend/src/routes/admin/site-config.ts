import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyPluginAsync } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import sharp from 'sharp';
import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { badRequest } from '../../lib/errors.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Each field is independently optional so the admin can clear a handle
// without having to send the whole config back. Editorial fields share
// the same shape so the same PATCH handles both.
const updateSchema = z.object({
  whatsappNumber:       z.string().trim().max(30).nullable().optional(),
  facebookUrl:          z.string().trim().max(300).nullable().optional(),
  instagramUrl:         z.string().trim().max(300).nullable().optional(),
  tiktokUrl:            z.string().trim().max(300).nullable().optional(),
  editorialEyebrowEn:   z.string().trim().max(80).nullable().optional(),
  editorialEyebrowAr:   z.string().trim().max(80).nullable().optional(),
  editorialHeadlineEn:  z.string().trim().max(200).nullable().optional(),
  editorialHeadlineAr:  z.string().trim().max(200).nullable().optional(),
  editorialBodyEn:      z.string().trim().max(800).nullable().optional(),
  editorialBodyAr:      z.string().trim().max(800).nullable().optional(),
});

export const adminSiteConfigRoutes: FastifyPluginAsync = async (app) => {
  app.get('/site-config', async () => {
    const config = await prisma.siteConfig.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
    return { data: config };
  });

  app.patch('/site-config', async (req) => {
    const body = updateSchema.parse(req.body);
    // Treat empty strings as "clear the field" so the admin can wipe a
    // value by submitting a blank input.
    const cleaned = Object.fromEntries(
      Object.entries(body).map(([k, v]) => [k, v === '' ? null : v]),
    );
    const config = await prisma.siteConfig.upsert({
      where: { id: 1 },
      create: { id: 1, ...cleaned },
      update: cleaned,
    });
    return { data: config };
  });

  // Editorial split image upload — single file, replaces the existing
  // editorialImageUrl. Old file is best-effort removed from disk so the
  // uploads dir doesn't grow forever.
  app.post('/site-config/editorial-image', async (req, reply) => {
    if (!req.isMultipart()) {
      throw badRequest('NOT_MULTIPART', 'Use multipart/form-data');
    }

    let file: MultipartFile | undefined;
    let buf: Buffer | undefined;
    for await (const part of req.parts()) {
      if (part.type === 'file') {
        if (file) {
          throw badRequest('MULTIPLE_FILES', 'Only one file per upload request');
        }
        file = part;
        buf = await part.toBuffer();
      }
    }
    if (!file || !buf) throw badRequest('NO_FILE', 'No file was uploaded');
    if (!ACCEPTED_MIME.has(file.mimetype)) {
      throw badRequest('BAD_MIME', `Unsupported file type: ${file.mimetype}`);
    }
    if (buf.byteLength > MAX_FILE_BYTES) {
      throw badRequest('FILE_TOO_LARGE', 'File exceeds 10MB');
    }

    const existing = await prisma.siteConfig.findUnique({ where: { id: 1 } });

    const filename = `editorial-${Date.now()}.webp`;
    const dir = path.join(env.UPLOAD_DIR, 'editorial');
    await mkdir(dir, { recursive: true });
    const fullPath = path.join(dir, filename);

    // Storefront frame is 4:5 portrait, sized large enough for retina.
    const processed = await sharp(buf)
      .rotate()
      .resize({ width: 1000, height: 1250, fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .toBuffer();

    await writeFile(fullPath, processed);

    const publicUrl = `/uploads/editorial/${filename}`;
    const config = await prisma.siteConfig.upsert({
      where: { id: 1 },
      create: { id: 1, editorialImageUrl: publicUrl },
      update: { editorialImageUrl: publicUrl },
    });

    if (existing?.editorialImageUrl?.startsWith('/uploads/')) {
      const rel = existing.editorialImageUrl.replace(/^\/uploads\//, '');
      const old = path.join(env.UPLOAD_DIR, rel);
      try {
        await unlink(old);
      } catch (err) {
        req.log.warn({ err, path: old }, 'failed to delete previous editorial image');
      }
    }

    return reply.code(201).send({ data: config });
  });

  app.delete('/site-config/editorial-image', async (req, reply) => {
    const existing = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    if (!existing?.editorialImageUrl) {
      return reply.code(204).send();
    }
    await prisma.siteConfig.update({
      where: { id: 1 },
      data: { editorialImageUrl: null },
    });
    if (existing.editorialImageUrl.startsWith('/uploads/')) {
      const rel = existing.editorialImageUrl.replace(/^\/uploads\//, '');
      const full = path.join(env.UPLOAD_DIR, rel);
      try {
        await unlink(full);
      } catch (err) {
        req.log.warn({ err, path: full }, 'failed to delete editorial image');
      }
    }
    return reply.code(204).send();
  });

  // ---------------------------------------------------------------------------
  // Hero slider — up to four slots. Each slot is independently
  // uploadable/clearable; the storefront reads them off SiteConfig and
  // falls back to the hardcoded editorial frames for any null slot.
  // ---------------------------------------------------------------------------
  type HeroSlotColumn =
    | 'heroImage1Url'
    | 'heroImage2Url'
    | 'heroImage3Url'
    | 'heroImage4Url';
  const slotColumn = (slot: number): HeroSlotColumn | null => {
    if (slot < 1 || slot > 4) return null;
    return `heroImage${slot}Url` as HeroSlotColumn;
  };

  app.post<{ Params: { slot: string } }>(
    '/site-config/hero-image/:slot',
    async (req, reply) => {
      const slot = Number(req.params.slot);
      const col = slotColumn(slot);
      if (!col) throw badRequest('BAD_SLOT', 'Hero slot must be 1, 2, 3 or 4');

      if (!req.isMultipart()) {
        throw badRequest('NOT_MULTIPART', 'Use multipart/form-data');
      }

      let file: MultipartFile | undefined;
      let buf: Buffer | undefined;
      for await (const part of req.parts()) {
        if (part.type === 'file') {
          if (file) {
            throw badRequest('MULTIPLE_FILES', 'Only one file per upload request');
          }
          file = part;
          buf = await part.toBuffer();
        }
      }
      if (!file || !buf) throw badRequest('NO_FILE', 'No file was uploaded');
      if (!ACCEPTED_MIME.has(file.mimetype)) {
        throw badRequest('BAD_MIME', `Unsupported file type: ${file.mimetype}`);
      }
      if (buf.byteLength > MAX_FILE_BYTES) {
        throw badRequest('FILE_TOO_LARGE', 'File exceeds 10MB');
      }

      const existing = await prisma.siteConfig.findUnique({ where: { id: 1 } });
      const previousUrl = existing?.[col] ?? null;

      const filename = `hero-${slot}-${Date.now()}.webp`;
      const dir = path.join(env.UPLOAD_DIR, 'hero');
      await mkdir(dir, { recursive: true });
      const fullPath = path.join(dir, filename);

      // Hero slider is roughly 7:12 portrait on desktop (lg:col-span-7
      // of the hero grid), sized large enough for retina.
      const processed = await sharp(buf)
        .rotate()
        .resize({ width: 1400, height: 1700, fit: 'cover', position: 'center' })
        .webp({ quality: 85 })
        .toBuffer();

      await writeFile(fullPath, processed);

      const publicUrl = `/uploads/hero/${filename}`;
      const config = await prisma.siteConfig.upsert({
        where: { id: 1 },
        create: { id: 1, [col]: publicUrl },
        update: { [col]: publicUrl },
      });

      if (previousUrl?.startsWith('/uploads/')) {
        const rel = previousUrl.replace(/^\/uploads\//, '');
        const old = path.join(env.UPLOAD_DIR, rel);
        try {
          await unlink(old);
        } catch (err) {
          req.log.warn({ err, path: old }, 'failed to delete previous hero image');
        }
      }

      return reply.code(201).send({ data: config });
    },
  );

  app.delete<{ Params: { slot: string } }>(
    '/site-config/hero-image/:slot',
    async (req, reply) => {
      const slot = Number(req.params.slot);
      const col = slotColumn(slot);
      if (!col) throw badRequest('BAD_SLOT', 'Hero slot must be 1, 2, 3 or 4');

      const existing = await prisma.siteConfig.findUnique({ where: { id: 1 } });
      const url = existing?.[col] ?? null;
      if (!url) return reply.code(204).send();

      await prisma.siteConfig.update({
        where: { id: 1 },
        data: { [col]: null },
      });
      if (url.startsWith('/uploads/')) {
        const rel = url.replace(/^\/uploads\//, '');
        const full = path.join(env.UPLOAD_DIR, rel);
        try {
          await unlink(full);
        } catch (err) {
          req.log.warn({ err, path: full }, 'failed to delete hero image');
        }
      }
      return reply.code(204).send();
    },
  );
};
