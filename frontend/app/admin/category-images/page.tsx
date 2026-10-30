'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { adminApi, AdminApiError } from '@/lib/admin/api';
import { useAdminI18n } from '@/lib/admin/i18n';
import type { AdminCategoryImage } from '@/lib/admin/types';
import { resolveImageUrl } from '@/lib/image';

// The six category cards shown on the homepage, in display order. Names,
// slugs and routes all live in code — this page just lets the admin
// override the cover image per slot.
type CardSlot = {
  category:
    | 'COLOURED'
    | 'BLACK'
    | 'SNAP'
    | 'EMBROIDERED'
    | 'OVERHEAD'
    | 'KIDS'
    | 'EVERYDAY'
    | 'READY'
    | 'WINTER';
  labelEn: string;
  labelAr: string;
  fallbackUrl: string;
};

const CARD_SLOTS: CardSlot[] = [
  {
    category: 'COLOURED',
    labelEn: 'Coloured',
    labelAr: 'ملوّنة',
    fallbackUrl:
      'https://images.unsplash.com/photo-1570203543523-57e9dc7ff410?w=800&h=1000&fit=crop&q=85&auto=format',
  },
  {
    category: 'BLACK',
    labelEn: 'Black',
    labelAr: 'سوداء',
    fallbackUrl:
      'https://images.unsplash.com/photo-1613005798967-632017e477c8?w=800&h=1000&fit=crop&q=85&auto=format',
  },
  {
    category: 'SNAP',
    labelEn: 'Snap',
    labelAr: 'شك',
    fallbackUrl:
      'https://images.unsplash.com/photo-1522219406764-db207f1f7640?w=800&h=1000&fit=crop&q=85&auto=format',
  },
  {
    category: 'EMBROIDERED',
    labelEn: 'Embroidered',
    labelAr: 'تطريز',
    fallbackUrl:
      'https://images.unsplash.com/photo-1760083545495-b297b1690672?w=800&h=1000&fit=crop&q=85&auto=format',
  },
  {
    category: 'OVERHEAD',
    labelEn: 'Overhead',
    labelAr: 'راس',
    fallbackUrl:
      'https://images.unsplash.com/photo-1569245087840-dcf487ddbad5?w=800&h=1000&fit=crop&q=85&auto=format',
  },
  {
    category: 'KIDS',
    labelEn: 'Kids',
    labelAr: 'أطفال',
    fallbackUrl:
      'https://images.unsplash.com/photo-1767780441121-d27bfc6c8f0e?w=800&h=1000&fit=crop&q=85&auto=format',
  },
  {
    category: 'EVERYDAY',
    labelEn: 'Everyday',
    labelAr: 'عملية',
    fallbackUrl:
      'https://images.unsplash.com/photo-1583846783214-7229a91b20ed?w=800&h=1000&fit=crop&q=85&auto=format',
  },
  {
    category: 'READY',
    labelEn: 'Ready · Same-day delivery',
    labelAr: 'جاهزة · توصيل فى نفس اليوم',
    fallbackUrl:
      'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&h=1000&fit=crop&q=85&auto=format',
  },
  {
    category: 'WINTER',
    labelEn: 'Winter',
    labelAr: 'شتوية',
    fallbackUrl:
      'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&h=1000&fit=crop&q=85&auto=format',
  },
];

export default function AdminCategoryImagesPage() {
  const { t } = useAdminI18n();
  const [overrides, setOverrides] = useState<Map<string, AdminCategoryImage>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const data = await adminApi.categoryImages.list();
      setOverrides(new Map(data.map((d) => [d.category, d])));
      setLoading(false);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Failed to load');
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="px-8 py-10 max-w-5xl">
      <div className="mb-8">
        <div className="text-[10px] tracking-widest uppercase text-muted mb-2">
          {t('common.admin')}
        </div>
        <h1 className="font-display text-4xl">{t('categories.title')}</h1>
        <p className="text-sm text-muted mt-2">{t('categories.subtitle')}</p>
      </div>

      {loading ? (
        <div className="text-muted text-sm">Loading…</div>
      ) : error ? (
        <div className="text-accent text-sm">{error}</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CARD_SLOTS.map((slot) => (
            <SlotCard
              key={slot.category}
              slot={slot}
              override={overrides.get(slot.category)}
              onChanged={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single category card — preview + upload + reset.
// ---------------------------------------------------------------------------
function SlotCard({
  slot,
  override,
  onChanged,
}: {
  slot: CardSlot;
  override: AdminCategoryImage | undefined;
  onChanged: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const previewUrl = override ? resolveImageUrl(override.url) : slot.fallbackUrl;
  const isCustom = Boolean(override);

  const triggerPicker = () => fileInputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await adminApi.categoryImages.upload(file, slot.category);
      toast.success(`${slot.labelEn} updated`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onReset = async () => {
    if (!override) return;
    if (!window.confirm(`Reset ${slot.labelEn} to the default image?`)) return;
    setResetting(true);
    try {
      await adminApi.categoryImages.remove(slot.category);
      toast.success('Reset');
      onChanged();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Reset failed');
      setResetting(false);
    }
  };

  return (
    <div className="border border-border bg-bg overflow-hidden">
      <div className="relative aspect-[3/4] bg-subtle">
        <Image
          src={previewUrl}
          alt={slot.labelEn}
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
          className="object-cover"
          unoptimized
        />
        {/* Origin badge — tells admin at a glance whether the card is
            using a custom upload or the built-in fallback. */}
        <div className="absolute top-2 left-2 bg-bg/90 backdrop-blur text-[10px] tracking-widest uppercase px-2 py-1">
          {isCustom ? 'Custom' : 'Default'}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="font-display text-xl">{slot.labelEn}</div>
          <div className="text-sm text-muted" dir="rtl">
            {slot.labelAr}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFile}
          className="hidden"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={triggerPicker}
            disabled={uploading}
            className="flex-1 bg-ink text-bg text-xs tracking-widest uppercase px-3 py-2 hover:bg-accent transition-colors disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : isCustom ? 'Replace' : 'Upload'}
          </button>
          {isCustom ? (
            <button
              type="button"
              onClick={onReset}
              disabled={resetting}
              className="border border-border text-xs tracking-widest uppercase px-3 py-2 hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
            >
              {resetting ? '…' : 'Reset'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
