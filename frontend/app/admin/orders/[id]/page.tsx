'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { adminApi, AdminApiError } from '@/lib/admin/api';
import type {
  AdminOrderDetail,
  PaymentMethod,
  PaymentStatus,
} from '@/lib/admin/types';
import { formatPrice } from '@/lib/format';

export const runtime = 'edge';

const STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

// Human-friendly labels for the payment enums. Keeping them inline (vs
// a dictionary) since the admin UI is English-only.
function paymentMethodLabel(m: PaymentMethod): string {
  const map: Record<PaymentMethod, string> = {
    COD: '💰 Cash on Delivery',
    CARD: '💳 Card',
    KNET: '🟢 KNET',
    APPLE_PAY: '🍎 Apple Pay',
    GOOGLE_PAY: '🟦 Google Pay',
    MADA: '🟧 Mada',
    BENEFIT: '🟨 Benefit',
  };
  return map[m];
}

function paymentStatusLabel(s: PaymentStatus): string {
  const map: Record<PaymentStatus, string> = {
    INITIATED: 'Awaiting payment',
    CAPTURED: 'Paid',
    FAILED: 'Failed',
    CANCELLED: 'Cancelled',
    REFUNDED: 'Refunded',
  };
  return map[s];
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await adminApi.orders.detail(id);
        if (cancelled) return;
        setOrder(data);
        setNotes(data.adminNotes ?? '');
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AdminApiError && err.status === 404) {
          router.replace('/admin/orders');
          return;
        }
        setError(err instanceof AdminApiError ? err.message : 'Failed to load');
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const updateStatus = async (next: string) => {
    if (!order || savingStatus) return;
    setSavingStatus(true);
    try {
      const updated = await adminApi.orders.update(id, { status: next });
      // Merge so any partial payload still keeps existing fields like items.
      setOrder((curr) => (curr ? { ...curr, ...updated } : updated));
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Update failed');
    } finally {
      setSavingStatus(false);
    }
  };

  const saveNotes = async () => {
    if (!order || savingNotes) return;
    setSavingNotes(true);
    try {
      const updated = await adminApi.orders.update(id, {
        adminNotes: notes.trim() || null,
      });
      setOrder((curr) => (curr ? { ...curr, ...updated } : updated));
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Save failed');
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="px-8 py-10 text-muted">Loading…</div>
    );
  }

  if (!order) {
    return (
      <div className="px-8 py-10">
        <div className="text-accent">{error ?? 'Order not found.'}</div>
        <Link
          href="/admin/orders"
          className="inline-block mt-4 text-[10px] tracking-widest uppercase text-accent hover:underline"
        >
          ← Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="px-8 py-10 max-w-5xl">
      <Link
        href="/admin/orders"
        className="text-[10px] tracking-widest uppercase text-muted hover:text-ink"
      >
        ← Orders
      </Link>
      <div className="flex items-end justify-between gap-4 mt-3 mb-8">
        <div>
          <div className="text-[10px] tracking-widest uppercase text-muted mb-2">
            Order
          </div>
          <h1 className="font-display text-4xl">{order.orderNumber}</h1>
        </div>
        <div className="flex flex-col items-end gap-3">
          <a
            href={`/admin/orders/${order.id}/invoice`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-ink text-bg text-[10px] tracking-widest uppercase px-4 py-2 hover:bg-accent transition-colors"
          >
            Print / PDF invoice
          </a>
          <div className="text-right text-xs text-muted">
            <div>Placed {new Date(order.createdAt).toLocaleString()}</div>
            <div>Updated {new Date(order.updatedAt).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-6">
          {/* Customer */}
          <section className="border border-border p-5">
            <div className="text-[10px] tracking-widest uppercase text-muted mb-4">
              Customer
            </div>
            <Row label="Name" value={order.customerName} />
            <Row label="Phone" value={order.phone1} />
            {order.phone2 ? <Row label="Phone 2" value={order.phone2} /> : null}
            <Row
              label={order.countryCode === 'KW' ? 'Governorate' : 'Country'}
              value={order.governorateName ?? order.countryCode}
            />
            <Row label="Address" value={order.address} multiline />
            {order.notes ? <Row label="Notes" value={order.notes} multiline /> : null}
          </section>

          {/* Payment — Deda is cash-on-delivery, so the only moving
              part here is the paymentStatus the admin flips once the
              courier confirms collection or a refund is issued. */}
          <section className="border border-border p-5">
            <div className="text-[10px] tracking-widest uppercase text-muted mb-4">
              Payment
            </div>
            <Row label="Method" value={paymentMethodLabel(order.paymentMethod)} />
            {order.paymentStatus ? (
              <Row label="Status" value={paymentStatusLabel(order.paymentStatus)} />
            ) : null}
          </section>

          {/* Items */}
          <section className="border border-border">
            <div className="px-5 py-4 border-b border-border text-[10px] tracking-widest uppercase text-muted">
              Items ({order.items.length})
            </div>
            <table className="w-full text-sm">
              <tbody>
                {order.items.map((it, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <div className="font-medium">{it.productNameEn}</div>
                      <div className="text-xs text-muted">
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                          style={{ backgroundColor: it.colorHex }}
                        />
                        {it.colorNameEn} · {it.size}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center w-20">×{it.quantity}</td>
                    <td className="px-5 py-3 text-right w-32 font-medium">
                      {formatPrice(it.subtotal, 'en')} KWD
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Admin notes */}
          <section className="border border-border p-5">
            <div className="text-[10px] tracking-widest uppercase text-muted mb-3">
              Internal notes
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Customer called and confirmed by phone…"
              className="w-full bg-bg border border-border px-3 py-2 text-sm focus:border-ink outline-none resize-none"
            />
            <button
              onClick={saveNotes}
              disabled={savingNotes || notes === (order.adminNotes ?? '')}
              className="mt-3 bg-ink text-bg text-[10px] tracking-widest uppercase px-4 py-2 hover:bg-accent transition-colors disabled:opacity-50"
            >
              {savingNotes ? 'Saving…' : 'Save notes'}
            </button>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-6 self-start">
          <div className="bg-subtle/40 p-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span>{formatPrice(order.subtotal, 'en')} KWD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Shipping</span>
              <span>{formatPrice(order.shippingFee, 'en')} KWD</span>
            </div>
            {order.discount > 0 ? (
              <div className="flex justify-between text-accent">
                <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                <span>−{formatPrice(order.discount, 'en')} KWD</span>
              </div>
            ) : null}
            <div className="flex justify-between pt-3 border-t border-border font-medium text-base">
              <span>Total</span>
              <span className="font-display text-lg">
                {formatPrice(order.total, 'en')} KWD
              </span>
            </div>
          </div>

          <div className="border border-border p-5">
            <div className="text-[10px] tracking-widest uppercase text-muted mb-3">
              Status
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  disabled={savingStatus}
                  className={`text-left text-xs tracking-widest uppercase px-3 py-2 border transition-colors ${
                    order.status === s
                      ? 'bg-ink text-bg border-ink'
                      : 'border-border hover:border-ink'
                  } disabled:opacity-50`}
                >
                  {s.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-3 py-2 text-sm border-b border-border last:border-0">
      <span className="text-[10px] tracking-widest uppercase text-muted">
        {label}
      </span>
      <span className={multiline ? 'whitespace-pre-wrap' : ''}>{value}</span>
    </div>
  );
}
