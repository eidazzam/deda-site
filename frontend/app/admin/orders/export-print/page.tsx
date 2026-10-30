'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { adminApi, AdminApiError } from '@/lib/admin/api';
import { useAdminI18n } from '@/lib/admin/i18n';
import type { AdminOrderListItem } from '@/lib/admin/types';
import { formatPrice } from '@/lib/format';

/**
 * Printable orders report. Reads the same filters the list page uses
 * (?status=…&search=…) and pulls a large enough batch to cover the
 * usual report — defaults to 200 rows. Auto-triggers the print dialog
 * once the data lands.
 */
export default function OrdersExportPrintPage() {
  const search = useSearchParams();
  const status = search.get('status') ?? undefined;
  const query = search.get('search') ?? undefined;
  const { t, locale } = useAdminI18n();
  const isAR = locale === 'ar';

  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminApi.orders.list({
          status: status && status !== 'ALL' ? status : undefined,
          search: query || undefined,
          page: 1,
          limit: 200,
        });
        if (cancelled) return;
        setOrders(res.items);
        setLoading(false);
        setTimeout(() => window.print(), 200);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof AdminApiError ? err.message : 'Failed to load');
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, query]);

  const totalRevenue = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + o.total, 0);

  if (loading) {
    return <div className="print-page p-8 text-gray-500">{t('report.preparing')}</div>;
  }
  if (error) {
    return <div className="print-page p-8 text-red-600">{error}</div>;
  }

  const currency = isAR ? 'جنيه' : 'EGP';
  const filterLabel =
    status && status !== 'ALL'
      ? t(`orders.status.${status.toLowerCase()}` as Parameters<typeof t>[0])
      : t('report.allStatus');

  return (
    <div className="print-page">
      <div className={`no-print fixed top-3 ${isAR ? 'left-3' : 'right-3'} z-50 flex gap-2`}>
        <button
          onClick={() => window.print()}
          className="bg-black text-white text-xs tracking-widest uppercase px-4 py-2 hover:opacity-90"
        >
          {t('invoice.printSave')}
        </button>
        <button
          onClick={() => window.close()}
          className="bg-white text-black border border-gray-300 text-xs tracking-widest uppercase px-4 py-2 hover:bg-gray-50"
        >
          {t('invoice.close')}
        </button>
      </div>

      <div className="max-w-[1000px] mx-auto p-10 text-[12px] leading-relaxed">
        <header className="flex items-end justify-between pb-6 border-b border-gray-300 mb-6">
          <div>
            <div className="text-2xl font-serif italic">
              {isAR ? 'ديدا' : 'Deda'}
            </div>
            <div className="text-[10px] tracking-widest uppercase text-gray-500 mt-1">
              {t('report.title')}
            </div>
          </div>
          <div className={`${isAR ? 'text-left' : 'text-right'} text-[10px] tracking-widest uppercase text-gray-500`}>
            <div>
              {t('report.filter')}:{' '}
              <span className="text-black">{filterLabel}</span>
              {query ? (
                <>
                  {' · '}
                  {t('report.search')}: <span className="text-black">"{query}"</span>
                </>
              ) : null}
            </div>
            <div>
              {t('report.generated')}{' '}
              {new Date().toLocaleString(isAR ? 'ar-KW' : 'en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </header>

        {/* Summary */}
        <section className="grid grid-cols-3 gap-4 mb-6 text-center">
          <SummaryTile label={t('report.ordersCount')} value={orders.length.toString()} />
          <SummaryTile
            label={t('report.itemsCount')}
            value={orders.reduce((n, o) => n + o.itemsCount, 0).toString()}
          />
          <SummaryTile
            label={t('report.revenue')}
            value={`${formatPrice(totalRevenue, locale)} ${currency}`}
          />
        </section>

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="text-[10px] tracking-widest uppercase text-gray-500 border-b border-gray-400">
              <th className="py-2 text-start">{t('orders.colOrder')}</th>
              <th className="py-2 text-start">{t('orders.colCustomer')}</th>
              <th className="py-2 text-start">{t('orders.colPhone')}</th>
              <th className="py-2 text-start">{t('orders.colGovernorate')}</th>
              <th className="py-2 text-center">{t('orders.colItems')}</th>
              <th className="py-2 text-end">{t('orders.colTotal')}</th>
              <th className="py-2 text-start">{t('orders.colStatus')}</th>
              <th className="py-2 text-start">{t('orders.colDate')}</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-gray-500">
                  {t('report.empty')}
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-b border-gray-200 align-top">
                  <td className="py-3 font-medium" dir="ltr">{o.orderNumber}</td>
                  <td className="py-3">
                    <div>{o.customerName}</div>
                    {o.items.length > 0 ? (
                      <ul className="text-[11px] text-gray-600 mt-1 space-y-0.5">
                        {o.items.map((it, idx) => (
                          <li key={idx}>
                            • {isAR ? it.productNameAr : it.productNameEn}
                            {it.category ? (
                              <span className="text-gray-500">
                                {' '}
                                [
                                {t(
                                  `cat.${it.category.toLowerCase()}` as Parameters<typeof t>[0],
                                )}
                                ]
                              </span>
                            ) : null}
                            <span className="text-gray-400">
                              {' '}
                              · {isAR ? it.colorNameAr : it.colorNameEn} · {it.size}
                              {it.quantity > 1 ? ` × ${it.quantity}` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </td>
                  <td className="py-3 text-gray-700" dir="ltr">{o.phone1}</td>
                  <td className="py-3 text-gray-700">
                    <div className="font-medium">
                      {o.governorateName ?? o.countryCode}
                    </div>
                    {o.address ? (
                      <div className="text-[11px] text-gray-500 mt-0.5 whitespace-pre-wrap">
                        {o.address}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-3 text-center">{o.itemsCount}</td>
                  <td className="py-3 text-end">
                    {formatPrice(o.total, locale)} {currency}
                  </td>
                  <td className="py-3 text-gray-700">
                    {t(`orders.status.${o.status.toLowerCase()}` as Parameters<typeof t>[0])}
                  </td>
                  <td className="py-3 text-gray-700">
                    {new Date(o.createdAt).toLocaleDateString(isAR ? 'ar-KW' : 'en-GB')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <footer className="pt-8 mt-8 border-t border-gray-300 text-center text-[10px] tracking-widest uppercase text-gray-500">
          {isAR ? 'ديدا' : 'Deda'} · dedawomenswear.shop
        </footer>
      </div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-300 p-4">
      <div className="text-[10px] tracking-widest uppercase text-gray-500 mb-1">
        {label}
      </div>
      <div className="text-lg font-medium">{value}</div>
    </div>
  );
}
