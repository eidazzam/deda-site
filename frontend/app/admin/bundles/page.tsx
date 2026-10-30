'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { adminApi, AdminApiError } from '@/lib/admin/api';
import { useAdminI18n } from '@/lib/admin/i18n';
import type { AdminBundleListItem } from '@/lib/admin/types';
import { formatPrice } from '@/lib/format';
import { resolveImageUrl } from '@/lib/image';

/**
 * List view for homepage bundles ("إطلالات"). Lets the admin add a new
 * bundle, jump into one to edit, or delete an existing one inline.
 */
export default function AdminBundlesPage() {
  const { t } = useAdminI18n();
  const [bundles, setBundles] = useState<AdminBundleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const data = await adminApi.bundles.list();
      setBundles(data);
      setLoading(false);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Failed to load');
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const onDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await adminApi.bundles.remove(id);
      toast.success('Deleted');
      void refresh();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="px-8 py-10 max-w-5xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="text-[10px] tracking-widest uppercase text-muted mb-2">
            {t('common.admin')}
          </div>
          <h1 className="font-display text-4xl">{t('bundles.title')}</h1>
          <p className="text-sm text-muted mt-2">{t('bundles.subtitle')}</p>
        </div>
        <Link
          href="/admin/bundles/new"
          className="bg-ink text-bg text-sm tracking-widest uppercase px-5 py-3 hover:bg-accent transition-colors"
        >
          {t('bundles.addNew')}
        </Link>
      </div>

      {loading ? (
        <div className="text-muted text-sm">{t('common.loading')}</div>
      ) : error ? (
        <div className="text-accent text-sm">{error}</div>
      ) : bundles.length === 0 ? (
        <div className="text-muted text-sm">{t('bundles.empty')}</div>
      ) : (
        <ul className="divide-y divide-border border-t border-b border-border">
          {bundles.map((b) => (
            <li
              key={b.id}
              className="py-4 grid grid-cols-[80px_1fr_auto] gap-4 items-center"
            >
              <div className="relative w-20 aspect-[5/4] bg-subtle overflow-hidden">
                {b.imageUrl ? (
                  <Image
                    src={resolveImageUrl(b.imageUrl)}
                    alt={b.nameEn}
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-[9px] tracking-widest uppercase text-muted">
                    No image
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <Link
                    href={`/admin/bundles/${b.id}`}
                    className="font-display text-lg hover:text-accent"
                  >
                    {b.nameEn}
                  </Link>
                  <span className="text-sm text-muted" dir="rtl">
                    {b.nameAr}
                  </span>
                  {!b.isActive ? (
                    <span className="text-[10px] tracking-widest uppercase bg-subtle text-muted px-2 py-0.5">
                      {t('bundles.hidden')}
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-muted mt-1 flex items-center gap-3 flex-wrap">
                  <span>{b.productsCount} {t('bundles.products')}</span>
                  <span>·</span>
                  <span>
                    {formatPrice(b.bundlePrice, 'en')} EGP{' '}
                    <span className="line-through opacity-60 ml-1">
                      {formatPrice(b.originalPrice, 'en')}
                    </span>
                  </span>
                  <span>·</span>
                  <span>Sort {b.sortOrder}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/bundles/${b.id}`}
                  className="border border-border text-xs tracking-widest uppercase px-3 py-2 hover:border-accent hover:text-accent transition-colors"
                >
                  {t('common.edit')}
                </Link>
                <button
                  type="button"
                  onClick={() => onDelete(b.id, b.nameEn)}
                  className="border border-border text-xs tracking-widest uppercase px-3 py-2 hover:border-accent hover:text-accent transition-colors"
                >
                  {t('common.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
