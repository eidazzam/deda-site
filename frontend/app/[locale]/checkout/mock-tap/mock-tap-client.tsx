'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api, ApiError } from '@/lib/api/client';
import type { Locale } from '@/lib/i18n/config';

type Props = {
  orderId: number;
  locale: Locale;
};

type Snapshot = {
  orderNumber: string;
  total: number;
};

// Which mock screen is currently visible. Mirrors the real Tap flow:
// pick → (card form if Card) → submit → return page polls.
type View = 'pick' | 'card';

/**
 * Stand-in for Tap's hosted page during local development.
 *
 * Step 1 — payment method picker (KNET / Card / Apple Pay).
 * Step 2 — if Card, a card form to enter test details before "paying".
 *          KNET / Apple Pay skip step 2 because in real life Tap hands
 *          off to KNET's portal / the system sheet, with no card form.
 *
 * Submitting calls /api/checkout/tap/mock-simulate to flip Payment +
 * Order.paymentStatus and then forwards to /checkout/return, which is
 * where the polling page picks up the change and routes onward to
 * success or cancel. None of the card fields are sent anywhere — they
 * exist only so the visual fidelity matches the real hosted page.
 */
export function MockTapClient({ orderId, locale }: Props) {
  const router = useRouter();
  const isAR = locale === 'ar';

  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [view, setView] = useState<View>('pick');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Card-form state — purely cosmetic.
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('12/29');
  const [cardCvv, setCardCvv] = useState('123');
  const [cardName, setCardName] = useState('TEST CUSTOMER');

  useEffect(() => {
    let cancelled = false;
    api.orders
      .status(orderId)
      .then((s) => {
        if (cancelled) return;
        setSnap({ orderNumber: s.orderNumber, total: s.total });
      })
      .catch(() => {
        if (!cancelled) setError(isAR ? 'تعذّر تحميل الطلب' : 'Failed to load order');
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, isAR]);

  const formatKwd = (fils: number) =>
    (fils / 1000).toLocaleString(isAR ? 'ar-KW' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });

  const submit = async (
    outcome: 'CAPTURED' | 'FAILED' | 'CANCELLED',
    method: 'KNET' | 'CARD' | 'APPLE_PAY' = 'KNET',
  ) => {
    setBusy(`${outcome}-${method}`);
    setError(null);
    try {
      await api.checkout.mockSimulate(orderId, outcome, method);
      router.replace(`/${locale}/checkout/return?o=${orderId}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Mock failed';
      setError(msg);
      setBusy(null);
    }
  };

  // -------- Step 2: card form --------
  if (view === 'card') {
    return (
      <div
        className="max-w-md mx-auto px-6 py-12 animate-fade-up"
        dir={isAR ? 'rtl' : 'ltr'}
      >
        <MockBanner isAR={isAR} />
        <Header isAR={isAR} snap={snap} formatKwd={formatKwd} error={error} />

        <div className="border border-border p-5 space-y-4 bg-bg">
          <div className="text-[10px] tracking-widest uppercase text-muted">
            💳 {isAR ? 'بيانات البطاقة' : 'Card details'}
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-muted">
                {isAR ? 'رقم البطاقة' : 'Card number'}
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4242 4242 4242 4242"
                className="mt-1 w-full bg-bg border border-border px-3 py-2.5 font-mono tracking-wide focus:border-ink outline-none"
                dir="ltr"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-muted">
                  {isAR ? 'تاريخ الانتهاء' : 'Expiry'}
                </span>
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  placeholder="MM/YY"
                  className="mt-1 w-full bg-bg border border-border px-3 py-2.5 font-mono focus:border-ink outline-none"
                  dir="ltr"
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted">CVV</span>
                <input
                  type="text"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value)}
                  placeholder="123"
                  className="mt-1 w-full bg-bg border border-border px-3 py-2.5 font-mono focus:border-ink outline-none"
                  dir="ltr"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs text-muted">
                {isAR ? 'اسم حامل البطاقة' : 'Cardholder name'}
              </span>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value.toUpperCase())}
                className="mt-1 w-full bg-bg border border-border px-3 py-2.5 focus:border-ink outline-none"
                dir="ltr"
              />
            </label>
          </div>

          <button
            onClick={() => submit('CAPTURED', 'CARD')}
            disabled={busy !== null || !snap}
            className="w-full bg-ink text-bg text-sm tracking-widest uppercase py-3.5 hover:bg-accent transition-colors disabled:opacity-50"
          >
            {busy === 'CAPTURED-CARD'
              ? '…'
              : isAR
                ? `ادفع ${snap ? formatKwd(snap.total) : ''} د.ك`
                : `Pay ${snap ? formatKwd(snap.total) : ''} KWD`}
          </button>

          <div className="flex justify-between text-xs">
            <button
              onClick={() => submit('FAILED', 'CARD')}
              disabled={busy !== null}
              className="text-accent hover:underline"
            >
              {isAR ? 'محاكاة فشل الدفع' : 'Simulate decline'}
            </button>
            <button
              onClick={() => setView('pick')}
              disabled={busy !== null}
              className="text-muted hover:text-ink"
            >
              {isAR ? '← العودة لاختيار طريقة الدفع' : '← back to methods'}
            </button>
          </div>

          <p className="text-[10px] text-muted text-center pt-2 border-t border-border">
            {isAR
              ? 'هذه نموذج محاكاة. بيانات البطاقة لا تُرسل لأي مكان.'
              : 'This is a mock form. Card data is never sent anywhere.'}
          </p>
        </div>
      </div>
    );
  }

  // -------- Step 1: method picker --------
  return (
    <div
      className="max-w-md mx-auto px-6 py-16 animate-fade-up"
      dir={isAR ? 'rtl' : 'ltr'}
    >
      <MockBanner isAR={isAR} />
      <Header isAR={isAR} snap={snap} formatKwd={formatKwd} error={error} />

      <div className="text-[10px] tracking-widest uppercase text-muted mb-3">
        {isAR ? 'اختر طريقة الدفع' : 'Choose payment method'}
      </div>

      <div className="space-y-3">
        <button
          onClick={() => submit('CAPTURED', 'KNET')}
          disabled={busy !== null || !snap}
          className="w-full flex items-center justify-between gap-3 bg-ink text-bg text-sm uppercase tracking-widest py-3.5 px-5 hover:bg-accent transition-colors disabled:opacity-50"
        >
          <span>🟢 {isAR ? 'الدفع بـ KNET' : 'Pay with KNET'}</span>
          <span className="text-[10px] opacity-70">→</span>
        </button>
        <button
          onClick={() => setView('card')}
          disabled={busy !== null || !snap}
          className="w-full flex items-center justify-between gap-3 border-2 border-ink text-ink text-sm uppercase tracking-widest py-3.5 px-5 hover:bg-ink hover:text-bg transition-colors disabled:opacity-50"
        >
          <span>💳 {isAR ? 'بطاقة (Visa / Mastercard)' : 'Card (Visa / Mastercard)'}</span>
          <span className="text-[10px] opacity-70">→</span>
        </button>
        <button
          onClick={() => submit('CAPTURED', 'APPLE_PAY')}
          disabled={busy !== null || !snap}
          className="w-full flex items-center justify-between gap-3 border border-border text-ink text-sm uppercase tracking-widest py-3.5 px-5 hover:border-ink transition-colors disabled:opacity-50"
        >
          <span>🍎 {isAR ? 'Apple Pay' : 'Apple Pay'}</span>
          <span className="text-[10px] opacity-70">→</span>
        </button>
      </div>

      <div className="my-8 border-t border-border" />

      <div className="text-[10px] tracking-widest uppercase text-muted mb-3">
        {isAR ? 'سيناريوهات اختبار' : 'Test scenarios'}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => submit('FAILED', 'KNET')}
          disabled={busy !== null || !snap}
          className="border border-accent text-accent text-xs tracking-widest uppercase py-3 hover:bg-accent hover:text-bg transition-colors disabled:opacity-50"
        >
          {busy === 'FAILED-KNET' ? '…' : isAR ? '❌ فشل دفع' : '❌ Failure'}
        </button>
        <button
          onClick={() => submit('CANCELLED', 'KNET')}
          disabled={busy !== null || !snap}
          className="border border-border text-muted text-xs tracking-widest uppercase py-3 hover:border-ink hover:text-ink transition-colors disabled:opacity-50"
        >
          {busy === 'CANCELLED-KNET' ? '…' : isAR ? '⏪ إلغاء' : '⏪ Cancel'}
        </button>
      </div>
    </div>
  );
}

// ---- shared bits ----------------------------------------------------------

function MockBanner({ isAR }: { isAR: boolean }) {
  return (
    <div className="mb-6 border-2 border-dashed border-accent/40 bg-accent/5 px-4 py-3 text-xs tracking-widest uppercase text-accent">
      🧪 {isAR ? 'وضع المحاكاة (Mock)' : 'Mock Simulator'}
      <span className="opacity-60 normal-case tracking-normal ms-2">
        {isAR
          ? 'TAP_MOCK_MODE=true. بدون اتصال حقيقي بـ Tap.'
          : 'TAP_MOCK_MODE=true. No real Tap calls.'}
      </span>
    </div>
  );
}

function Header({
  isAR,
  snap,
  formatKwd,
  error,
}: {
  isAR: boolean;
  snap: Snapshot | null;
  formatKwd: (n: number) => string;
  error: string | null;
}) {
  return (
    <div className="border border-border p-6 mb-6">
      <div className="text-[10px] tracking-widest uppercase text-muted mb-2">
        Deda · Tap (simulated)
      </div>
      <div className="font-display text-2xl mb-1">
        {isAR ? 'إتمام الدفع' : 'Complete payment'}
      </div>
      <div className="text-sm text-muted">
        {snap ? (
          <>
            <div>
              {isAR ? 'رقم الطلب' : 'Order'}:{' '}
              <span className="font-mono">{snap.orderNumber}</span>
            </div>
            <div>
              {isAR ? 'المبلغ' : 'Amount'}:{' '}
              <span className="text-ink font-medium">
                {formatKwd(snap.total)} {isAR ? 'د.ك' : 'KWD'}
              </span>
            </div>
          </>
        ) : error ? (
          <span className="text-accent">{error}</span>
        ) : (
          <span>{isAR ? 'جارٍ التحميل…' : 'Loading…'}</span>
        )}
      </div>
    </div>
  );
}
