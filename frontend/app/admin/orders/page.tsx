'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { adminApi, AdminApiError } from '@/lib/admin/api';
import { useAdminI18n } from '@/lib/admin/i18n';
import type { AdminOrderListItem, Pagination } from '@/lib/admin/types';
import { formatPrice } from '@/lib/format';

const STATUS_FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
  SHIPPED: 'bg-purple-100 text-purple-800 border-purple-200',
  DELIVERED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
};

export default function AdminOrdersPage() {
  const { t } = useAdminI18n();
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminOrderListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Debounce the search box so typing doesn't fire a request per character.
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await adminApi.orders.list({
          status: status === 'ALL' ? undefined : status,
          search: debouncedSearch || undefined,
          page,
          limit: 25,
        });
        if (cancelled) return;
        setItems(res.items);
        setPagination(res.pagination);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof AdminApiError ? err.message : 'Failed to load orders');
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, debouncedSearch, page]);

  const onDelete = async (id: number, orderNumber: string) => {
    if (!window.confirm(`${t('orders.confirmDelete')} (${orderNumber})`)) return;
    setDeletingId(id);
    try {
      await adminApi.orders.remove(id);
      setItems((cur) => cur.filter((o) => o.id !== id));
      toast.success(`${t('orders.deleted')} ${orderNumber}`);
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : t('common.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  const csvHref = useMemo(() => {
    const rows = [
      ['Order', 'Customer', 'Phone', 'Governorate', 'Items', 'Total EGP', 'Status', 'Created'].join(','),
      ...items.map((o) =>
        [
          o.orderNumber,
          `"${o.customerName.replace(/"/g, '""')}"`,
          o.phone1,
          o.governorateName ?? o.countryCode,
          o.itemsCount,
          (o.total / 1000).toFixed(3),
          o.status,
          o.createdAt,
        ].join(','),
      ),
    ].join('\n');
    return `data:text/csv;charset=utf-8,${encodeURIComponent(rows)}`;
  }, [items]);

  return (
    <div className="px-8 py-10">
      <div className="mb-8">
        <div className="text-[10px] tracking-widest uppercase text-muted mb-2">
          {t('common.admin')}
        </div>
        <h1 className="font-display text-4xl">{t('orders.title')}</h1>
      </div>

      <div className="flex flex-wrap gap-3 items-center mb-6">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t('orders.search')}
          className="flex-1 min-w-[200px] bg-bg border border-border px-3 py-2 text-sm focus:border-ink outline-none"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as StatusFilter);
            setPage(1);
          }}
          className="bg-bg border border-border px-3 py-2 text-sm"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL'
                ? t('orders.allStatus')
                : t(`orders.status.${s.toLowerCase()}` as Parameters<typeof t>[0])}
            </option>
          ))}
        </select>
        <a
          href={csvHref}
          download={`deda-orders-${new Date().toISOString().slice(0, 10)}.csv`}
          className="bg-ink text-bg text-[10px] tracking-widest uppercase px-4 py-2 hover:bg-accent transition-colors"
        >
          {t('orders.exportCsv')}
        </a>
        <a
          href={`/admin/orders/export-print?status=${encodeURIComponent(
            status,
          )}&search=${encodeURIComponent(debouncedSearch)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-ink text-ink text-[10px] tracking-widest uppercase px-4 py-2 hover:bg-ink hover:text-bg transition-colors"
        >
          {t('orders.exportPdf')}
        </a>
      </div>

      {error ? (
        <div className="text-accent text-sm mb-4">{error}</div>
      ) : null}

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-subtle/50 border-b border-border">
            <tr className="text-[10px] tracking-widest uppercase text-muted">
              <th className="px-4 py-3 text-start">{t('orders.colOrder')}</th>
              <th className="px-4 py-3 text-start">{t('orders.colCustomer')}</th>
              <th className="px-4 py-3 text-start">{t('orders.colPhone')}</th>
              <th className="px-4 py-3 text-start">{t('orders.colGovernorate')}</th>
              <th className="px-4 py-3 text-end">{t('orders.colItems')}</th>
              <th className="px-4 py-3 text-end">{t('orders.colTotal')}</th>
              <th className="px-4 py-3 text-start">{t('orders.colStatus')}</th>
              <th className="px-4 py-3 text-start">{t('orders.colDate')}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted">
                  {t('common.loading')}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted">
                  {t('orders.empty')}
                </td>
              </tr>
            ) : (
              items.map((o) => (
                <tr
                  key={o.id}
                  className={`border-b border-border last:border-0 hover:bg-subtle/30 ${
                    o.isUnread ? 'bg-accent/[0.03]' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-medium">
                    {o.isUnread ? (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent mr-2 align-middle" />
                    ) : null}
                    {o.orderNumber}
                  </td>
                  <td className="px-4 py-3">{o.customerName}</td>
                  <td className="px-4 py-3 text-muted">{o.phone1}</td>
                  <td className="px-4 py-3 text-muted">
                    {o.governorateName ?? o.countryCode}
                  </td>
                  <td className="px-4 py-3 text-right">{o.itemsCount}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatPrice(o.total, 'en')} EGP
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-[10px] tracking-widest uppercase px-2 py-1 border rounded-sm ${
                        STATUS_COLOR[o.status] ?? ''
                      }`}
                    >
                      {t(`orders.status.${o.status.toLowerCase()}` as Parameters<typeof t>[0])}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {new Date(o.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="text-accent text-[10px] tracking-widest uppercase hover:underline"
                    >
                      {t('common.view')}
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDelete(o.id, o.orderNumber)}
                      disabled={deletingId === o.id}
                      className="ms-3 text-muted text-[10px] tracking-widest uppercase hover:text-accent disabled:opacity-40"
                    >
                      {deletingId === o.id ? '…' : t('common.delete')}
                    </button>
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
                  p === pagination.page
                    ? 'bg-ink text-bg'
                    : 'text-muted hover:text-ink'
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
