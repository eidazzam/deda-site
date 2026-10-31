import type {
  AdminBundleDetail,
  AdminBundleInput,
  AdminBundleListItem,
  AdminCategoryImage,
  AdminCountry,
  AdminCoupon,
  AdminGovernorate,
  AdminHeroSlide,
  AdminLead,
  AdminOrderDetail,
  AdminOrderListItem,
  AdminProductDetail,
  AdminProductListItem,
  AdminSiteConfig,
  AdminStats,
  LeadStatus,
  Pagination,
} from './types';

import { clearAdminSession, getAdminToken } from './auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export class AdminApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

type FetchOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | null | object;
  skipAuth?: boolean;
};

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  // Auto-attach JSON content-type for object bodies; leave FormData alone.
  let body: BodyInit | null | undefined = undefined;
  if (options.body !== undefined && options.body !== null) {
    if (options.body instanceof FormData) {
      body = options.body;
    } else if (typeof options.body === 'object') {
      body = JSON.stringify(options.body);
      headers.set('Content-Type', 'application/json');
    } else {
      body = options.body as BodyInit;
    }
  }

  if (!options.skipAuth) {
    const token = getAdminToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    body,
    cache: 'no-store',
  });

  // Any 401 means the token has expired — wipe it so the layout's auth
  // check pushes the user back to /admin/login on the next render.
  if (res.status === 401 && !options.skipAuth) {
    clearAdminSession();
    if (typeof window !== 'undefined' && window.location.pathname !== '/admin/login') {
      window.location.href = '/admin/login';
    }
  }

  let payload: { data?: T; error?: { code: string; message: string } } = {};
  try {
    if (res.status !== 204) payload = await res.json();
  } catch {
    // Non-JSON body — leave payload empty
  }

  if (!res.ok) {
    throw new AdminApiError(
      payload.error?.code ?? 'UNKNOWN',
      payload.error?.message ?? `Request failed with ${res.status}`,
      res.status,
    );
  }
  return payload.data as T;
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

// ---------------------------------------------------------------------------
export const adminApi = {
  auth: {
    login: (username: string, password: string) =>
      request<{ token: string; username: string; expiresIn: string }>(
        '/api/admin/login',
        { method: 'POST', body: { username, password }, skipAuth: true },
      ),
    me: () => request<{ username: string; role: string }>('/api/admin/me'),
  },

  stats: {
    get: () => request<AdminStats>('/api/admin/stats'),
  },

  orders: {
    list: (params: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
      sort?: 'newest' | 'oldest';
      unreadOnly?: boolean;
    } = {}) =>
      request<{ items: AdminOrderListItem[]; pagination: Pagination }>(
        `/api/admin/orders${qs(params)}`,
      ),
    detail: (id: number) => request<AdminOrderDetail>(`/api/admin/orders/${id}`),
    update: (id: number, body: { status?: string; adminNotes?: string | null }) =>
      request<AdminOrderDetail>(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        body,
      }),
    unreadCount: () => request<{ count: number }>('/api/admin/orders/unread-count'),
    remove: (id: number) =>
      request<void>(`/api/admin/orders/${id}`, { method: 'DELETE' }),
  },

  leads: {
    list: (params: { status?: string; page?: number; limit?: number } = {}) =>
      request<{ items: AdminLead[]; pagination: Pagination }>(
        `/api/admin/leads${qs(params)}`,
      ),
    update: (id: number, body: { status?: LeadStatus; adminNotes?: string | null }) =>
      request<AdminLead>(`/api/admin/leads/${id}`, { method: 'PATCH', body }),
    unreadCount: () => request<{ count: number }>('/api/admin/leads/unread-count'),
  },

  products: {
    list: (params: {
      category?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {}) =>
      request<{ items: AdminProductListItem[]; pagination: Pagination }>(
        `/api/admin/products${qs(params)}`,
      ),
    detail: (id: number) => request<AdminProductDetail>(`/api/admin/products/${id}`),
    create: (body: object) =>
      request<AdminProductDetail>('/api/admin/products', { method: 'POST', body }),
    update: (id: number, body: object) =>
      request<AdminProductDetail>(`/api/admin/products/${id}`, {
        method: 'PATCH',
        body,
      }),
    remove: (id: number) =>
      request<void>(`/api/admin/products/${id}`, { method: 'DELETE' }),

    addVariant: (productId: number, body: object) =>
      request<{ id: number }>(`/api/admin/products/${productId}/variants`, {
        method: 'POST',
        body,
      }),
    updateVariant: (variantId: number, body: object) =>
      request<{ id: number }>(`/api/admin/variants/${variantId}`, {
        method: 'PATCH',
        body,
      }),
    toggleVariant: (variantId: number) =>
      request<{ id: number; status: string }>(
        `/api/admin/variants/${variantId}/toggle`,
        { method: 'POST' },
      ),
    deleteVariant: (variantId: number) =>
      request<void>(`/api/admin/variants/${variantId}`, { method: 'DELETE' }),
  },

  uploads: {
    upload: (file: File, productId: number, variantId?: number) => {
      const form = new FormData();
      form.append('file', file);
      form.append('productId', String(productId));
      if (variantId !== undefined) form.append('variantId', String(variantId));
      return request<{ id: number; url: string }>('/api/admin/uploads', {
        method: 'POST',
        body: form,
      });
    },
    remove: (id: number) =>
      request<void>(`/api/admin/uploads/${id}`, { method: 'DELETE' }),
  },

  coupons: {
    list: () => request<AdminCoupon[]>('/api/admin/coupons'),
    detail: (code: string) =>
      request<AdminCoupon>(`/api/admin/coupons/${encodeURIComponent(code)}`),
    create: (body: object) =>
      request<AdminCoupon>('/api/admin/coupons', { method: 'POST', body }),
    update: (code: string, body: object) =>
      request<AdminCoupon>(`/api/admin/coupons/${encodeURIComponent(code)}`, {
        method: 'PATCH',
        body,
      }),
    remove: (code: string) =>
      request<void>(`/api/admin/coupons/${encodeURIComponent(code)}`, {
        method: 'DELETE',
      }),
  },

  governorates: {
    list: () => request<AdminGovernorate[]>('/api/admin/governorates'),
    update: (id: number, body: object) =>
      request<AdminGovernorate>(`/api/admin/governorates/${id}`, {
        method: 'PATCH',
        body,
      }),
  },

  countries: {
    list: () => request<AdminCountry[]>('/api/admin/countries'),
    update: (id: number, body: object) =>
      request<AdminCountry>(`/api/admin/countries/${id}`, {
        method: 'PATCH',
        body,
      }),
  },

  bundles: {
    list: () => request<AdminBundleListItem[]>('/api/admin/bundles'),
    detail: (id: number) => request<AdminBundleDetail>(`/api/admin/bundles/${id}`),
    create: (body: AdminBundleInput) =>
      request<AdminBundleDetail>('/api/admin/bundles', { method: 'POST', body }),
    update: (id: number, body: Partial<AdminBundleInput>) =>
      request<AdminBundleDetail>(`/api/admin/bundles/${id}`, {
        method: 'PATCH',
        body,
      }),
    remove: (id: number) =>
      request<void>(`/api/admin/bundles/${id}`, { method: 'DELETE' }),
    uploadImage: (id: number, file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request<AdminBundleDetail>(`/api/admin/bundles/${id}/image`, {
        method: 'POST',
        body: form,
      });
    },
    removeImage: (id: number) =>
      request<void>(`/api/admin/bundles/${id}/image`, { method: 'DELETE' }),
  },

  categoryImages: {
    list: () => request<AdminCategoryImage[]>('/api/admin/category-images'),
    upload: (file: File, category: string) => {
      const form = new FormData();
      form.append('file', file);
      form.append('category', category);
      return request<AdminCategoryImage>('/api/admin/category-images', {
        method: 'POST',
        body: form,
      });
    },
    remove: (category: string) =>
      request<void>(`/api/admin/category-images/${encodeURIComponent(category)}`, {
        method: 'DELETE',
      }),
  },

  heroSlides: {
    list: () => request<AdminHeroSlide[]>('/api/admin/hero-slides'),
    create: (
      file: File,
      fields: {
        altEn?: string;
        altAr?: string;
        sortOrder?: number;
        isActive?: boolean;
      } = {},
    ) => {
      const form = new FormData();
      form.append('file', file);
      if (fields.altEn) form.append('altEn', fields.altEn);
      if (fields.altAr) form.append('altAr', fields.altAr);
      if (fields.sortOrder !== undefined) form.append('sortOrder', String(fields.sortOrder));
      if (fields.isActive !== undefined) form.append('isActive', String(fields.isActive));
      return request<AdminHeroSlide>('/api/admin/hero-slides', {
        method: 'POST',
        body: form,
      });
    },
    update: (
      id: number,
      body: {
        altEn?: string | null;
        altAr?: string | null;
        sortOrder?: number;
        isActive?: boolean;
      },
    ) =>
      request<AdminHeroSlide>(`/api/admin/hero-slides/${id}`, {
        method: 'PATCH',
        body,
      }),
    remove: (id: number) =>
      request<void>(`/api/admin/hero-slides/${id}`, { method: 'DELETE' }),
  },

  siteConfig: {
    get: () => request<AdminSiteConfig>('/api/admin/site-config'),
    update: (body: {
      whatsappNumber?: string | null;
      facebookUrl?: string | null;
      instagramUrl?: string | null;
      tiktokUrl?: string | null;
      editorialEyebrowEn?: string | null;
      editorialEyebrowAr?: string | null;
      editorialHeadlineEn?: string | null;
      editorialHeadlineAr?: string | null;
      editorialBodyEn?: string | null;
      editorialBodyAr?: string | null;
    }) =>
      request<AdminSiteConfig>('/api/admin/site-config', {
        method: 'PATCH',
        body,
      }),
    uploadEditorialImage: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request<AdminSiteConfig>(
        '/api/admin/site-config/editorial-image',
        { method: 'POST', body: form },
      );
    },
    removeEditorialImage: () =>
      request<void>('/api/admin/site-config/editorial-image', { method: 'DELETE' }),
    uploadHeroImage: (slot: 1 | 2 | 3 | 4, file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request<AdminSiteConfig>(
        `/api/admin/site-config/hero-image/${slot}`,
        { method: 'POST', body: form },
      );
    },
    removeHeroImage: (slot: 1 | 2 | 3 | 4) =>
      request<void>(`/api/admin/site-config/hero-image/${slot}`, {
        method: 'DELETE',
      }),
  },
};
