'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { api, ApiError } from '@/lib/api/client';
import type { CheckoutPaymentMethod, Country, Governorate } from '@/lib/api/types';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { formatPrice } from '@/lib/format';
import { trackInitiateCheckout, trackPurchase } from '@/lib/pixels';
import { keyOf, selectCartSubtotal, useCart } from '@/lib/stores/cart';

type Props = {
  locale: Locale;
  dict: Dictionary;
  governorates: Governorate[];
  countries: Country[];
};

export function CheckoutClient({ locale, dict, governorates, countries }: Props) {
  const router = useRouter();
  const isAR = locale === 'ar';
  const items = useCart((s) => s.items);
  const subtotal = useCart(selectCartSubtotal);
  const clearCart = useCart((s) => s.clear);

  const [name, setName] = useState('');
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [countryCode, setCountryCode] = useState('EG');
  const [govName, setGovName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  // Deda is cash-on-delivery only — no radio, no state.
  const paymentMethod: CheckoutPaymentMethod = 'COD';
  const [submitting, setSubmitting] = useState(false);

  const isEgypt = countryCode === 'EG';
  const gov = isEgypt ? governorates.find((g) => g.nameEn === govName) ?? null : null;
  const country = !isEgypt ? countries.find((c) => c.code === countryCode) ?? null : null;

  // Free-shipping promo has been retired — shipping is always billed
  // at the destination's rate.
  const destinationSelected = isEgypt ? gov !== null : country !== null;
  const baseShippingFee = isEgypt ? (gov?.shippingFee ?? 0) : (country?.shippingFee ?? 0);
  const isFreeShipping = false;
  const shipping = baseShippingFee;
  const total = Math.max(0, subtotal + shipping);

  // Fire the marketing event once when this page first becomes
  // useful — i.e. there are items in the cart. Only fires per mount.
  useEffect(() => {
    if (items.length === 0) return;
    trackInitiateCheckout({
      totalValue: subtotal,
      itemCount: items.reduce((sum, it) => sum + it.quantity, 0),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit =
    name.trim().length >= 2 &&
    phone1.trim().length >= 8 &&
    destinationSelected &&
    address.trim().length >= 5 &&
    items.length > 0 &&
    !submitting;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !destinationSelected) return;
    setSubmitting(true);
    try {
      const order = await api.orders.create({
        customerName: name.trim(),
        phone1: phone1.trim(),
        phone2: phone2.trim() ? phone2.trim() : null,
        countryCode,
        governorateName: isEgypt ? gov!.nameEn : null,
        address: address.trim(),
        notes: notes.trim() ? notes.trim() : null,
        couponCode: null,
        paymentMethod,
        items: items.map((it) => ({
          productSlug: it.productSlug,
          colorNameEn: it.colorNameEn,
          size: it.size,
          quantity: it.quantity,
        })),
      });

      // COD-only — no payment-gateway hop. Fire the pixel, clear the
      // cart, land on the success page.
      trackPurchase({ orderNumber: order.orderNumber, totalValue: order.total });
      clearCart();
      router.push(`/${locale}/checkout/success?n=${order.orderNumber}`);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : isAR
            ? 'حصل خطأ. حاول مرة أخرى.'
            : 'Something went wrong. Try again.';
      toast.error(message);
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <h2 className="font-display text-3xl mb-3">{dict.empty}</h2>
        <p className="text-muted">{dict.emptySub}</p>
      </div>
    );
  }

  const inputCls =
    'w-full bg-bg border border-border px-4 py-3 focus:border-ink outline-none';

  return (
    <form onSubmit={onSubmit} className="grid lg:grid-cols-[1fr_400px] gap-10 lg:gap-16">
      <div className="space-y-8">
        <div>
          <div className="text-xs tracking-widest uppercase mb-5 pb-3 border-b border-border">
            {dict.contactInfo}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={dict.name} required full>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={(e) => setName(e.target.value)}
                autoComplete="name"
                className={inputCls}
                required
              />
            </Field>
            <Field label={dict.phone1} required>
              <input
                type="tel"
                value={phone1}
                onChange={(e) => setPhone1(e.target.value)}
                onBlur={(e) => setPhone1(e.target.value)}
                autoComplete="tel"
                className={inputCls}
                required
              />
            </Field>
            <Field label={dict.phone2}>
              <input
                type="tel"
                value={phone2}
                onChange={(e) => setPhone2(e.target.value)}
                onBlur={(e) => setPhone2(e.target.value)}
                autoComplete="tel-national"
                className={inputCls}
              />
            </Field>
            <Field label={isAR ? 'الدولة' : 'Country'} required full>
              <select
                value={countryCode}
                onChange={(e) => {
                  setCountryCode(e.target.value);
                  if (e.target.value !== 'EG') setGovName('');
                }}
                className={inputCls}
                required
              >
                <option value="EG">{isAR ? 'مصر' : 'Egypt'}</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {isAR ? c.nameAr : c.nameEn} ({formatPrice(c.shippingFee, locale)} {dict.egp})
                  </option>
                ))}
              </select>
            </Field>
            {isEgypt ? (
              <Field label={dict.governorate} required full>
                <select
                  value={govName}
                  onChange={(e) => setGovName(e.target.value)}
                  className={inputCls}
                  required
                >
                  <option value="">{dict.selectGov}</option>
                  {governorates.map((g) => (
                    <option key={g.nameEn} value={g.nameEn}>
                      {isAR ? g.nameAr : g.nameEn} ({formatPrice(g.shippingFee, locale)} {dict.egp})
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field label={dict.address} required full>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onBlur={(e) => setAddress(e.target.value)}
                autoComplete="street-address"
                rows={3}
                className={`${inputCls} resize-none`}
                required
              />
            </Field>
            <Field label={dict.notes} full>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={`${inputCls} resize-none`}
              />
            </Field>
          </div>
        </div>

        {/* Payment is COD-only — single informational row, no choice
            to make. The order lands as PENDING in the admin and the
            courier collects cash on delivery. */}
        <div>
          <div className="text-xs tracking-widest uppercase mb-5 pb-3 border-b border-border">
            {isAR ? 'طريقة الدفع' : 'Payment method'}
          </div>
          <div className="border border-border bg-subtle/40 px-4 py-3">
            <div className="text-sm font-medium">
              💵 {isAR ? 'الدفع عند الاستلام' : 'Cash on delivery'}
            </div>
            <p className="text-xs text-muted mt-1">
              {isAR
                ? 'ادفع نقداً للمندوب عند وصول الطلب.'
                : 'Pay cash to the courier when your order arrives.'}
            </p>
          </div>
        </div>
      </div>

      <aside className="bg-subtle/50 p-6 lg:p-8 h-fit lg:sticky lg:top-32">
        <div className="text-xs tracking-widest uppercase mb-5 pb-3 border-b border-border">
          {dict.orderSummary}
        </div>

        <ul className="space-y-4 mb-6">
          {items.map((it) => {
            const k = keyOf(it);
            const name = isAR ? it.productNameAr : it.productNameEn;
            const colorName = isAR ? it.colorNameAr : it.colorNameEn;
            return (
              <li key={k} className={`flex gap-3 ${isAR ? 'flex-row-reverse' : ''}`}>
                {it.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.image}
                    alt={name}
                    className="w-14 h-16 object-cover bg-bg flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-16 bg-bg flex-shrink-0" />
                )}
                <div className={`flex-1 min-w-0 ${isAR ? 'text-right' : ''}`}>
                  <div className="text-xs font-medium truncate">{name}</div>
                  <div className="text-[10px] text-muted">
                    {colorName} · {it.size} × {it.quantity}
                  </div>
                </div>
                <div className="text-xs font-medium whitespace-nowrap">
                  {formatPrice(it.unitPrice * it.quantity, locale)} {dict.egp}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="space-y-2.5 py-4 border-t border-border text-sm">
          <div className={`flex justify-between ${isAR ? 'flex-row-reverse' : ''}`}>
            <span className="text-muted">{dict.subtotal}</span>
            <span>
              {formatPrice(subtotal, locale)} {dict.egp}
            </span>
          </div>
          <div className={`flex justify-between ${isAR ? 'flex-row-reverse' : ''}`}>
            <span className="text-muted">{dict.shippingFee}</span>
            <span>
              {destinationSelected
                ? isFreeShipping
                  ? (
                      <span className="text-accent font-medium">
                        {isAR ? 'مجاني' : 'FREE'}
                      </span>
                    )
                  : `${formatPrice(shipping, locale)} ${dict.egp}`
                : '—'}
            </span>
          </div>
        </div>

        <div
          className={`flex justify-between font-medium text-lg pt-4 border-t border-border mb-6 ${
            isAR ? 'flex-row-reverse' : ''
          }`}
        >
          <span>{dict.total}</span>
          <span className="font-display text-xl">
            {formatPrice(total, locale)} {dict.egp}
          </span>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-ink text-bg text-sm tracking-widest uppercase py-4 hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? '...' : dict.placeOrder}
        </button>

        <p className="text-[10px] text-muted text-center mt-3">{dict.paymentNote}</p>
      </aside>
    </form>
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
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-xs tracking-widest uppercase mb-2 text-muted">
        {label} {required ? <span className="text-accent">*</span> : null}
      </label>
      {children}
    </div>
  );
}
