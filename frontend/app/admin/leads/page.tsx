'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { adminApi, AdminApiError } from '@/lib/admin/api';
import { useAdminI18n } from '@/lib/admin/i18n';
import type { AdminLead, LeadStatus, Pagination } from '@/lib/admin/types';

const STATUS_FILTERS = ['ALL', 'NEW', 'CONTACTED', 'RESOLVED'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_COLOR: Record<LeadStatus, string> = {
  NEW: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CONTACTED: 'bg-blue-100 text-blue-800 border-blue-200',
  RESOLVED: 'bg-green-100 text-green-800 border-green-200',
};

export default function AdminLeadsPage() {
  const { t } = useAdminI18n();
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminLead[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.leads.list({
        status: status === 'ALL' ? undefined : status,
        page,
        limit: 25,
      });
      setItems(res.items);
      setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  const setLeadStatus = async (id: number, next: LeadStatus) => {
    setSavingId(id);
    try {
      const updated = await adminApi.leads.update(id, { status: next });
      setItems((curr) => curr.map((l) => (l.id === id ? updated : l)));
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Update failed');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="px-8 py-10">
      <div className="mb-8">
        <div className="text-[10px] tracking-widest uppercase text-muted mb-2">{t('common.admin')}</div>
        <h1 className="font-display text-4xl">{t('leads.title')}</h1>
        <p className="text-sm text-muted mt-2 max-w-xl">{t('leads.subtitle')}</p>
      </div>

      <div className="flex gap-2 mb-6">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`text-[10px] tracking-widest uppercase px-3 py-2 border transition-colors ${
              status === s
                ? 'bg-ink text-bg border-ink'
                : 'border-border hover:border-ink'
            }`}
          >
            {s.toLowerCase()}
          </button>
        ))}
      </div>

      {error ? <div className="text-accent text-sm mb-4">{error}</div> : null}

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-subtle/50 border-b border-border">
            <tr className="text-[10px] tracking-widest uppercase text-muted">
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Phone / Email</th>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">Wants</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  No leads yet.
                </td>
              </tr>
            ) : (
              items.map((l) => (
                <tr
                  key={l.id}
                  className={`border-b border-border last:border-0 hover:bg-subtle/30 ${
                    l.viewedAt === null ? 'bg-accent/[0.03]' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-medium">
                    {l.viewedAt === null ? (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent mr-2 align-middle" />
                    ) : null}
                    {l.name}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    <div>{l.phone}</div>
                    <div>{l.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/en/product/${l.productSlug}`}
                      className="hover:text-accent"
                    >
                      {l.productNameEn}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {l.colorName || '—'}
                    {l.size ? ` · ${l.size}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={l.status}
                      onChange={(e) => setLeadStatus(l.id, e.target.value as LeadStatus)}
                      disabled={savingId === l.id}
                      className={`text-[10px] tracking-widest uppercase px-2 py-1 border rounded-sm ${
                        STATUS_COLOR[l.status]
                      } disabled:opacity-50`}
                    >
                      <option value="NEW">new</option>
                      <option value="CONTACTED">contacted</option>
                      <option value="RESOLVED">resolved</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {new Date(l.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 ? (
        <nav className="mt-6 flex items-center justify-center gap-1 text-sm">
          {Array.from({ length: pagination.totalPages }).map((_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`min-w-9 h-9 grid place-items-center ${
                  p === pagination.page ? 'bg-ink text-bg' : 'text-muted hover:text-ink'
                }`}
              >
                {p}
              </button>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
