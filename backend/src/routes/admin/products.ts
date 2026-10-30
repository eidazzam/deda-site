import type { FastifyPluginAsync } from 'fastify';
import { Category, ColorGroup, Prisma, SaleStatus } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../lib/errors.js';

const CATEGORIES = Object.values(Category) as [Category, ...Category[]];
const COLOR_GROUPS = Object.values(ColorGroup) as [ColorGroup, ...ColorGroup[]];
const SALE_STATUSES = Object.values(SaleStatus) as [SaleStatus, ...SaleStatus[]];

const variantInputSchema = z.object({
  colorNameEn: z.string().trim().min(1).max(60),
  colorNameAr: z.string().trim().min(1).max(60),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Hex must be #RRGGBB'),
  colorGroup: z.enum(COLOR_GROUPS),
  sizes: z.array(z.string().trim().min(1).max(10)).min(1).max(20),
  status: z.enum(SALE_STATUSES).default(SaleStatus.IN_SALE),
});

const createProductSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, digits and dashes only'),
  nameEn: z.string().trim().min(2).max(120),
  nameAr: z.string().trim().min(2).max(120),
  descriptionEn: z.string().trim().min(2).max(2000),
  descriptionAr: z.string().trim().min(2).max(2000),
  basePrice: z.number().int().nonnegative().max(1_000_000),
  discount: z.number().int().nonnegative().max(1_000_000).nullable().optional(),
  category: z.enum(CATEGORIES),
  status: z.enum(SALE_STATUSES).default(SaleStatus.IN_SALE),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  variants: z.array(variantInputSchema).min(1).max(20),
});

const updateProductSchema = createProductSchema
  .omit({ slug: true, variants: true })
  .partial()
  .extend({
    slug: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
  });

const listQuerySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  status: z.enum([...SALE_STATUSES, 'ALL'] as [string, ...string[]]).default('ALL'),
  search: z.string().trim().min(1).max(80).optional(),
  page: z.coerce.number().int().positive().default(1),
  // 500 upper bound so the bundle-form's product picker can load the
  // whole catalogue in one call. Bumped from 100 which was too tight
  // once we crossed ~100 products.
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

export const adminProductRoutes: FastifyPluginAsync = async (app) => {
  // ---- list (admin view — every status) ----------------------------------
  app.get('/products', async (req) => {
    const q = listQuerySchema.parse(req.query);

    const where: Prisma.ProductWhereInput = {
      ...(q.category ? { category: q.category } : {}),
      ...(q.status !== 'ALL' ? { status: q.status as SaleStatus } : {}),
      ...(q.search
        ? {
            OR: [
              { nameEn: { contains: q.search, mode: 'insensitive' } },
              { nameAr: { contains: q.search } },
              { slug: { contains: q.search.toLowerCase(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const skip = (q.page - 1) * q.limit;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: q.limit,
        include: {
          variants: {
            orderBy: { sortOrder: 'asc' },
            include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } },
          },
          images: { where: { variantId: null }, take: 1, orderBy: { sortOrder: 'asc' } },
          _count: { select: { variants: true, images: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: {
        items: items.map((p) => ({
          id: p.id,
          slug: p.slug,
          nameEn: p.nameEn,
          nameAr: p.nameAr,
          basePrice: p.basePrice,
          discount: p.discount,
          category: p.category,
          status: p.status,
          isFeatured: p.isFeatured,
          isNew: p.isNew,
          isBestSeller: p.isBestSeller,
          sortOrder: p.sortOrder,
          primaryImage:
            p.images[0]?.url ?? p.variants[0]?.images[0]?.url ?? null,
          variantsCount: p._count.variants,
          imagesCount: p._count.images,
          variants: p.variants.map((v) => ({
            id: v.id,
            colorNameEn: v.colorNameEn,
            colorNameAr: v.colorNameAr,
            colorHex: v.colorHex,
            colorGroup: v.colorGroup,
            status: v.status,
          })),
        })),
        pagination: {
          page: q.page,
          limit: q.limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / q.limit)),
        },
      },
    };
  });

  // ---- single product (admin view, includes everything) ------------------
  app.get<{ Params: { id: string } }>('/products/:id', async (req) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw notFound('PRODUCT_NOT_FOUND', 'Product not found');
    }
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: { sortOrder: 'asc' },
          include: { images: { orderBy: { sortOrder: 'asc' } } },
        },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!product) throw notFound('PRODUCT_NOT_FOUND', 'Product not found');
    return { data: product };
  });

  // ---- create -------------------------------------------------------------
  app.post('/products', async (req, reply) => {
    const input = createProductSchema.parse(req.body);

    const existing = await prisma.product.findUnique({ where: { slug: input.slug } });
    if (existing) {
      throw badRequest('SLUG_TAKEN', `Slug "${input.slug}" is already used`);
    }

    const created = await prisma.product.create({
      data: {
        slug: input.slug,
        nameEn: input.nameEn,
        nameAr: input.nameAr,
        descriptionEn: input.descriptionEn,
        descriptionAr: input.descriptionAr,
        basePrice: input.basePrice,
        discount: input.discount ?? null,
        category: input.category,
        status: input.status,
        isFeatured: input.isFeatured,
        isNew: input.isNew,
        isBestSeller: input.isBestSeller,
        sortOrder: input.sortOrder,
        variants: {
          create: input.variants.map((v, idx) => ({
            colorNameEn: v.colorNameEn,
            colorNameAr: v.colorNameAr,
            colorHex: v.colorHex,
            colorGroup: v.colorGroup,
            sizes: v.sizes,
            status: v.status,
            sortOrder: idx,
          })),
        },
      },
      include: { variants: true },
    });

    return reply.code(201).send({ data: created });
  });

  // ---- update -------------------------------------------------------------
  app.patch<{ Params: { id: string } }>('/products/:id', async (req) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw notFound('PRODUCT_NOT_FOUND', 'Product not found');
    }
    const body = updateProductSchema.parse(req.body);

    // Guard against changing slug to one already used by another product
    if (body.slug) {
      const clash = await prisma.product.findFirst({
        where: { slug: body.slug, NOT: { id } },
        select: { id: true },
      });
      if (clash) throw badRequest('SLUG_TAKEN', `Slug "${body.slug}" is already used`);
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(body.slug !== undefined ? { slug: body.slug } : {}),
        ...(body.nameEn !== undefined ? { nameEn: body.nameEn } : {}),
        ...(body.nameAr !== undefined ? { nameAr: body.nameAr } : {}),
        ...(body.descriptionEn !== undefined ? { descriptionEn: body.descriptionEn } : {}),
        ...(body.descriptionAr !== undefined ? { descriptionAr: body.descriptionAr } : {}),
        ...(body.basePrice !== undefined ? { basePrice: body.basePrice } : {}),
        ...(body.discount !== undefined ? { discount: body.discount } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.isFeatured !== undefined ? { isFeatured: body.isFeatured } : {}),
        ...(body.isNew !== undefined ? { isNew: body.isNew } : {}),
        ...(body.isBestSeller !== undefined ? { isBestSeller: body.isBestSeller } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      },
    });
    return { data: updated };
  });

  // ---- delete -------------------------------------------------------------
  // Cascade removes variants, images, and join rows in bundles/orders.
  // Order items reference the product as optional, so old orders survive.
  app.delete<{ Params: { id: string } }>('/products/:id', async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw notFound('PRODUCT_NOT_FOUND', 'Product not found');
    }
    await prisma.product.delete({ where: { id } }).catch(() => {
      throw notFound('PRODUCT_NOT_FOUND', 'Product not found');
    });
    return reply.code(204).send();
  });

  // ---- variants -----------------------------------------------------------
  app.post<{ Params: { id: string } }>('/products/:id/variants', async (req, reply) => {
    const productId = Number(req.params.id);
    if (!Number.isInteger(productId) || productId < 1) {
      throw notFound('PRODUCT_NOT_FOUND', 'Product not found');
    }
    const body = variantInputSchema.parse(req.body);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw notFound('PRODUCT_NOT_FOUND', 'Product not found');

    const dupe = await prisma.variant.findFirst({
      where: { productId, colorNameEn: body.colorNameEn },
    });
    if (dupe) {
      throw badRequest('VARIANT_EXISTS', `Color "${body.colorNameEn}" already exists on this product`);
    }

    const count = await prisma.variant.count({ where: { productId } });
    const variant = await prisma.variant.create({
      data: {
        productId,
        colorNameEn: body.colorNameEn,
        colorNameAr: body.colorNameAr,
        colorHex: body.colorHex,
        colorGroup: body.colorGroup,
        sizes: body.sizes,
        status: body.status,
        sortOrder: count,
      },
    });
    return reply.code(201).send({ data: variant });
  });

  app.patch<{ Params: { variantId: string } }>('/variants/:variantId', async (req) => {
    const id = Number(req.params.variantId);
    if (!Number.isInteger(id) || id < 1) {
      throw notFound('VARIANT_NOT_FOUND', 'Variant not found');
    }
    const body = variantInputSchema.partial().parse(req.body);

    const updated = await prisma.variant.update({
      where: { id },
      data: {
        ...(body.colorNameEn !== undefined ? { colorNameEn: body.colorNameEn } : {}),
        ...(body.colorNameAr !== undefined ? { colorNameAr: body.colorNameAr } : {}),
        ...(body.colorHex !== undefined ? { colorHex: body.colorHex } : {}),
        ...(body.colorGroup !== undefined ? { colorGroup: body.colorGroup } : {}),
        ...(body.sizes !== undefined ? { sizes: body.sizes } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
    });
    return { data: updated };
  });

  // Quick toggle used by the dashboard's IN_SALE / OUT_OF_STOCK badges.
  app.post<{ Params: { variantId: string } }>('/variants/:variantId/toggle', async (req) => {
    const id = Number(req.params.variantId);
    if (!Number.isInteger(id) || id < 1) {
      throw notFound('VARIANT_NOT_FOUND', 'Variant not found');
    }
    const current = await prisma.variant.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!current) throw notFound('VARIANT_NOT_FOUND', 'Variant not found');

    const updated = await prisma.variant.update({
      where: { id },
      data: {
        status:
          current.status === SaleStatus.IN_SALE
            ? SaleStatus.OUT_OF_STOCK
            : SaleStatus.IN_SALE,
      },
      select: { id: true, status: true },
    });
    return { data: updated };
  });

  app.delete<{ Params: { variantId: string } }>('/variants/:variantId', async (req, reply) => {
    const id = Number(req.params.variantId);
    if (!Number.isInteger(id) || id < 1) {
      throw notFound('VARIANT_NOT_FOUND', 'Variant not found');
    }
    await prisma.variant.delete({ where: { id } }).catch(() => {
      throw notFound('VARIANT_NOT_FOUND', 'Variant not found');
    });
    return reply.code(204).send();
  });
};
