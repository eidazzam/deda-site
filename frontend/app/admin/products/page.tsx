'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { adminApi, AdminApiError } from '@/lib/admin/api';
import { useAdminI18n } from '@/lib/admin/i18n';
import type { AdminProductListItem, Pagination } from '@/lib/admin/types';
import { formatPrice } from '@/lib/format';

const CATEGORIES = [
  'ALL',
  'COLOURED',
  'BLACK',
  'SNAP',
  'EMBROIDERED',
  'OVERHEAD',
  'KIDS',
  'EVERYDAY',
  'READY',
  'WINTER',
] as const;
type Category = (typeof CATEGORIES)[number];

export default function AdminProductsPage() {
  const { t } = useAdminI18n();
  const [category, setCategory] = useState<Category>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminProductListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await adminApi.products.list({
          category: category === 'ALL' ? undefined : category,
          search: debouncedSearch || undefined,
          page,
          limit: 30,
        });
        if (cancelled) return;
        setItems(res.items);
        setPagination(res.pagination);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof AdminApiError ? err.message : 'Failed to load');
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category, debouncedSearch, page]);

  const toggleVariant = async (variantId: number, productId: number) => {
    try {
      const res = await adminApi.products.toggleVariant(variantId);
      setItems((curr) =>
        curr.map((p) =>
          p.id !== productId
            ? p
            : {
                ...p,
                variants: p.variants.map((v) =>
                  v.id === variantId
                    ? { ...v, status: res.status as 'IN_SALE' | 'OUT_OF_STOCK' }
                    : v,
                ),
              },
        ),
      );
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Toggle failed');
    }
  };

  return (
    <div className="px-8 py-10">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-[10px] tracking-widest uppercase text-muted mb-2">
            {t('common.admin')}
          </div>
          <h1 className="font-display text-4xl">{t('products.title')}</h1>
        </div>
        <Link
          href="/admin/products/new"
          className="bg-ink text-bg text-[10px] tracking-widest uppercase px-4 py-2.5 hover:bg-accent transition-colors"
        >
          + New product
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 items-center mb-6">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name or slug…"
          className="flex-1 min-w-[200px] bg-bg border border-border px-3 py-2 text-sm focus:border-ink outline-none"
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as Category);
            setPage(1);
          }}
          className="bg-bg border border-border px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === 'ALL' ? 'All categories' : c.toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {error ? <div className="text-accent text-sm mb-4">{error}</div> : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center text-muted py-20">Loading…</div>
        ) : items.length === 0 ? (
          <div className="col-span-2 text-center text-muted py-20">
            No products match these filters.
          </div>
        ) : (
          items.map((p) => (
            <div key={p.id} className="border border-border bg-bg p-4 flex gap-4">
              {p.primaryImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.primaryImage}
                  alt={p.nameEn}
                  className="w-24 h-32 object-cover bg-subtle flex-shrink-0"
                />
              ) : (
                <div className="w-24 h-32 bg-subtle flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="font-medium hover:text-accent block truncate"
                    >
                      {p.nameEn}
                    </Link>
                    <div className="text-xs text-muted mt-1 truncate">
                      {p.slug} · {p.category.toLowerCase()}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    {p.discount !== null && p.discount < p.basePrice ? (
                      <>
                        <div className="text-accent font-medium">
                          {formatPrice(p.discount, 'en')} KWD
                        </div>
                        <div className="text-xs text-muted line-through">
                          {formatPrice(p.basePrice, 'en')}
                        </div>
                      </>
                    ) : (
                      <div className="font-medium">{formatPrice(p.basePrice, 'en')} KWD</div>
                    )}
                  </div>
                </div>

                {/* Variant toggle row */}
                {p.variants.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {p.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => toggleVariant(v.id, p.id)}
                        title={`${v.colorNameEn} — click to toggle`}
                        className={`inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase border px-2 py-1 transition-colors ${
                          v.status === 'IN_SALE'
                            ? 'border-border bg-bg hover:border-ink'
                            : 'border-accent/40 bg-accent/10 text-accent'
                        }`}
                      >
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: v.colorHex }}
                        />
                        <span>{v.colorNameEn}</span>
                        <span className="text-muted">
                          {v.status === 'IN_SALE' ? 'in sale' : 'sold out'}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="flex items-center gap-4 mt-3 text-[10px] tracking-widest uppercase">
                  {p.isFeatured ? <span className="text-accent">Featured</span> : null}
                  {p.isNew ? <span className="text-accent">New</span> : null}
                  {p.status === 'OUT_OF_STOCK' ? (
                    <span className="text-red-600">Hidden</span>
                  ) : null}
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="ml-auto text-muted hover:text-accent"
                  >
                    Edit →
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {pagination && pagination.totalPages > 1 ? (
        <nav className="mt-6 flex items-center justify-center gap-1 text-sm">
          {Array.from({ length: pagination.totalPages }).map((_, i) => {
            const pn = i + 1;
            return (
              <button
                key={pn}
                onClick={() => setPage(pn)}
                className={`min-w-9 h-9 grid place-items-center ${
                  pn === pagination.page ? 'bg-ink text-bg' : 'text-muted hover:text-ink'
                }`}
              >
                {pn}
              </button>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
