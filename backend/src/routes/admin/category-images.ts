import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyPluginAsync } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import sharp from 'sharp';
import { z } from 'zod';
import { Category } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { badRequest, notFound } from '../../lib/errors.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

// The category arrives as a multipart text field. Validate against the
// Prisma enum so a typo here can't insert a junk row.
const CATEGORIES = Object.values(Category) as Category[];
const categorySchema = z.enum(CATEGORIES as [Category, ...Category[]]);

export const adminCategoryImageRoutes: FastifyPluginAsync = async (app) => {
  // GET — list every row the admin has saved so far.
  app.get('/category-images', async () => {
    const rows = await prisma.categoryCardImage.findMany();
    return { data: rows };
  });

  // POST (multipart) — upsert the image for one category. Fields:
  //   file (required), category (required, one of Category enum).
  // Replacing an existing image deletes the old file from disk.
  app.post('/category-images', async (req, reply) => {
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
    const parsedCategory = categorySchema.safeParse(fields.category);
    if (!parsedCategory.success) {
      throw badRequest('BAD_CATEGORY', 'Missing or invalid category field');
    }
    const category = parsedCategory.data;

    const existing = await prisma.categoryCardImage.findUnique({
      where: { category },
    });

    const filename = `${category.toLowerCase()}-${Date.now()}.webp`;
    const dir = path.join(env.UPLOAD_DIR, 'categories');
    await mkdir(dir, { recursive: true });
    const fullPath = path.join(dir, filename);

    // Category cards are rendered at aspect-[3/4] on the homepage, so
    // crop the upload to match. 1200×1600 covers retina at 600px wide.
    const processed = await sharp(buf)
      .rotate()
      .resize({ width: 1200, height: 1600, fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .toBuffer();

    await writeFile(fullPath, processed);

    const publicUrl = `/uploads/categories/${filename}`;
    const saved = await prisma.categoryCardImage.upsert({
      where: { category },
      create: { category, url: publicUrl },
      update: { url: publicUrl },
    });

    // Best-effort cleanup of the previous file.
    if (existing && existing.url.startsWith('/uploads/')) {
      const rel = existing.url.replace(/^\/uploads\//, '');
      const oldPath = path.join(env.UPLOAD_DIR, rel);
      try {
        await unlink(oldPath);
      } catch (err) {
        req.log.warn(
          { err, path: oldPath },
          'failed to delete previous category image file',
        );
      }
    }

    return reply.code(201).send({ data: saved });
  });

  // DELETE — clear the override for one category. The storefront will
  // fall back to its hardcoded image. Best-effort removes the file too.
  app.delete<{ Params: { category: string } }>(
    '/category-images/:category',
    async (req, reply) => {
      const parsed = categorySchema.safeParse(req.params.category);
      if (!parsed.success) {
        throw notFound('CATEGORY_NOT_FOUND', 'Unknown category');
      }
      const category = parsed.data;
      const existing = await prisma.categoryCardImage.findUnique({
        where: { category },
      });
      if (!existing) {
        throw notFound('CATEGORY_NOT_FOUND', 'No override set for this category');
      }
      await prisma.categoryCardImage.delete({ where: { category } });

      if (existing.url.startsWith('/uploads/')) {
        const rel = existing.url.replace(/^\/uploads\//, '');
        const full = path.join(env.UPLOAD_DIR, rel);
        try {
          await unlink(full);
        } catch (err) {
          req.log.warn(
            { err, path: full },
            'failed to delete category image file',
          );
        }
      }
      return reply.code(204).send();
    },
  );
};
