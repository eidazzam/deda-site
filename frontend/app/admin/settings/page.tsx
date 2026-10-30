'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { adminApi, AdminApiError } from '@/lib/admin/api';
import { useAdminI18n } from '@/lib/admin/i18n';
import type { AdminSiteConfig } from '@/lib/admin/types';

export default function AdminSettingsPage() {
  const { t } = useAdminI18n();
  const [config, setConfig] = useState<AdminSiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
