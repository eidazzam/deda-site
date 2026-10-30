'use client';

import { useRouter } from 'next/navigation';

import { BundleForm } from '@/components/admin/bundle-form';
import { useAdminI18n } from '@/lib/admin/i18n';

export default function NewBundlePage() {
  const { t } = useAdminI18n();
  const router = useRouter();

  return (
    <div className="px-8 py-10 max-w-3xl">
      <div className="mb-8">
        <div className="text-[10px] tracking-widest uppercase text-muted mb-2">
          {t('common.admin')} · {t('bundles.title')}
        </div>
        <h1 className="font-display text-4xl">{t('bundles.newBundle')}</h1>
        <p className="text-sm text-muted mt-2">{t('bundles.newBundleSubtitle')}</p>
      </div>

      <BundleForm
        mode="create"
        onSaved={(b) => router.push(`/admin/bundles/${b.id}`)}
      />
    </div>
  );
}
