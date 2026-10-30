'use client';

import { useEffect, useState } from 'react';

import { adminApi, AdminApiError } from '@/lib/admin/api';
import { useAdminI18n } from '@/lib/admin/i18n';
import type { AdminCoupon } from '@/lib/admin/types';
import { formatPrice } from '@/lib/format';

// Admin enters EGP; the API stores piastres. Conversion lives at the form
// boundary so the rest of the component can stay in EGP-shaped numbers.
const kwdToFils = (kwd: string) => Math.round(Number(kwd) * 100);

// Coupons run between 1 and 7 days. Returns YYYY-MM-DD for HTML date inputs.
const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

type DraftCoupon = {
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: string;
  minOrderAmount: string;
  maxDiscount: string;
  expiresAt: string;
  usageLimit: string;
};

const EMPTY_DRAFT: DraftCoupon = {
  code: '',
  type: 'PERCENT',
  value: '',
  minOrderAmount: '',
  maxDiscount: '',
  expiresAt: '',
  usageLimit: '',
};

export default function AdminCouponsPage() {
  const { t } = useAdminI18n();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState<DraftCoupon>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminApi.coupons.list();
      setCoupons(data);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        code: draft.code.trim().toUpperCase(),
        type: draft.type,
        // PERCENT value is a 1–100 percentage; FIXED value is a EGP
        // amount that we persist as piastres.
        value: draft.type === 'FIXED' ? kwdToFils(draft.value) : Number(draft.value),
        minOrderAmount:
          draft.minOrderAmount === '' ? null : kwdToFils(draft.minOrderAmount),
        maxDiscount:
          draft.maxDiscount === '' ? null : kwdToFils(draft.maxDiscount),
        expiresAt: draft.expiresAt
          ? new Date(draft.expiresAt).toISOString()
          : null,
        usageLimit: draft.usageLimit === '' ? null : Number(draft.usageLimit),
      };
      const created = await adminApi.coupons.create(body);
      setCoupons((curr) => [created, ...curr]);
      setDraft(EMPTY_DRAFT);
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (c: AdminCoupon) => {
    try {
      const updated = await adminApi.coupons.update(c.code, { isActive: !c.isActive });
      setCoupons((curr) => curr.map((x) => (x.code === c.code ? updated : x)));
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Update failed');
    }
  };

  const remove = async (code: string) => {
    if (!window.confirm(`Delete coupon ${code}?`)) return;
    try {
      await adminApi.coupons.remove(code);
      setCoupons((curr) => curr.filter((x) => x.code !== code));
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="px-8 py-10 max-w-5xl">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-[10px] tracking-widest uppercase text-muted mb-2">
            {t('common.admin')}
          </div>
          <h1 className="font-display text-4xl">{t('coupons.title')}</h1>
        </div>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="bg-ink text-bg text-[10px] tracking-widest uppercase px-4 py-2.5 hover:bg-accent transition-colors"
        >
          {showCreate ? 'Cancel' : '+ New coupon'}
        </button>
      </div>

      {showCreate ? (
        <form
          onSubmit={onCreate}
          className="border border-border p-5 mb-8 grid sm:grid-cols-3 gap-4"
        >
          <Field label="Code (uppercase)" required>
            <input
              value={draft.code}
              onChange={(e) =>
                setDraft({ ...draft, code: e.target.value.toUpperCase() })
              }
              required
              className="w-full bg-bg border border-border px-3 py-2 text-sm font-mono"
            />
          </Field>
          <Field label="Type">
            <select
              value={draft.type}
              onChange={(e) =>
                setDraft({ ...draft, type: e.target.value as 'PERCENT' | 'FIXED' })
              }
              className="w-full bg-bg border border-border px-3 py-2 text-sm"
            >
              <option value="PERCENT">Percent (%)</option>
              <option value="FIXED">Fixed (EGP)</option>
            </select>
          </Field>
          <Field label="Value" required>
            <input
              type="number"
              min={1}
              value={draft.value}
              onChange={(e) => setDraft({ ...draft, value: e.target.value })}
              required
              className="w-full bg-bg border border-border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Min order (optional)">
            <input
              type="number"
              min={0}
              value={draft.minOrderAmount}
              onChange={(e) =>
                setDraft({ ...draft, minOrderAmount: e.target.value })
              }
              className="w-full bg-bg border border-border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Max discount (optional)">
            <input
              type="number"
              min={0}
              value={draft.maxDiscount}
              onChange={(e) => setDraft({ ...draft, maxDiscount: e.target.value })}
              className="w-full bg-bg border border-border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Usage limit (optional)">
            <input
              type="number"
              min={1}
              value={draft.usageLimit}
              onChange={(e) => setDraft({ ...draft, usageLimit: e.target.value })}
              className="w-full bg-bg border border-border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Expires (required, 1–7 days)" full>
            <input
              type="date"
              required
              min={addDays(1)}
              max={addDays(7)}
              value={draft.expiresAt}
              onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })}
              className="w-full bg-bg border border-border px-3 py-2 text-sm"
            />
            <p className="text-[10px] text-muted mt-1">
              Min tomorrow, max one week from today.
            </p>
          </Field>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-ink text-bg text-xs tracking-widest uppercase px-4 py-2 hover:bg-accent transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create coupon'}
            </button>
          </div>
        </form>
      ) : null}

      {error ? <div className="text-accent text-sm mb-4">{error}</div> : null}

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-subtle/50 border-b border-border">
            <tr className="text-[10px] tracking-widest uppercase text-muted">
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Discount</th>
              <th className="px-4 py-3 text-left">Min / Max</th>
              <th className="px-4 py-3 text-right">Used</th>
              <th className="px-4 py-3 text-left">Expires</th>
              <th className="px-4 py-3 text-center">Active</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  No coupons yet.
                </td>
              </tr>
            ) : (
              coupons.map((c) => (
                <tr key={c.code} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono font-medium">{c.code}</td>
                  <td className="px-4 py-3">
                    {c.type === 'PERCENT'
                      ? `${c.value}%`
                      : `${formatPrice(c.value, 'en')} EGP`}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {c.minOrderAmount !== null
                      ? `min ${formatPrice(c.minOrderAmount, 'en')}`
                      : '—'}
                    {c.maxDiscount !== null
                      ? ` / cap ${formatPrice(c.maxDiscount, 'en')}`
                      : ''}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.usageCount}
                    {c.usageLimit !== null ? `/${c.usageLimit}` : ''}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {c.expiresAt
                      ? new Date(c.expiresAt).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(c)}
                      className={`text-[10px] tracking-widest uppercase px-2 py-1 border ${
                        c.isActive
                          ? 'bg-ink text-bg border-ink'
                          : 'border-border text-muted'
                      }`}
                    >
                      {c.isActive ? 'on' : 'off'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => remove(c.code)}
                      className="text-[10px] tracking-widest uppercase text-accent hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${full ? 'sm:col-span-3' : ''}`}>
      <span className="block text-[10px] tracking-widest uppercase text-muted mb-1.5">
        {label} {required ? <span className="text-accent">*</span> : null}
      </span>
      {children}
    </label>
  );
}
