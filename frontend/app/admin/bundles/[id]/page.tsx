'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { BundleForm } from '@/components/admin/bundle-form';
import { adminApi, AdminApiError } from '@/lib/admin/api';
import { useAdminI18n } from '@/lib/admin/i18n';
import type { AdminBundleDetail } from '@/lib/admin/types';

export const runtime = 'edge';

export default function EditBundlePage() {
  const { t } = useAdminI18n();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [bundle, setBundle] = useState<AdminBundleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminApi.bundles.detail(id);
        if (cancelled) return;
        setBundle(data);
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
  }, [id]);

  return (
    <div className="px-8 py-10 max-w-3xl">
      <div className="mb-8">
        <div className="text-[10px] tracking-widest uppercase text-muted mb-2">
          <Link href="/admin/bundles" className="hover:text-accent">
            {t('common.admin')} · {t('bundles.title')}
          </Link>
        </div>
        <h1 className="font-display text-4xl">
          {bundle ? bundle.nameEn : loading ? t('common.loading') : ''}
        </h1>
      </div>

      {loading ? (
        <div className="text-muted text-sm">{t('common.loading')}</div>
      ) : error || !bundle ? (
        <div className="text-accent text-sm">{error ?? t('common.failedToLoad')}</div>
      ) : (
        <BundleForm
          mode="edit"
          initial={bundle}
          onSaved={(b) => setBundle(b)}
        />
      )}
    </div>
  );
}
