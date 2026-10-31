'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { api, ApiError } from '@/lib/api/client';
import type { CheckoutPaymentMethod, Country, Governorate } from '@/lib/api/types';
import { formatPrice } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { trackInitiateCheckout, trackPurchase } from '@/lib/pixels';
import { keyOf, selectCartSubtotal, useCart } from '@/lib/stores/cart';

import { CloseIcon } from './icon';

type Props = {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  dict: Dictionary;
};

/**
 * Side drawer that combines the cart + checkout into a single step.
 * Opens when an item is added or when the bag icon is clicked; the form
 * lives right next to the items so the visitor never leaves the page to
 * finish the order.
 */
export function CartDrawer({ open, onClose, locale, dict }: Props) {
  const router = useRouter();
  const isAR = locale === 'ar';
  const items = useCart((s) => s.items);
  const remove = useCart((s) => s.remove);
  const updateQty = useCart((s) => s.updateQty);
  const clearCart = useCart((s) => s.clear);
  const subtotal = useCart(selectCartSubtotal);

  // ---- form state -----------------------------------------------------------
  const [name, setName] = useState('');
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  // Country defaults to Egypt — most visitors. Switching to anything else
  // hides the governorate dropdown and uses the country's flat fee instead.
  const [countryCode, setCountryCode] = useState('EG');
  const [govName, setGovName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Deda is cash-on-delivery only — no radio, no state.
  const paymentMethod: CheckoutPaymentMethod = 'COD';

  // ---- server data ----------------------------------------------------------
  // Lazy-load the governorate + country lists the first time the drawer
  // opens, then cache inside the component until navigation.
  const [governorates, setGovernorates] = useState<Governorate[] | null>(null);
  const [countries, setCountries] = useState<Country[] | null>(null);
  const [destinationsError, setDestinationsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (governorates !== null && countries !== null) return;
    Promise.all([
      governorates === null
        ? api.governorates.list({ cache: 'no-store' })
        : Promise.resolve(governorates),
      countries === null
        ? api.countries.list({ cache: 'no-store' })
        : Promise.resolve(countries),
    ])
      .then(([govs, ctys]) => {
        setGovernorates(govs);
        setCountries(ctys);
      })
      .catch(() => {
        setGovernorates(governorates ?? []);
        setCountries(countries ?? []);
        setDestinationsError(
          isAR ? 'تعذّر تحميل خيارات الشحن' : 'Failed to load shipping options',
        );
      });
  }, [open, governorates, countries, isAR]);

  // Fire the pixel event once per drawer open (when there are items in it).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open || items.length === 0) return;
    trackInitiateCheckout({
      totalValue: subtotal,
      itemCount: items.reduce((s, it) => s + it.quantity, 0),
    });
  }, [open]);

  const isEgypt = countryCode === 'EG';
  const gov = useMemo(
    () => (isEgypt ? governorates?.find((g) => g.nameEn === govName) ?? null : null),
    [governorates, govName, isEgypt],
  );
  const country = useMemo(
    () => (!isEgypt ? countries?.find((c) => c.code === countryCode) ?? null : null),
    [countries, countryCode, isEgypt],
  );

  // Free-shipping promo has been retired — shipping is always billed at
  // the destination's rate. Keeping the placeholders named the same so
  // the summary row below still renders unchanged.
  const destinationSelected = isEgypt ? gov !== null : country !== null;
  const baseShippingFee = isEgypt ? (gov?.shippingFee ?? 0) : (country?.shippingFee ?? 0);
  const isFreeShipping = false;
  const shipping = baseShippingFee;
  const total = Math.max(0, subtotal + shipping);

  // List the still-missing pieces so we can surface them under the
  // submit button rather than just greying it out silently.
  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (name.trim().length < 2) missing.push(dict.name);
    if (phone1.trim().length < 8) missing.push(dict.phone1);
    if (isEgypt && govName.length === 0) missing.push(dict.governorate);
    if (address.trim().length < 5) missing.push(dict.address);
    return missing;
  }, [name, phone1, govName, address, dict, isEgypt]);

  const canSubmit = missingFields.length === 0 && items.length > 0 && !submitting;

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

      // COD-only — no payment-gateway hop. Pixel fires immediately,
      // cart is cleared, customer lands on the success page.
      trackPurchase({ orderNumber: order.orderNumber, totalValue: order.total });
      clearCart();
      onClose();
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

  const inputCls =
    'w-full bg-bg border border-border px-3 py-2.5 text-sm focus:border-ink outline-none';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50"
            aria-hidden="true"
          />

          <motion.aside
            key="drawer"
            initial={{ x: isAR ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: isAR ? '-100%' : '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 32 }}
            className={`fixed top-0 ${
              isAR ? 'left-0' : 'right-0'
            } h-full w-full sm:w-[440px] bg-bg z-50 flex flex-col shadow-2xl`}
            aria-label={dict.cart}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="font-display text-2xl">
                {dict.cart}{' '}
                <span className="text-muted text-base">
                  ({items.reduce((n, it) => n + it.quantity, 0)})
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:text-accent transition-colors"
                aria-label="Close cart"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="font-display text-2xl mb-2">{dict.empty}</div>
                <p className="text-muted mb-6">{dict.emptySub}</p>
                <button
                  onClick={onClose}
                  className="bg-ink text-bg text-sm tracking-widest uppercase px-8 py-3 hover:bg-accent transition-colors"
                >
                  {dict.continue}
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="flex-1 flex flex-col min-h-0">
                {/* Scrollable middle: items + form */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
                  {/* Items */}
                  <ul className="space-y-5">
                    {items.map((it) => {
                      const k = keyOf(it);
                      return (
                        <li
                          key={k}
                          className={`flex gap-4 ${isAR ? 'flex-row-reverse' : ''}`}
                        >
                          {it.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={it.image}
                              alt={isAR ? it.productNameAr : it.productNameEn}
                              className="w-20 h-24 object-cover flex-shrink-0 bg-subtle"
                            />
                          ) : (
                            <div className="w-20 h-24 bg-subtle flex-shrink-0" />
                          )}
                          <div className={`flex-1 min-w-0 ${isAR ? 'text-right' : ''}`}>
                            <div className="text-sm font-medium leading-tight truncate">
                              {isAR ? it.productNameAr : it.productNameEn}
                            </div>
                            <div className="text-xs text-muted mt-1">
                              {isAR ? it.colorNameAr : it.colorNameEn} · {it.size}
                            </div>
                            <div
                              className={`flex items-center justify-between mt-3 ${
                                isAR ? 'flex-row-reverse' : ''
                              }`}
                            >
                              <div className="inline-flex items-center border border-border">
                                <button
                                  type="button"
                                  onClick={() => updateQty(k, it.quantity - 1)}
                                  className="w-8 h-8 hover:bg-subtle"
                                  aria-label="Decrease quantity"
                                >
                                  −
                                </button>
                                <span className="w-8 text-center text-sm">
                                  {it.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQty(k, it.quantity + 1)}
                                  className="w-8 h-8 hover:bg-subtle"
                                  aria-label="Increase quantity"
                                >
                                  +
                                </button>
                              </div>
                              <div className="text-sm font-medium">
                                {formatPrice(it.unitPrice * it.quantity, locale)} {dict.egp}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => remove(k)}
                              className="text-[10px] tracking-widest uppercase text-muted hover:text-accent mt-3"
                            >
                              {isAR ? 'إزالة' : 'Remove'}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Contact form */}
                  <div className="pt-4 border-t border-border space-y-3">
                    <div className="text-[10px] tracking-widest uppercase text-muted">
                      {dict.contactInfo}
                    </div>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={(e) => setName(e.target.value)}
                      placeholder={dict.name + ' *'}
                      autoComplete="name"
                      required
                      className={inputCls}
                    />
                    <input
                      type="tel"
                      value={phone1}
                      onChange={(e) => setPhone1(e.target.value)}
                      onBlur={(e) => setPhone1(e.target.value)}
                      placeholder={dict.phone1 + ' *'}
                      autoComplete="tel"
                      required
                      className={inputCls}
                    />
                    <input
                      type="tel"
                      value={phone2}
                      onChange={(e) => setPhone2(e.target.value)}
                      onBlur={(e) => setPhone2(e.target.value)}
                      placeholder={dict.phone2}
                      autoComplete="tel-national"
                      className={inputCls}
                    />
                    <select
                      value={countryCode}
                      onChange={(e) => {
                        setCountryCode(e.target.value);
                        // Reset governorate if switching away from Egypt.
                        if (e.target.value !== 'EG') setGovName('');
                      }}
                      required
                      className={inputCls}
                    >
                      <option value="EG">
                        {isAR ? 'مصر' : 'Egypt'}
                      </option>
                      {countries?.map((c) => (
                        <option key={c.code} value={c.code}>
                          {isAR ? c.nameAr : c.nameEn} ({formatPrice(c.shippingFee, locale)} {dict.egp})
                        </option>
                      ))}
                    </select>
                    {isEgypt ? (
                      <select
                        value={govName}
                        onChange={(e) => setGovName(e.target.value)}
                        required
                        className={inputCls}
                      >
                        <option value="">{dict.selectGov} *</option>
                        {governorates?.map((g) => (
                          <option key={g.nameEn} value={g.nameEn}>
                            {isAR ? g.nameAr : g.nameEn} ({formatPrice(g.shippingFee, locale)} {dict.egp})
                          </option>
                        ))}
                      </select>
                    ) : null}
                    {destinationsError ? (
                      <div className="text-[11px] text-accent">{destinationsError}</div>
                    ) : null}
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      onBlur={(e) => setAddress(e.target.value)}
                      placeholder={dict.address + ' *'}
                      autoComplete="street-address"
                      required
                      rows={2}
                      className={`${inputCls} resize-none`}
                    />
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={dict.notes}
                      rows={2}
                      className={`${inputCls} resize-none`}
                    />

                    {/* Payment is COD-only — single informational row,
                        no choice to make. Keeps the layout honest about
                        what the customer is agreeing to on submit. */}
                    <div className="pt-3 border border-border bg-subtle/40 px-3 py-2.5 text-sm">
                      💵 {isAR
                        ? 'الدفع عند الاستلام نقداً للمندوب'
                        : 'Cash on delivery — pay the courier on arrival'}
                    </div>
                  </div>
                </div>

                {/* Sticky bottom: totals + submit */}
                <div className="border-t border-border px-5 py-4 space-y-3 bg-bg">
                  <div className="space-y-1.5 text-sm">
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
                    <div
                      className={`flex justify-between font-medium text-base pt-2 border-t border-border ${
                        isAR ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <span>{dict.total}</span>
                      <span className="font-display text-lg">
                        {formatPrice(total, locale)} {dict.egp}
                      </span>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full bg-ink text-bg text-sm tracking-widest uppercase py-4 hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submitting ? '...' : dict.placeOrder}
                  </button>
                  {missingFields.length > 0 ? (
                    // Explicit nudge so a disabled button doesn't look broken —
                    // the visitor sees exactly which field is still empty.
                    <p className="text-[11px] text-accent text-center">
                      {isAR
                        ? `املأ: ${missingFields.join('، ')}`
                        : `Please fill: ${missingFields.join(', ')}`}
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted text-center">
                      {dict.paymentNote}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={clearCart}
                    className="block w-full text-[10px] tracking-widest uppercase text-muted hover:text-accent text-center"
                  >
                    {isAR ? 'إفراغ السلة' : 'Clear cart'}
                  </button>
                </div>
              </form>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
