'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { adminApi, AdminApiError } from '@/lib/admin/api';
import { useAdminI18n } from '@/lib/admin/i18n';
import type { AdminHeroSlide } from '@/lib/admin/types';
import { resolveImageUrl } from '@/lib/image';

/**
 * Admin manager for the homepage hero slider. The component on the
 * storefront stays in code (interval, easing, badge); this page only
 * controls the underlying list of images and their AR/EN alt text.
 */
export default function AdminHeroSlidesPage() {
  const { t } = useAdminI18n();
  const [slides, setSlides] = useState<AdminHeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const data = await adminApi.heroSlides.list();
      setSlides(data);
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
    <div className="px-8 py-10 max-w-4xl">
      <div className="mb-8">
        <div className="text-[10px] tracking-widest uppercase text-muted mb-2">
          {t('common.admin')}
        </div>
        <h1 className="font-display text-4xl">{t('hero.title')}</h1>
        <p className="text-sm text-muted mt-2">{t('hero.subtitle')}</p>
      </div>

      <UploadForm onCreated={refresh} />

      <div className="mt-12">
        <h2 className="text-xs tracking-widest uppercase text-muted mb-4">
          Current slides
        </h2>
        {loading ? (
          <div className="text-muted text-sm">Loading…</div>
        ) : error ? (
          <div className="text-accent text-sm">{error}</div>
        ) : slides.length === 0 ? (
          <div className="text-muted text-sm">No slides yet. Upload the first one above.</div>
        ) : (
          <ul className="divide-y divide-border border-t border-b border-border">
            {slides.map((slide) => (
              <SlideRow key={slide.id} slide={slide} onChanged={refresh} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload form — file input + AR/EN alt + initial sort order.
// ---------------------------------------------------------------------------
function UploadForm({ onCreated }: { onCreated: () => void }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [altEn, setAltEn] = useState('');
  const [altAr, setAltAr] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Choose an image first');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await adminApi.heroSlides.create(file, {
        altEn: altEn.trim() || undefined,
        altAr: altAr.trim() || undefined,
        sortOrder: sortOrder.trim() === '' ? undefined : Number(sortOrder),
        isActive: true,
      });
      toast.success('Slide added');
      // Reset the form
      setFile(null);
      setAltEn('');
      setAltAr('');
      setSortOrder('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onCreated();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="border border-border p-6 space-y-5 bg-subtle/30">
      <h2 className="text-xs tracking-widest uppercase text-muted">Add a new slide</h2>

      <Field label="Image" hint="JPG, PNG, or WebP. Max 10MB. Cropped to 4:5 (1400×1750).">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm file:mr-3 file:px-3 file:py-2 file:border-0 file:bg-ink file:text-bg file:text-xs file:tracking-widest file:uppercase file:cursor-pointer"
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Alt text (English)" hint="Shown to screen readers; optional.">
          <input
            value={altEn}
            onChange={(e) => setAltEn(e.target.value)}
            placeholder="Opening look in black abaya"
            className={inputCls}
          />
        </Field>

        <Field label="Alt text (Arabic)" hint="نص بديل للقارئ الصوتى. اختيارى.">
          <input
            value={altAr}
            onChange={(e) => setAltAr(e.target.value)}
            placeholder="إطلالة افتتاحية بعباية سوداء"
            dir="rtl"
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Sort order" hint="Lower numbers show first. Leave blank to append at the end.">
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          placeholder="0"
          className={`${inputCls} max-w-[120px]`}
        />
      </Field>

      {error ? (
        <div className="bg-accent/10 border border-accent/30 text-accent text-sm px-4 py-3">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting || !file}
        className="bg-ink text-bg text-sm tracking-widest uppercase px-6 py-3 hover:bg-accent transition-colors disabled:opacity-50"
      >
        {submitting ? 'Uploading…' : 'Add slide'}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Single row — thumbnail + editable alt text / sort order / active flag.
// ---------------------------------------------------------------------------
function SlideRow({
  slide,
  onChanged,
}: {
  slide: AdminHeroSlide;
  onChanged: () => void;
}) {
  const [altEn, setAltEn] = useState(slide.altEn ?? '');
  const [altAr, setAltAr] = useState(slide.altAr ?? '');
  const [sortOrder, setSortOrder] = useState(String(slide.sortOrder));
  const [isActive, setIsActive] = useState(slide.isActive);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Keep local state in sync if a sibling row triggers a refresh.
  useEffect(() => {
    setAltEn(slide.altEn ?? '');
    setAltAr(slide.altAr ?? '');
    setSortOrder(String(slide.sortOrder));
    setIsActive(slide.isActive);
  }, [slide]);

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.heroSlides.update(slide.id, {
        altEn: altEn.trim() || null,
        altAr: altAr.trim() || null,
        sortOrder: Number(sortOrder) || 0,
        isActive,
      });
      toast.success('Saved');
      onChanged();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this slide? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await adminApi.heroSlides.remove(slide.id);
      toast.success('Deleted');
      onChanged();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Delete failed');
      setDeleting(false);
    }
  };

  return (
    <li className="py-5 grid grid-cols-[112px_1fr_auto] gap-5 items-start">
      {/* Thumbnail */}
      <div className="relative w-[112px] aspect-[4/5] bg-subtle overflow-hidden">
        <Image
          src={resolveImageUrl(slide.url)}
          alt={slide.altEn ?? slide.altAr ?? 'Hero slide'}
          fill
          sizes="112px"
          className="object-cover"
          unoptimized
        />
      </div>

      {/* Editable fields */}
      <div className="space-y-3 min-w-0">
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            value={altEn}
            onChange={(e) => setAltEn(e.target.value)}
            placeholder="Alt text (English)"
            className={inputCls}
          />
          <input
            value={altAr}
            onChange={(e) => setAltAr(e.target.value)}
            placeholder="نص بديل (عربى)"
            dir="rtl"
            className={inputCls}
          />
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-xs text-muted flex items-center gap-2">
            <span>Sort</span>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className={`${inputCls} w-20`}
            />
          </label>
          <label className="text-xs text-muted flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Show on homepage</span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 items-stretch">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="bg-ink text-bg text-xs tracking-widest uppercase px-4 py-2 hover:bg-accent transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={deleting}
          className="border border-border text-xs tracking-widest uppercase px-4 py-2 hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const inputCls =
  'w-full bg-bg border border-border px-3 py-2 text-sm focus:border-ink outline-none';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] tracking-widest uppercase text-muted mb-1.5">
        {label}
      </span>
      {children}
      {hint ? <span className="block text-[10px] text-muted mt-1">{hint}</span> : null}
    </label>
  );
}
