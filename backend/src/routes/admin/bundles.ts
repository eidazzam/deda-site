import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyPluginAsync } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import sharp from 'sharp';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { badRequest, notFound } from '../../lib/errors.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Filenames must survive across filesystems — strip unicode, lowercase,
// collapse non-alphanumerics. Used for the bundle image path.
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// Bundles are created empty from the admin's first screen — just the
// slug + names — and enriched on the edit page with products, prices,
// and the cover image. So prices and productIds default to zero/empty
// here instead of being required up-front.
const createSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  nameEn: z.string().trim().min(1).max(200),
  nameAr: z.string().trim().min(1).max(200),
  descriptionEn: z.string().trim().max(2000).default(''),
  descriptionAr: z.string().trim().max(2000).default(''),
  bundlePrice: z.coerce.number().int().nonnegative().default(0),
  originalPrice: z.coerce.number().int().nonnegative().default(0),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
  productIds: z.array(z.coerce.number().int().positive()).default([]),
});

const updateSchema = z.object({
  slug: z.string().trim().min(1).max(80).optional(),
  nameEn: z.string().trim().min(1).max(200).optional(),
  nameAr: z.string().trim().min(1).max(200).optional(),
  descriptionEn: z.string().trim().max(2000).optional(),
  descriptionAr: z.string().trim().max(2000).optional(),
  bundlePrice: z.coerce.number().int().nonnegative().optional(),
  originalPrice: z.coerce.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
  // When present, REPLACES the entire product list for the bundle.
  productIds: z.array(z.coerce.number().int().positive()).optional(),
});

type BundleListRow = Prisma.BundleGetPayload<{
  include: { products: { select: { productId: true } } };
}>;
type BundleDetailRow = Prisma.BundleGetPayload<{
  include: { products: true };
}>;

// Shape we send back. Keeps the API self-consistent so the admin types
// mirror this on the frontend.
function shapeList(b: BundleListRow) {
  return {
    id: b.id,
    slug: b.slug,
    nameEn: b.nameEn,
    nameAr: b.nameAr,
    bundlePrice: b.bundlePrice,
    originalPrice: b.originalPrice,
    imageUrl: b.imageUrl,
    isActive: b.isActive,
    sortOrder: b.sortOrder,
    productsCount: b.products.length,
    updatedAt: b.updatedAt.toISOString(),
  };
}

function shapeDetail(b: BundleDetailRow) {
  return {
    id: b.id,
    slug: b.slug,
    nameEn: b.nameEn,
    nameAr: b.nameAr,
    descriptionEn: b.descriptionEn,
    descriptionAr: b.descriptionAr,
    bundlePrice: b.bundlePrice,
    originalPrice: b.originalPrice,
    imageUrl: b.imageUrl,
    isActive: b.isActive,
    sortOrder: b.sortOrder,
    productIds: b.products
      .slice()
      .sort((a, c) => a.sortOrder - c.sortOrder)
      .map((p) => p.productId),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

export const adminBundleRoutes: FastifyPluginAsync = async (app) => {
  // GET — all bundles, active + hidden, with a product count for the list view.
  app.get('/bundles', async () => {
    const rows = await prisma.bundle.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: { products: { select: { productId: true } } },
    });
    return { data: rows.map(shapeList) };
  });

  // GET :id — full detail incl. ordered product ids for the edit form.
  app.get<{ Params: { id: string } }>('/bundles/:id', async (req) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw notFound('BUNDLE_NOT_FOUND', 'Bundle not found');
    }
    const bundle = await prisma.bundle.findUnique({
      where: { id },
      include: { products: true },
    });
    if (!bundle) throw notFound('BUNDLE_NOT_FOUND', 'Bundle not found');
    return { data: shapeDetail(bundle) };
  });

  // POST — create bundle row + initial BundleProduct rows.
  app.post('/bundles', async (req, reply) => {
    const body = createSchema.parse(req.body);

    // Verify every product id exists so we fail before the partial write.
    if (body.productIds.length > 0) {
      const found = await prisma.product.count({
        where: { id: { in: body.productIds } },
      });
      if (found !== body.productIds.length) {
        throw badRequest('PRODUCT_NOT_FOUND', 'One or more product ids do not exist');
      }
    }

    const bundle = await prisma.bundle.create({
      data: {
        slug: body.slug,
        nameEn: body.nameEn,
        nameAr: body.nameAr,
        descriptionEn: body.descriptionEn,
        descriptionAr: body.descriptionAr,
        bundlePrice: body.bundlePrice,
        originalPrice: body.originalPrice,
        isActive: body.isActive ?? true,
        sortOrder: body.sortOrder ?? 0,
        products: {
          create: body.productIds.map((productId, idx) => ({
            productId,
            sortOrder: idx,
          })),
        },
      },
      include: { products: true },
    });
    return reply.code(201).send({ data: shapeDetail(bundle) });
  });

  // PATCH :id — partial update; if productIds is present, the list is
  // replaced (delete + insert) so the order matches exactly what the
  // admin submitted.
  app.patch<{ Params: { id: string } }>('/bundles/:id', async (req) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw notFound('BUNDLE_NOT_FOUND', 'Bundle not found');
    }
    const body = updateSchema.parse(req.body);

    if (body.productIds) {
      if (body.productIds.length > 0) {
        const found = await prisma.product.count({
          where: { id: { in: body.productIds } },
        });
        if (found !== body.productIds.length) {
          throw badRequest('PRODUCT_NOT_FOUND', 'One or more product ids do not exist');
        }
      }
    }

    const { productIds, ...scalar } = body;

    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.bundle.update({
        where: { id },
        data: scalar,
      });
      if (productIds) {
        await tx.bundleProduct.deleteMany({ where: { bundleId: id } });
        if (productIds.length > 0) {
          await tx.bundleProduct.createMany({
            data: productIds.map((productId, idx) => ({
              bundleId: id,
              productId,
              sortOrder: idx,
            })),
          });
        }
      }
      return tx.bundle.findUnique({
        where: { id: b.id },
        include: { products: true },
      });
    });
    if (!updated) throw notFound('BUNDLE_NOT_FOUND', 'Bundle not found');
    return { data: shapeDetail(updated) };
  });

  // DELETE :id — drop bundle; BundleProduct rows cascade. Best-effort
  // remove the image file from disk too.
  app.delete<{ Params: { id: string } }>('/bundles/:id', async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw notFound('BUNDLE_NOT_FOUND', 'Bundle not found');
    }
    const bundle = await prisma.bundle.findUnique({ where: { id } });
    if (!bundle) throw notFound('BUNDLE_NOT_FOUND', 'Bundle not found');

    await prisma.bundle.delete({ where: { id } });

    if (bundle.imageUrl && bundle.imageUrl.startsWith('/uploads/')) {
      const rel = bundle.imageUrl.replace(/^\/uploads\//, '');
      const full = path.join(env.UPLOAD_DIR, rel);
      try {
        await unlink(full);
      } catch (err) {
        req.log.warn({ err, path: full }, 'failed to delete bundle image');
      }
    }
    return reply.code(204).send();
  });

  // POST :id/image (multipart) — upsert the bundle cover image. The old
  // file is best-effort removed when a new one replaces it.
  app.post<{ Params: { id: string } }>('/bundles/:id/image', async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw notFound('BUNDLE_NOT_FOUND', 'Bundle not found');
    }
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

    const existing = await prisma.bundle.findUnique({ where: { id } });
    if (!existing) throw notFound('BUNDLE_NOT_FOUND', 'Bundle not found');

    const filename = `${slugify(existing.slug)}-${Date.now()}.webp`;
    const dir = path.join(env.UPLOAD_DIR, 'bundles');
    await mkdir(dir, { recursive: true });
    const fullPath = path.join(dir, filename);

    // Bundles render in a wide 5:4 frame on the homepage — wider than
    // products to fit two-piece styling shots without trimming.
    const processed = await sharp(buf)
      .rotate()
      .resize({ width: 1400, height: 1120, fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .toBuffer();

    await writeFile(fullPath, processed);

    const publicUrl = `/uploads/bundles/${filename}`;
    const updated = await prisma.bundle.update({
      where: { id },
      data: { imageUrl: publicUrl },
      include: { products: true },
    });

    if (existing.imageUrl && existing.imageUrl.startsWith('/uploads/')) {
      const rel = existing.imageUrl.replace(/^\/uploads\//, '');
      const old = path.join(env.UPLOAD_DIR, rel);
      try {
        await unlink(old);
      } catch (err) {
        req.log.warn({ err, path: old }, 'failed to delete previous bundle image');
      }
    }

    return reply.code(201).send({ data: shapeDetail(updated) });
  });

  // DELETE :id/image — clear the cover, fall back to product images.
  app.delete<{ Params: { id: string } }>(
    '/bundles/:id/image',
    async (req, reply) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        throw notFound('BUNDLE_NOT_FOUND', 'Bundle not found');
      }
      const existing = await prisma.bundle.findUnique({ where: { id } });
      if (!existing) throw notFound('BUNDLE_NOT_FOUND', 'Bundle not found');
      if (!existing.imageUrl) {
        throw notFound('IMAGE_NOT_FOUND', 'Bundle has no cover image');
      }
      await prisma.bundle.update({
        where: { id },
        data: { imageUrl: null },
      });
      if (existing.imageUrl.startsWith('/uploads/')) {
        const rel = existing.imageUrl.replace(/^\/uploads\//, '');
        const full = path.join(env.UPLOAD_DIR, rel);
        try {
          await unlink(full);
        } catch (err) {
          req.log.warn({ err, path: full }, 'failed to delete bundle image');
        }
      }
      return reply.code(204).send();
    },
  );
};
