'use client';

import { useEffect, useState } from 'react';

import { adminApi, AdminApiError } from '@/lib/admin/api';
import { useAdminI18n } from '@/lib/admin/i18n';
import type { AdminCountry } from '@/lib/admin/types';

export default function AdminCountriesPage() {
  const { t } = useAdminI18n();
  const [items, setItems] = useState<AdminCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track per-row pending state so the table doesn't lock up while one
  // row is saving.
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminApi.countries.list();
        if (!cancelled) {
          setItems(data);
          setLoading(false);
        }
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

  // Admin enters the fee in EGP; we persist as piastres (1 EGP = 1000 piastres).
  const updateFee = async (country: AdminCountry, newFeeKwd: number) => {
    const newFee = Math.round(newFeeKwd * 100);
    if (newFee === country.shippingFee) return;
    setSavingId(country.id);
    try {
      const updated = await adminApi.countries.update(country.id, {
        shippingFee: newFee,
      });
      setItems((curr) => curr.map((c) => (c.id === country.id ? updated : c)));
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Save failed');
    } finally {
      setSavingId(null);
    }
  };

  const toggleActive = async (country: AdminCountry) => {
    setSavingId(country.id);
    try {
      const updated = await adminApi.countries.update(country.id, {
        isActive: !country.isActive,
      });
      setItems((curr) => curr.map((c) => (c.id === country.id ? updated : c)));
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Toggle failed');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="px-8 py-10 max-w-3xl">
      <div className="mb-8">
        <div className="text-[10px] tracking-widest uppercase text-muted mb-2">{t('common.admin')}</div>
        <h1 className="font-display text-4xl">{t('countries.title')}</h1>
        <p className="text-sm text-muted mt-2">
          Per-country shipping fees for orders outside Kuwait. Free shipping
          kicks in at 100 EGP subtotal. Toggle off to remove a country from
          the checkout dropdown.
        </p>
      </div>

      {error ? <div className="text-accent text-sm mb-4">{error}</div> : null}

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead className="bg-subtle/50 border-b border-border">
            <tr className="text-[10px] tracking-widest uppercase text-muted">
              <th className="px-4 py-3 text-left">Country</th>
              <th className="px-4 py-3 text-right">Fee (EGP)</th>
              <th className="px-4 py-3 text-center">Active</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      <span className="text-xs text-muted font-mono mr-2">{c.code}</span>
                      {c.nameEn}
                    </div>
                    <div className="text-xs text-muted">{c.nameAr}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      key={c.shippingFee}
                      type="number"
                      min={0}
                      step={0.001}
                      defaultValue={c.shippingFee / 100}
                      onBlur={(e) => updateFee(c, Number(e.target.value))}
                      disabled={savingId === c.id}
                      className="w-24 text-right bg-bg border border-border px-2 py-1"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(c)}
                      disabled={savingId === c.id}
                      className={`text-[10px] tracking-widest uppercase px-2 py-1 border ${
                        c.isActive
                          ? 'bg-ink text-bg border-ink'
                          : 'border-border text-muted'
                      }`}
                    >
                      {c.isActive ? 'on' : 'off'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted mt-4">
        Tip: changes save when you blur the field (Tab or click away).
      </p>
    </div>
  );
}
