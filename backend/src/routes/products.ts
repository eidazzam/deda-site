import type { FastifyPluginAsync } from 'fastify';
import { Category, ColorGroup, Prisma, SaleStatus } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';

const COLOR_GROUPS = Object.values(ColorGroup) as [ColorGroup, ...ColorGroup[]];
const CATEGORIES = Object.values(Category) as [Category, ...Category[]];

const listQuerySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  // Comma-separated list of ColorGroup values, e.g. "BLACK,WHITE"
  color: z.string().optional(),
  // Comma-separated list of size labels, e.g. "54,56". Matches any variant
  // whose sizes array includes one of the requested sizes.
  size: z.string().optional(),
  search: z.string().trim().min(1).max(80).optional(),
  isFeatured: z.coerce.boolean().optional(),
  isNew: z.coerce.boolean().optional(),
  isBestSeller: z.coerce.boolean().optional(),
  // Storefront defaults to in-sale only. Admin uses ?status=ALL.
  status: z.enum(['IN_SALE', 'OUT_OF_STOCK', 'ALL']).default('IN_SALE'),
  sort: z.enum(['newest', 'oldest', 'price-asc', 'price-desc']).default('newest'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});

// Public catalog reads change rarely on a given day, so a short
// stale-while-revalidate window cuts most repeat traffic at the
// Cloudflare edge without going stale by more than a few minutes.
const CATALOG_CACHE = 'public, max-age=60, s-maxage=120, stale-while-revalidate=600';

export const productRoutes: FastifyPluginAsync = async (app) => {
  // -------------------------------------------------------------------------
  // GET /api/products
  // -------------------------------------------------------------------------
  app.get('/products', async (req, reply) => {
    reply.header('Cache-Control', CATALOG_CACHE);
    const q = listQuerySchema.parse(req.query);

    const colorGroups = q.color
      ? q.color
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter((s): s is ColorGroup => (COLOR_GROUPS as string[]).includes(s))
      : [];

    const sizes = q.size
      ? q.size
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];

    // When both colour and size filters are active, a single variant must
    // satisfy both — combine them under one `variants.some` so we don't
    // surface a product where one variant has the colour and a different
    // one has the size.
    const variantFilters: Prisma.VariantWhereInput[] = [];
    if (colorGroups.length > 0) {
      variantFilters.push({ colorGroup: { in: colorGroups } });
    }
    if (sizes.length > 0) {
      variantFilters.push({ sizes: { hasSome: sizes } });
    }

    const where: Prisma.ProductWhereInput = {
      ...(q.category ? { category: q.category } : {}),
      ...(q.status !== 'ALL' ? { status: q.status as SaleStatus } : {}),
      ...(q.isFeatured ? { isFeatured: true } : {}),
      ...(q.isNew ? { isNew: true } : {}),
      ...(q.isBestSeller ? { isBestSeller: true } : {}),
      ...(q.search
        ? {
            OR: [
              { nameEn: { contains: q.search, mode: 'insensitive' } },
              { nameAr: { contains: q.search } },
              { slug: { contains: q.search.toLowerCase(), mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(variantFilters.length > 0
        ? { variants: { some: { AND: variantFilters } } }
        : {}),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      q.sort === 'price-asc'
        ? { basePrice: 'asc' }
        : q.sort === 'price-desc'
          ? { basePrice: 'desc' }
          : q.sort === 'oldest'
            ? { createdAt: 'asc' }
            : { createdAt: 'desc' };

    const skip = (q.page - 1) * q.limit;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: q.limit,
        include: {
          variants: {
            orderBy: { sortOrder: 'asc' },
            include: {
              images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            },
          },
          images: {
            where: { variantId: null },
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: {
        items: items.map(toProductCard),
        pagination: {
          page: q.page,
          limit: q.limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / q.limit)),
        },
      },
    };
  });

  // -------------------------------------------------------------------------
  // GET /api/products/slugs
  // Lightweight endpoint used by the sitemap — returns just (slug, updatedAt)
  // for every IN_SALE product so the crawler list scales without us paying
  // for image/variant joins. Cached aggressively at the edge.
  // -------------------------------------------------------------------------
  app.get('/products/slugs', async (_req, reply) => {
    reply.header(
      'Cache-Control',
      'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
    );
    const items = await prisma.product.findMany({
      where: { status: 'IN_SALE' },
      select: { slug: true, updatedAt: true },
      orderBy: { sortOrder: 'asc' },
    });
    return { data: items };
  });

  // -------------------------------------------------------------------------
  // GET /api/products/:slug
  // -------------------------------------------------------------------------
  app.get<{ Params: { slug: string } }>('/products/:slug', async (req, reply) => {
    reply.header('Cache-Control', CATALOG_CACHE);
    const slug = req.params.slug.toLowerCase();
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        variants: {
          orderBy: { sortOrder: 'asc' },
          include: { images: { orderBy: { sortOrder: 'asc' } } },
        },
        images: {
          where: { variantId: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!product) {
      throw notFound('PRODUCT_NOT_FOUND', 'Product not found');
    }

    return { data: toProductDetail(product) };
  });
};

// ---------------------------------------------------------------------------
// Shape mappers — keep DB columns we don't want to expose out of the payload
// ---------------------------------------------------------------------------

type WithVariantsAndImages = Prisma.ProductGetPayload<{
  include: {
    variants: { include: { images: true } };
    images: true;
  };
}>;

function toProductCard(p: WithVariantsAndImages) {
  const firstVariantImage = p.variants[0]?.images[0]?.url;
  const primaryImage = p.images[0]?.url ?? firstVariantImage ?? null;
  return {
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
    primaryImage,
    colors: p.variants.map((v) => ({
      colorNameEn: v.colorNameEn,
      colorNameAr: v.colorNameAr,
      colorHex: v.colorHex,
      colorGroup: v.colorGroup,
      status: v.status,
    })),
  };
}

function toProductDetail(p: WithVariantsAndImages) {
  return {
    id: p.id,
    slug: p.slug,
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    descriptionEn: p.descriptionEn,
    descriptionAr: p.descriptionAr,
    basePrice: p.basePrice,
    discount: p.discount,
    category: p.category,
    status: p.status,
    isFeatured: p.isFeatured,
    isNew: p.isNew,
    isBestSeller: p.isBestSeller,
    images: p.images.map((img) => ({ url: img.url, alt: img.alt })),
    variants: p.variants.map((v) => ({
      colorNameEn: v.colorNameEn,
      colorNameAr: v.colorNameAr,
      colorHex: v.colorHex,
      colorGroup: v.colorGroup,
      status: v.status,
      sizes: v.sizes,
      images: v.images.map((img) => ({ url: img.url, alt: img.alt })),
    })),
  };
}
