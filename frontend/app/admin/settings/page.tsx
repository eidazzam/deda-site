'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { adminApi, AdminApiError } from '@/lib/admin/api';
import { useAdminI18n } from '@/lib/admin/i18n';
import type { AdminSiteConfig } from '@/lib/admin/types';

type HeroSlot = 1 | 2 | 3 | 4;
const HERO_SLOTS: HeroSlot[] = [1, 2, 3, 4];

function heroUrlFor(config: AdminSiteConfig, slot: HeroSlot): string | null {
  switch (slot) {
    case 1: return config.heroImage1Url;
    case 2: return config.heroImage2Url;
    case 3: return config.heroImage3Url;
    case 4: return config.heroImage4Url;
  }
}

// Admin images come back as /uploads/… — relative to the API host, not
// the storefront. Build the absolute URL so <img> loads correctly.
const UPLOAD_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  'https://api.dedawomenswear.shop';
function resolveUploadUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return `${UPLOAD_BASE}${url}`;
  return url;
}

export default function AdminSettingsPage() {
  const { t } = useAdminI18n();
  const [config, setConfig] = useState<AdminSiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [heroBusySlot, setHeroBusySlot] = useState<HeroSlot | null>(null);

  const [whatsapp, setWhatsapp] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminApi.siteConfig.get();
        if (cancelled) return;
        setConfig(data);
        setWhatsapp(data.whatsappNumber ?? '');
        setFacebook(data.facebookUrl ?? '');
        setInstagram(data.instagramUrl ?? '');
        setTiktok(data.tiktokUrl ?? '');
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
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const updated = await adminApi.siteConfig.update({
        // empty string -> backend will store NULL so the footer link disappears
        whatsappNumber: whatsapp.trim() || null,
        facebookUrl: facebook.trim() || null,
        instagramUrl: instagram.trim() || null,
        tiktokUrl: tiktok.trim() || null,
      });
      setConfig(updated);
      toast.success('Saved');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-8 py-10 max-w-2xl">
      <div className="mb-8">
        <div className="text-[10px] tracking-widest uppercase text-muted mb-2">
          {t('common.admin')}
        </div>
        <h1 className="font-display text-4xl">{t('settings.title')}</h1>
        <p className="text-sm text-muted mt-2">{t('settings.subtitle')}</p>
      </div>

      {loading ? (
        <div className="text-muted">Loading…</div>
      ) : !config ? (
        <div className="text-accent">{error ?? 'Failed to load'}</div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <Field
            label="WhatsApp number"
            hint="Include the country code, e.g. +201234567890"
          >
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+201234567890"
              className={inputCls}
            />
          </Field>

          <Field label="Facebook page URL">
            <input
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="https://facebook.com/yourpage"
              className={inputCls}
            />
          </Field>

          <Field label="Instagram profile URL">
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="https://instagram.com/yourhandle"
              className={inputCls}
            />
          </Field>

          <Field label="TikTok profile URL">
            <input
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
              placeholder="https://tiktok.com/@yourhandle"
              className={inputCls}
            />
          </Field>

          {error ? (
            <div className="bg-accent/10 border border-accent/30 text-accent text-sm px-4 py-3">
              {error}
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
      )}

      {config ? (
        <div className="mt-12 pt-10 border-t border-border">
          <div className="mb-5">
            <h2 className="font-display text-2xl">Hero slider images</h2>
            <p className="text-sm text-muted mt-1">
              Up to four images that rotate on the homepage hero. Each slot
              is independent — slots you leave empty fall back to the
              built-in editorial frames.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {HERO_SLOTS.map((slot) => (
              <HeroSlotCard
                key={slot}
                slot={slot}
                url={heroUrlFor(config, slot)}
                busy={heroBusySlot === slot}
                onUpload={async (file) => {
                  setHeroBusySlot(slot);
                  try {
                    const updated = await adminApi.siteConfig.uploadHeroImage(slot, file);
                    setConfig(updated);
                    toast.success(`Hero ${slot} saved`);
                  } catch (err) {
                    toast.error(
                      err instanceof AdminApiError ? err.message : 'Upload failed',
                    );
                  } finally {
                    setHeroBusySlot(null);
                  }
                }}
                onRemove={async () => {
                  if (!confirm(`Remove hero image ${slot}?`)) return;
                  setHeroBusySlot(slot);
                  try {
                    await adminApi.siteConfig.removeHeroImage(slot);
                    const next = await adminApi.siteConfig.get();
                    setConfig(next);
                    toast.success(`Hero ${slot} cleared`);
                  } catch (err) {
                    toast.error(
                      err instanceof AdminApiError ? err.message : 'Remove failed',
                    );
                  } finally {
                    setHeroBusySlot(null);
                  }
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HeroSlotCard({
  slot,
  url,
  busy,
  onUpload,
  onRemove,
}: {
  slot: HeroSlot;
  url: string | null;
  busy: boolean;
  onUpload: (file: File) => void | Promise<void>;
  onRemove: () => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="border border-border bg-bg">
      <div className="aspect-[7/10] bg-subtle relative overflow-hidden">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveUploadUrl(url)}
            alt={`Hero ${slot}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-[11px] text-muted tracking-widest uppercase">
            Slot {slot} · empty
          </div>
        )}
        {busy ? (
          <div className="absolute inset-0 bg-ink/60 grid place-items-center text-bg text-xs tracking-widest uppercase">
            Working…
          </div>
        ) : null}
      </div>
      <div className="p-3 flex items-center justify-between gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onUpload(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="text-[10px] tracking-widest uppercase bg-ink text-bg px-3 py-1.5 hover:bg-accent transition-colors disabled:opacity-50"
        >
          {url ? 'Replace' : 'Upload'}
        </button>
        {url ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onRemove()}
            className="text-[10px] tracking-widest uppercase text-muted hover:text-accent transition-colors disabled:opacity-50"
          >
            Remove
          </button>
        ) : null}
      </div>
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
