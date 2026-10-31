import type {
  Bundle,
  CategoryImage,
  CouponValidation,
  CreateOrderInput,
  CreatedOrder,
  Country,
  Governorate,
  HeroSlide,
  LeadInput,
  Pagination,
  ProductCard,
  ProductDetail,
  SiteConfig,
} from './types';
import {
  mockCreateOrder,
  mockGetProductBySlug,
  mockListGovernorates,
  mockListProducts,
  mockSiteConfig,
} from './mock';

// Cloudflare Pages edge functions don't have access to the Docker-internal
// NEXT_INTERNAL_API_URL the VPS web container uses, and an empty/relative
// base URL there resolves back to dedawomenswear.shop itself (404 → silent fall-
// through to ComingSoon). Use the explicit public URL on both sides so
// SSR on the edge hits api.dedawomenswear.shop directly. Fallback to the literal
// production URL so a missed env var never silently breaks the listing.
const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof process !== 'undefined' && process.env?.NEXT_INTERNAL_API_URL) ||
  'https://api.dedawomenswear.shop';

// Mock mode — set NEXT_PUBLIC_USE_MOCK=true on Cloudflare Pages to render
// the storefront from `mock.ts` without a backend. The flag is inlined by
// Next at build time, so flipping it requires a redeploy. Keep this check
// cheap; it runs on every api method call.
const USE_MOCK =
  (process.env.NEXT_PUBLIC_USE_MOCK ?? '').toLowerCase() === 'true';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type FetchOptions = RequestInit & {
  // ISR-friendly caching for server components. Default is no cache so
  // routes that read order data don't end up frozen.
  next?: { revalidate?: number | false; tags?: string[] };
};

async function request<T>(path: string, options?: FetchOptions): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  let body: { data?: T; error?: { code: string; message: string } } = {};
  try {
    body = await res.json();
  } catch {
    // Empty 204 responses are fine — keep body as {}
  }

  if (!res.ok) {
    throw new ApiError(
      body.error?.code ?? 'UNKNOWN',
      body.error?.message ?? `Request failed with ${res.status}`,
      res.status,
    );
  }
  return body.data as T;
}

// ---------------------------------------------------------------------------
// Public storefront calls
// ---------------------------------------------------------------------------

export type ProductsListResponse = {
  items: ProductCard[];
  pagination: Pagination;
};

export type ProductsQuery = {
  category?: string;
  color?: string;
  /** Comma-separated list of size labels, e.g. "54,56". */
  size?: string;
  search?: string;
  isFeatured?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  sort?: 'newest' | 'oldest' | 'price-asc' | 'price-desc';
  page?: number;
  limit?: number;
};

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  products: {
    list: async (q: ProductsQuery = {}, opts?: FetchOptions) => {
      if (USE_MOCK) return mockListProducts(q);
      return request<ProductsListResponse>(`/api/products${buildQuery(q)}`, opts);
    },

    bySlug: async (slug: string, opts?: FetchOptions) => {
      if (USE_MOCK) return mockGetProductBySlug(slug);
      return request<ProductDetail>(`/api/products/${encodeURIComponent(slug)}`, opts);
    },

    // Slim slug list for the sitemap — no images, no variants, every
    // in-sale product in a single round-trip.
    slugs: async (opts?: FetchOptions) => {
      if (USE_MOCK) {
        const res = await mockListProducts({ limit: 999 });
        return res.items.map((p) => ({ slug: p.slug, updatedAt: new Date().toISOString() }));
      }
      return request<{ slug: string; updatedAt: string }[]>('/api/products/slugs', opts);
    },
  },

  governorates: {
    list: async (opts?: FetchOptions) => {
      if (USE_MOCK) return mockListGovernorates();
      return request<Governorate[]>('/api/governorates', opts);
    },
  },

  // International countries, bundles, hero-slide CMS, category-image CMS,
  // and coupon validation were retired alongside their backend tables.
  // The methods below are kept as empty stubs so existing callers (cart
  // drawer, checkout, product pages) keep compiling until each one is
  // trimmed to the Deda-only shape (Egypt-only shipping, no coupons).
  countries: {
    list: async (_opts?: FetchOptions): Promise<Country[]> => [],
  },

  bundles: {
    list: async (_opts?: FetchOptions): Promise<Bundle[]> => [],
  },

  heroSlides: {
    list: async (_opts?: FetchOptions): Promise<HeroSlide[]> => [],
  },

  categoryImages: {
    list: async (_opts?: FetchOptions): Promise<CategoryImage[]> => [],
  },

  coupons: {
    validate: async (_code: string, _subtotal: number): Promise<CouponValidation> => {
      throw new ApiError('COUPONS_RETIRED', 'Coupons are not supported', 400);
    },
  },

  orders: {
    create: async (input: CreateOrderInput) => {
      if (USE_MOCK) return mockCreateOrder(input);
      return request<CreatedOrder>('/api/orders', {
        method: 'POST',
        body: JSON.stringify(input),
        cache: 'no-store',
      });
    },

  },

  leads: {
    notifyOutOfStock: async (_input: LeadInput): Promise<{ ok: true }> => {
      // Back-in-stock leads were retired alongside the Lead table.
      return { ok: true };
    },
  },

  siteConfig: {
    get: async (opts?: FetchOptions) => {
      if (USE_MOCK) return mockSiteConfig();
      return request<SiteConfig>('/api/site-config', opts);
    },
  },
};
