'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { adminApi, AdminApiError } from '@/lib/admin/api';
import { useAdminI18n } from '@/lib/admin/i18n';
import type { AdminOrderDetail, PaymentMethod, PaymentStatus } from '@/lib/admin/types';
import { formatPrice } from '@/lib/format';

export const runtime = 'edge';

/**
 * A4-friendly invoice view for a single order. Opens in a new tab from
 * the order detail page and triggers the browser's print dialog right
 * away — the admin can then save as PDF or print to physical paper.
 *
 * Labels follow the admin's current language toggle (AR / EN), so the
 * printed copy matches what the rest of the admin UI is showing.
 */
export default function OrderInvoicePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useAdminI18n();
  const id = Number(params.id);

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminApi.orders.detail(id);
        if (cancelled) return;
        setOrder(data);
        setLoading(false);
        // Wait one tick so the layout settles before the print dialog
        // captures the page.
        setTimeout(() => window.print(), 200);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AdminApiError && err.status === 404) {
          router.replace('/admin/orders');
          return;
        }
        setError(err instanceof AdminApiError ? err.message : t('common.failedToLoad'));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router, t]);

  if (loading) {
    return (
      <div className="print-page p-8 text-gray-500">{t('invoice.preparing')}</div>
    );
  }
  if (!order) {
    return (
      <div className="print-page p-8 text-red-600">
        {error ?? t('common.failedToLoad')}
      </div>
    );
  }

  const isAR = locale === 'ar';
  const totalQuantity = order.items.reduce((sum, it) => sum + it.quantity, 0);

  // Localised order-status label uses the orders.* keys already defined
  // for the table on /admin/orders.
  const statusKey = `orders.status.${order.status.toLowerCase()}` as Parameters<typeof t>[0];

  return (
    <div className="print-page">
      {/* Toolbar — hidden when actually printing */}
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

      <div className="max-w-[760px] mx-auto p-10 text-[13px] leading-relaxed">
        {/* Header */}
        <header className="flex items-start justify-between pb-6 border-b border-gray-300">
          <div>
            <div className="text-2xl font-serif italic">
              {isAR ? 'ديدا' : 'Deda'}
            </div>
            <div className="text-[10px] tracking-widest uppercase text-gray-500 mt-1">
              {t('invoice.brandTagline')}
            </div>
            <div className="text-xs text-gray-500 mt-2">dedawomenswear.shop</div>
          </div>
          <div className={isAR ? 'text-left' : 'text-right'}>
            <div className="text-[10px] tracking-widest uppercase text-gray-500">
              {t('invoice.title')}
            </div>
            <div className="text-2xl font-medium tracking-wider" dir="ltr">
              {order.orderNumber}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(order.createdAt).toLocaleString(isAR ? 'ar-KW' : 'en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className={`mt-2 flex items-center gap-1.5 ${isAR ? 'justify-start' : 'justify-end'}`}>
              <StatusPill label={t(statusKey)} tone={statusTone(order.status)} />
            </div>
          </div>
        </header>

        {/* Customer + Shipping */}
        <section className="grid grid-cols-2 gap-6 py-6 border-b border-gray-300">
          <div>
            <div className="text-[10px] tracking-widest uppercase text-gray-500 mb-2">
              {t('invoice.billTo')}
            </div>
            <div className="font-medium">{order.customerName}</div>
            <div className="text-gray-600 mt-1" dir="ltr">{order.phone1}</div>
            {order.phone2 ? (
              <div className="text-gray-600" dir="ltr">{order.phone2}</div>
            ) : null}
          </div>
          <div>
            <div className="text-[10px] tracking-widest uppercase text-gray-500 mb-2">
              {t('invoice.shipTo')}
            </div>
            <div className="text-gray-700 whitespace-pre-wrap">
              {order.address}
            </div>
            <div className="text-gray-600 mt-1">
              {order.governorateName ?? order.countryCode}
            </div>
          </div>
        </section>

        {/* Payment + meta */}
        <section className="grid grid-cols-3 gap-6 py-4 border-b border-gray-300 text-xs">
          <div>
            <div className="text-[10px] tracking-widest uppercase text-gray-500 mb-1">
              {t('invoice.paymentMethod')}
            </div>
            <div className="font-medium">{t(paymentMethodKey(order.paymentMethod))}</div>
          </div>
          <div>
            <div className="text-[10px] tracking-widest uppercase text-gray-500 mb-1">
              {t('invoice.paymentStatus')}
            </div>
            <div className="font-medium">
              {order.paymentStatus
                ? t(paymentStatusKey(order.paymentStatus))
                : order.paymentMethod === 'COD'
                  ? t('invoice.payOnDelivery')
                  : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-widest uppercase text-gray-500 mb-1">
              {t('invoice.itemsCount')}
            </div>
            <div className="font-medium">
              {totalQuantity} {totalQuantity === 1 ? t('invoice.piece') : t('invoice.pieces')} ·{' '}
              {order.items.length} {order.items.length === 1 ? t('invoice.line') : t('invoice.lines')}
            </div>
          </div>
        </section>

        {/* Items */}
        <section className="py-6">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] tracking-widest uppercase text-gray-500 border-b border-gray-300">
                <th className="py-2 text-start">#</th>
                <th className="py-2 text-start">{t('invoice.colItem')}</th>
                <th className="py-2 text-center">{t('invoice.colQty')}</th>
                <th className="py-2 text-end">{t('invoice.colUnit')}</th>
                <th className="py-2 text-end">{t('invoice.colSubtotal')}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, i) => (
                <tr key={i} className="border-b border-gray-200 align-top">
                  <td className="py-3 text-gray-500 text-xs">{i + 1}</td>
                  <td className="py-3">
                    <div className="font-medium">
                      {isAR ? it.productNameAr : it.productNameEn}
                    </div>
                    <div
                      className="text-xs text-gray-500 mt-0.5"
                      dir={isAR ? 'ltr' : 'rtl'}
                    >
                      {isAR ? it.productNameEn : it.productNameAr}
                    </div>
                    <div
                      className="text-[10px] text-gray-500 mt-1 font-mono uppercase tracking-wider"
                      dir="ltr"
                    >
                      {t('invoice.sku')}: {it.productSlug}
                    </div>
                    <div className="text-xs text-gray-700 mt-2 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block w-3 h-3 rounded-full border border-gray-300"
                          style={{ backgroundColor: it.colorHex }}
                        />
                        <span>{isAR ? it.colorNameAr : it.colorNameEn}</span>
                      </span>
                      <span className="text-gray-300">|</span>
                      <span>
                        <span className="text-gray-500 uppercase text-[10px] tracking-wider">
                          {t('invoice.size')}:
                        </span>{' '}
                        <span className="font-medium">{it.size}</span>
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-center font-medium">{it.quantity}</td>
                  <td className="py-3 text-end">
                    {formatPrice(it.unitPrice, locale)} {isAR ? 'د.ك' : 'KWD'}
                  </td>
                  <td className="py-3 text-end font-medium">
                    {formatPrice(it.subtotal, locale)} {isAR ? 'د.ك' : 'KWD'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Totals */}
        <section className={`flex ${isAR ? 'justify-start' : 'justify-end'}`}>
          <div className="w-80 space-y-1.5">
            <Row
              label={t('invoice.subtotal')}
              value={`${formatPrice(order.subtotal, locale)} ${isAR ? 'د.ك' : 'KWD'}`}
            />
            <Row
              label={t('invoice.shipping')}
              value={
                order.shippingFee === 0
                  ? t('invoice.shippingFree')
                  : `${formatPrice(order.shippingFee, locale)} ${isAR ? 'د.ك' : 'KWD'}`
              }
            />
            {order.discount > 0 ? (
              <Row
                label={`${t('invoice.discount')}${order.couponCode ? ` (${order.couponCode})` : ''}`}
                value={`−${formatPrice(order.discount, locale)} ${isAR ? 'د.ك' : 'KWD'}`}
              />
            ) : null}
            <div className="flex justify-between border-t-2 border-gray-700 pt-3 mt-3 font-medium text-lg">
              <span>{t('invoice.total')}</span>
              <span>
                {formatPrice(order.total, locale)} {isAR ? 'د.ك' : 'KWD'}
              </span>
            </div>
          </div>
        </section>

        {order.notes ? (
          <section className="pt-6 mt-6 border-t border-gray-300">
            <div className="text-[10px] tracking-widest uppercase text-gray-500 mb-2">
              {t('invoice.customerNotes')}
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
          </section>
        ) : null}

        {order.adminNotes ? (
          <section className="pt-4 mt-4 border-t border-dashed border-gray-300">
            <div className="text-[10px] tracking-widest uppercase text-gray-500 mb-2">
              {t('invoice.adminNotes')}
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{order.adminNotes}</p>
          </section>
        ) : null}

        {/* Footer */}
        <footer className="pt-10 mt-10 border-t border-gray-300 text-center text-[10px] tracking-widest uppercase text-gray-500 space-y-1">
          <div>{t('invoice.thankYou')}</div>
          <div className="text-gray-400 normal-case tracking-normal">
            {t('invoice.contactLine')}
          </div>
        </footer>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-gray-700">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'gray' | 'blue' | 'green' | 'red' | 'amber';
}) {
  const toneCls = {
    gray:  'bg-gray-100  text-gray-700  border-gray-300',
    blue:  'bg-blue-50   text-blue-700  border-blue-200',
    green: 'bg-green-50  text-green-700 border-green-200',
    red:   'bg-red-50    text-red-700   border-red-200',
    amber: 'bg-amber-50  text-amber-800 border-amber-200',
  }[tone];
  return (
    <span
      className={`inline-block text-[10px] tracking-widest uppercase px-2 py-0.5 border rounded ${toneCls}`}
    >
      {label}
    </span>
  );
}

function statusTone(s: string): 'gray' | 'blue' | 'green' | 'red' | 'amber' {
  switch (s) {
    case 'PENDING':   return 'amber';
    case 'CONFIRMED': return 'blue';
    case 'SHIPPED':   return 'blue';
    case 'DELIVERED': return 'green';
    case 'CANCELLED': return 'red';
    default:          return 'gray';
  }
}

function paymentMethodKey(m: PaymentMethod): Parameters<ReturnType<typeof useAdminI18n>['t']>[0] {
  switch (m) {
    case 'COD':        return 'invoice.method.cod';
    case 'CARD':       return 'invoice.method.card';
    case 'KNET':       return 'invoice.method.knet';
    case 'APPLE_PAY':  return 'invoice.method.applePay';
    case 'GOOGLE_PAY': return 'invoice.method.googlePay';
    case 'MADA':       return 'invoice.method.mada';
    case 'BENEFIT':    return 'invoice.method.benefit';
    default:           return 'invoice.method.cod';
  }
}

function paymentStatusKey(s: PaymentStatus): Parameters<ReturnType<typeof useAdminI18n>['t']>[0] {
  switch (s) {
    case 'INITIATED': return 'invoice.payStatus.initiated';
    case 'CAPTURED':  return 'invoice.payStatus.captured';
    case 'FAILED':    return 'invoice.payStatus.failed';
    case 'CANCELLED': return 'invoice.payStatus.cancelled';
    case 'REFUNDED':  return 'invoice.payStatus.refunded';
    default:          return 'invoice.payStatus.initiated';
  }
}
