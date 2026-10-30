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
  OrderStatusSnapshot,
  Pagination,
  ProductCard,
  ProductDetail,
  SiteConfig,
} from './types';
import {
  mockCreateOrder,
  mockGetProductBySlug,
  mockListBundles,
  mockListCategoryImages,
  mockListCountries,
  mockListGovernorates,
  mockListHeroSlides,
  mockListProducts,
  mockNotifyOutOfStock,
  mockSiteConfig,
  mockValidateCoupon,
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

  countries: {
    list: async (opts?: FetchOptions) => {
      if (USE_MOCK) return mockListCountries();
      return request<Country[]>('/api/countries', opts);
    },
  },

  bundles: {
    list: async (opts?: FetchOptions) => {
      if (USE_MOCK) return mockListBundles();
      return request<Bundle[]>('/api/bundles', opts);
    },
  },

  heroSlides: {
    list: async (opts?: FetchOptions) => {
      if (USE_MOCK) return mockListHeroSlides();
      return request<HeroSlide[]>('/api/hero-slides', opts);
    },
  },

  categoryImages: {
    list: async (opts?: FetchOptions) => {
      if (USE_MOCK) return mockListCategoryImages();
      return request<CategoryImage[]>('/api/category-images', opts);
    },
  },

  coupons: {
    validate: async (code: string, subtotal: number) => {
      if (USE_MOCK) return mockValidateCoupon(code, subtotal);
      return request<CouponValidation>('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code, subtotal }),
        cache: 'no-store',
      });
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

    // Polled by /checkout/return after a Tap redirect to detect when the
    // webhook has flipped the payment status.
    status: async (orderId: number) => {
      if (USE_MOCK) {
        // In mock mode the order never goes through Tap, so just claim
        // success — the success page renders the cart's last snapshot.
        return {
          id: orderId,
          orderNumber: `RZ-MOCK-${orderId}`,
          status: 'PENDING' as const,
          paymentMethod: 'COD' as const,
          paymentStatus: null,
          total: 0,
        };
      }
      return request<OrderStatusSnapshot>(`/api/orders/${orderId}/status`, {
        cache: 'no-store',
      });
    },
  },

  checkout: {
    // Asks the API to create a Tap charge for an order that was just
    // submitted with paymentMethod=TAP. Returns the hosted-page URL the
    // storefront sends the customer to.
    initTap: async (orderId: number, locale: 'ar' | 'en') => {
      if (USE_MOCK) {
        // Mock mode pretends the redirect happens but stays on-site.
        return { redirectUrl: `/${locale}/checkout/return?o=${orderId}&mock=1` };
      }
      return request<{ redirectUrl: string }>('/api/checkout/tap/init', {
        method: 'POST',
        body: JSON.stringify({ orderId, locale }),
        cache: 'no-store',
      });
    },

    // Backend-driven mock simulator — only works when the API is started
    // with TAP_MOCK_MODE=true. Flips Payment + Order.paymentStatus to
    // the chosen outcome so the rest of the flow runs as if a real Tap
    // webhook had landed.
    mockSimulate: async (
      orderId: number,
      outcome: 'CAPTURED' | 'FAILED' | 'CANCELLED',
      method: 'KNET' | 'CARD' | 'APPLE_PAY' = 'KNET',
    ) => {
      return request<{ ok: true; status: string }>(
        '/api/checkout/tap/mock-simulate',
        {
          method: 'POST',
          body: JSON.stringify({ orderId, outcome, method }),
          cache: 'no-store',
        },
      );
    },
  },

  leads: {
    notifyOutOfStock: async (input: LeadInput) => {
      if (USE_MOCK) return mockNotifyOutOfStock();
      return request<{ ok: true }>('/api/leads/out-of-stock', {
        method: 'POST',
        body: JSON.stringify(input),
        cache: 'no-store',
      });
    },
  },

  siteConfig: {
    get: async (opts?: FetchOptions) => {
      if (USE_MOCK) return mockSiteConfig();
      return request<SiteConfig>('/api/site-config', opts);
    },
  },
};
