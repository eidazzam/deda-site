'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { api } from '@/lib/api/client';
import type { Locale } from '@/lib/i18n/config';
import { trackPurchase } from '@/lib/pixels';
import { useCart } from '@/lib/stores/cart';

type Props = {
  orderId: number;
  locale: Locale;
  isAR: boolean;
  successPath: string;
  cancelPath: string;
  label: {
    confirming: string;
    slow: string;
    ordersTitle: string;
  };
};

const POLL_INTERVAL_MS = 2000;
// 30s of polling covers the Tap webhook latency under normal conditions.
// After that we surface the "we'll email you" message instead of pinning
// the user on a spinner.
const MAX_POLLS = 15;

/**
 * Polls /api/orders/:id/status every couple of seconds after the Tap
 * redirect. On CAPTURED we fire the purchase pixel + clearCart, then
 * forward to /checkout/success. On FAILED/CANCELLED we forward to
 * /checkout/cancel. If 30 seconds pass and the webhook hasn't landed
 * we leave the customer on a "we'll email you" message — the order is
 * still recoverable from the admin side.
 */
export function ReturnPoller({
  orderId,
  isAR,
  successPath,
  cancelPath,
  label,
}: Props) {
  const router = useRouter();
  const clearCart = useCart((s) => s.clear);
  const [slow, setSlow] = useState(false);
  // Guard against double-firing the pixel under React strict-mode + the
  // ref keeps us from spamming router.push if a late tick races the
  // status flip.
  const handled = useRef(false);

  useEffect(() => {
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (handled.current) return;
      attempt += 1;
      try {
        const snap = await api.orders.status(orderId);
        if (snap.paymentStatus === 'CAPTURED') {
          handled.current = true;
          trackPurchase({ orderNumber: snap.orderNumber, totalValue: snap.total });
          clearCart();
          router.replace(`${successPath}?n=${snap.orderNumber}`);
          return;
        }
        if (snap.paymentStatus === 'FAILED' || snap.paymentStatus === 'CANCELLED') {
          handled.current = true;
          router.replace(`${cancelPath}?o=${orderId}`);
          return;
        }
      } catch {
        // Transient errors are fine — next tick will retry.
      }
      if (attempt >= MAX_POLLS) {
        setSlow(true);
        return;
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    void tick();
    return () => {
      handled.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId, router, clearCart, successPath, cancelPath]);

  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center" dir={isAR ? 'rtl' : 'ltr'}>
      <div className="font-display text-3xl mb-6">{label.ordersTitle}</div>
      {!slow ? (
        <>
          {/* Simple spinner — keeps the page lightweight on edge. */}
          <div className="mx-auto w-8 h-8 border-2 border-ink/20 border-t-ink rounded-full animate-spin mb-6" />
          <p className="text-sm text-muted">{label.confirming}</p>
        </>
      ) : (
        <p className="text-sm text-muted">{label.slow}</p>
      )}
    </div>
  );
}
