'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { adminApi, AdminApiError } from '@/lib/admin/api';
import { useAdminI18n } from '@/lib/admin/i18n';
import type { AdminSiteConfig } from '@/lib/admin/types';
import { resolveImageUrl } from '@/lib/image';

// Built-in defaults rendered when no override is saved. Mirrors the
// hardcoded fallback in app/[locale]/page.tsx so the admin form shows
// the same placeholders the storefront falls back to.
const DEFAULTS = {
  eyebrowEn: 'Craft',
  eyebrowAr: 'حرفية',
  headlineEn: "Every piece carries a maker's hand.",
  headlineAr: 'كل قطعة تحمل أثر .',
  bodyEn:
    'We work with small ateliers from Kuwait across the Gulf, choose considered fabrics, and measure success by the details only the wearer notices.',
  bodyAr:
    'نعمل مع ورش صغيرة من الكويت إلى الخليج، نختار خامات راقية ونقيس النجاح بتفاصيل لا يراها أحد إلا من تلبسها.',
  imageUrl:
    'https://images.unsplash.com/photo-1627378228978-a62f71edff15?w=1000&h=1250&fit=crop&q=85&auto=format',
};

export default function AdminEditorialPage() {
  const { t } = useAdminI18n();
  const [config, setConfig] = useState<AdminSiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [eyebrowEn, setEyebrowEn] = useState('');
  const [eyebrowAr, setEyebrowAr] = useState('');
  const [headlineEn, setHeadlineEn] = useState('');
  const [headlineAr, setHeadlineAr] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [bodyAr, setBodyAr] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = async () => {
    try {
      const data = await adminApi.siteConfig.get();
      setConfig(data);
      setEyebrowEn(data.editorialEyebrowEn ?? '');
      setEyebrowAr(data.editorialEyebrowAr ?? '');
      setHeadlineEn(data.editorialHeadlineEn ?? '');
      setHeadlineAr(data.editorialHeadlineAr ?? '');
      setBodyEn(data.editorialBodyEn ?? '');
      setBodyAr(data.editorialBodyAr ?? '');
      setLoading(false);
    } catch (err) {
      setLoadError(err instanceof AdminApiError ? err.message : 'Failed to load');
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await adminApi.siteConfig.update({
        editorialEyebrowEn:  eyebrowEn.trim() || null,
        editorialEyebrowAr:  eyebrowAr.trim() || null,
        editorialHeadlineEn: headlineEn.trim() || null,
        editorialHeadlineAr: headlineAr.trim() || null,
        editorialBodyEn:     bodyEn.trim() || null,
        editorialBodyAr:     bodyAr.trim() || null,
      });
      setConfig(updated);
      toast.success('Saved');
    } catch (err) {
      setSubmitError(err instanceof AdminApiError ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const triggerPicker = () => fileInputRef.current?.click();

  const onUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const updated = await adminApi.siteConfig.uploadEditorialImage(file);
      setConfig(updated);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Upload failed');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onRemoveImage = async () => {
    if (!window.confirm('Remove the editorial image? The default photo will be used.')) return;
    try {
      await adminApi.siteConfig.removeEditorialImage();
      toast.success('Image removed');
      void refresh();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Remove failed');
    }
  };

  const currentImage = config?.editorialImageUrl
    ? resolveImageUrl(config.editorialImageUrl)
    : DEFAULTS.imageUrl;
  const isCustomImage = Boolean(config?.editorialImageUrl);

  return (
    <div className="px-8 py-10 max-w-4xl">
      <div className="mb-8">
        <div className="text-[10px] tracking-widest uppercase text-muted mb-2">
          {t('common.admin')}
        </div>
        <h1 className="font-display text-4xl">{t('editorial.title')}</h1>
        <p className="text-sm text-muted mt-2">{t('editorial.subtitle')}</p>
      </div>

      {loading ? (
        <div className="text-muted text-sm">Loading…</div>
      ) : loadError ? (
        <div className="text-accent text-sm">{loadError}</div>
      ) : (
        <div className="space-y-10">
          {/* Image */}
          <section className="border border-border p-6 bg-subtle/30">
            <h2 className="text-xs tracking-widest uppercase text-muted mb-4">
              Cover image
            </h2>
            <div className="grid grid-cols-[200px_1fr] gap-6 items-start">
              <div className="relative w-[200px] aspect-[4/5] bg-bg border border-border overflow-hidden">
                <Image
                  src={currentImage}
                  alt="Editorial"
                  fill
                  sizes="200px"
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute top-2 left-2 bg-bg/90 backdrop-blur text-[10px] tracking-widest uppercase px-2 py-1">
                  {isCustomImage ? 'Custom' : 'Default'}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  Cropped to 4:5 (1000×1250). JPG / PNG / WebP, max 10MB.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onUploadImage}
                  className="hidden"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={triggerPicker}
                    disabled={uploadingImage}
                    className="bg-ink text-bg text-xs tracking-widest uppercase px-4 py-2 hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    {uploadingImage ? 'Uploading…' : isCustomImage ? 'Replace' : 'Upload'}
                  </button>
                  {isCustomImage ? (
                    <button
                      type="button"
                      onClick={onRemoveImage}
                      className="border border-border text-xs tracking-widest uppercase px-4 py-2 hover:border-accent hover:text-accent transition-colors"
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {/* Copy */}
          <form onSubmit={onSubmit} className="space-y-5">
            <Field label="Eyebrow (English)" hint={`Default: "${DEFAULTS.eyebrowEn}"`}>
              <input
                value={eyebrowEn}
                onChange={(e) => setEyebrowEn(e.target.value)}
                placeholder={DEFAULTS.eyebrowEn}
                className={inputCls}
              />
            </Field>
            <Field label="Eyebrow (Arabic)" hint={`الافتراضى: "${DEFAULTS.eyebrowAr}"`}>
              <input
                value={eyebrowAr}
                onChange={(e) => setEyebrowAr(e.target.value)}
                placeholder={DEFAULTS.eyebrowAr}
                dir="rtl"
                className={inputCls}
              />
            </Field>

            <Field label="Headline (English)" hint={`Default: "${DEFAULTS.headlineEn}"`}>
              <input
                value={headlineEn}
                onChange={(e) => setHeadlineEn(e.target.value)}
                placeholder={DEFAULTS.headlineEn}
                className={inputCls}
              />
            </Field>
            <Field label="Headline (Arabic)" hint={`الافتراضى: "${DEFAULTS.headlineAr}"`}>
              <input
                value={headlineAr}
                onChange={(e) => setHeadlineAr(e.target.value)}
                placeholder={DEFAULTS.headlineAr}
                dir="rtl"
                className={inputCls}
              />
            </Field>

            <Field label="Body (English)" hint={`Default: "${DEFAULTS.bodyEn}"`}>
              <textarea
                value={bodyEn}
                onChange={(e) => setBodyEn(e.target.value)}
                placeholder={DEFAULTS.bodyEn}
                rows={4}
                className={inputCls}
              />
            </Field>
            <Field label="Body (Arabic)" hint={`الافتراضى: "${DEFAULTS.bodyAr}"`}>
              <textarea
                value={bodyAr}
                onChange={(e) => setBodyAr(e.target.value)}
                placeholder={DEFAULTS.bodyAr}
                dir="rtl"
                rows={4}
                className={inputCls}
              />
            </Field>

            {submitError ? (
              <div className="bg-accent/10 border border-accent/30 text-accent text-sm px-4 py-3">
                {submitError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="bg-ink text-bg text-sm tracking-widest uppercase px-6 py-3 hover:bg-accent transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full bg-bg border border-border px-3 py-2.5 text-sm focus:border-ink outline-none';

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
