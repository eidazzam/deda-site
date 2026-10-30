import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyPluginAsync } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import sharp from 'sharp';
import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { badRequest, notFound } from '../../lib/errors.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const fieldSchema = z.object({
  productId: z.coerce.number().int().positive(),
  variantId: z.coerce.number().int().positive().optional(),
  alt: z.string().trim().max(200).optional(),
});

// Filenames have to survive across filesystems — strip unicode, lowercase,
// collapse non-alphanumerics. `Olive` → `olive`, `Off-white` → `off-white`.
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export const adminUploadRoutes: FastifyPluginAsync = async (app) => {
  // POST /uploads (multipart)
  // Fields: productId (required), variantId (optional), alt (optional), file
  // Returns the created ProductImage row.
  app.post('/uploads', async (req, reply) => {
    if (!req.isMultipart()) {
      throw badRequest('NOT_MULTIPART', 'Use multipart/form-data');
    }

    // Walk every part once — file streams must be consumed before the next
    // iteration, so we materialise into a buffer immediately on the file part.
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
    const parsed = fieldSchema.parse(fields);

    const product = await prisma.product.findUnique({
      where: { id: parsed.productId },
      select: { id: true, slug: true },
    });
    if (!product) throw notFound('PRODUCT_NOT_FOUND', 'Product not found');

    let variantSlug = 'main';
    if (parsed.variantId) {
      const variant = await prisma.variant.findUnique({
        where: { id: parsed.variantId },
        select: { id: true, productId: true, colorNameEn: true },
      });
      if (!variant || variant.productId !== product.id) {
        throw notFound('VARIANT_NOT_FOUND', 'Variant not found for this product');
      }
      variantSlug = slugify(variant.colorNameEn);
    }

    const existingCount = await prisma.productImage.count({
      where: { productId: product.id, variantId: parsed.variantId ?? null },
    });

    const filename = `${variantSlug}-${existingCount + 1}-${Date.now()}.webp`;
    const productDir = path.join(env.UPLOAD_DIR, 'products', product.slug);
    await mkdir(productDir, { recursive: true });
    const fullPath = path.join(productDir, filename);

    // Resize + convert to webp in one pass. The dimensions match the
    // storefront's product card aspect ratio (4:5).
    const processed = await sharp(buf)
      .rotate() // honour EXIF orientation
      .resize({ width: 1200, height: 1500, fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .toBuffer();

    await writeFile(fullPath, processed);

    const publicUrl = `/uploads/products/${product.slug}/${filename}`;
    const image = await prisma.productImage.create({
      data: {
        productId: product.id,
        variantId: parsed.variantId ?? null,
        url: publicUrl,
        alt: parsed.alt ?? null,
        sortOrder: existingCount,
      },
    });

    return reply.code(201).send({
      data: {
        id: image.id,
        url: image.url,
        alt: image.alt,
        sortOrder: image.sortOrder,
      },
    });
  });

  // DELETE /uploads/:id — drop the DB row and try to remove the file too
  app.delete<{ Params: { id: string } }>('/uploads/:id', async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw notFound('IMAGE_NOT_FOUND', 'Image not found');
    }
    const image = await prisma.productImage.findUnique({ where: { id } });
    if (!image) throw notFound('IMAGE_NOT_FOUND', 'Image not found');

    await prisma.productImage.delete({ where: { id } });

    // Best-effort file cleanup — never block the response on it
    if (image.url.startsWith('/uploads/')) {
      const rel = image.url.replace(/^\/uploads\//, '');
      const full = path.join(env.UPLOAD_DIR, rel);
      try {
        await unlink(full);
      } catch (err) {
        req.log.warn({ err, path: full }, 'failed to delete image file');
      }
    }

    return reply.code(204).send();
  });
};
