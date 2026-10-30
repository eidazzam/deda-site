'use client';

import Link from 'next/link';

import { keyOf, selectCartSubtotal, useCart } from '@/lib/stores/cart';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { formatPrice } from '@/lib/format';

import { ArrowIcon } from './icon';

type Props = { locale: Locale; dict: Dictionary };

export function CartPageClient({ locale, dict }: Props) {
  const isAR = locale === 'ar';
  const items = useCart((s) => s.items);
  const updateQty = useCart((s) => s.updateQty);
  const remove = useCart((s) => s.remove);
  const subtotal = useCart(selectCartSubtotal);

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <h1 className="display-xl text-4xl mb-3">{dict.empty}</h1>
        <p className="text-muted mb-8">{dict.emptySub}</p>
        <Link
          href={`/${locale}`}
          className="inline-block bg-ink text-bg text-sm tracking-widest uppercase px-8 py-3 hover:bg-accent transition-colors"
        >
          {dict.continue}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="display-xl text-4xl lg:text-5xl mb-10">{dict.cart}</h1>

      <div className="grid lg:grid-cols-[1fr_380px] gap-10 lg:gap-14">
        <ul className="divide-y divide-border">
          {items.map((it) => {
            const k = keyOf(it);
            const name = isAR ? it.productNameAr : it.productNameEn;
            const colorName = isAR ? it.colorNameAr : it.colorNameEn;
            return (
              <li key={k} className={`py-6 flex gap-4 ${isAR ? 'flex-row-reverse' : ''}`}>
                {it.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.image}
                    alt={name}
                    className="w-24 h-32 object-cover bg-subtle flex-shrink-0"
                  />
                ) : (
                  <div className="w-24 h-32 bg-subtle flex-shrink-0" />
                )}
                <div className={`flex-1 min-w-0 ${isAR ? 'text-right' : ''}`}>
                  <div className="font-medium">{name}</div>
                  <div className="text-sm text-muted mt-1">
                    {colorName} · {it.size}
                  </div>
                  <div
                    className={`flex items-center justify-between mt-4 ${
                      isAR ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <div className="inline-flex items-center border border-border">
                      <button
                        onClick={() => updateQty(k, it.quantity - 1)}
                        className="w-8 h-8 hover:bg-subtle"
                      >
                        −
                      </button>
                      <span className="w-10 text-center text-sm">{it.quantity}</span>
                      <button
                        onClick={() => updateQty(k, it.quantity + 1)}
                        className="w-8 h-8 hover:bg-subtle"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-sm font-medium">
                      {formatPrice(it.unitPrice * it.quantity, locale)} {dict.egp}
                    </div>
                  </div>
                  <button
                    onClick={() => remove(k)}
                    className="mt-3 text-[10px] tracking-widest uppercase text-muted hover:text-accent"
                  >
                    {isAR ? 'إزالة' : 'Remove'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="bg-subtle/50 p-6 lg:p-8 h-fit lg:sticky lg:top-32 space-y-4">
          <div className="text-xs tracking-widest uppercase pb-3 border-b border-border">
            {dict.orderSummary}
          </div>
          <div className={`flex justify-between text-sm ${isAR ? 'flex-row-reverse' : ''}`}>
            <span className="text-muted">{dict.subtotal}</span>
            <span>
              {formatPrice(subtotal, locale)} {dict.egp}
            </span>
          </div>
          <p className="text-[11px] text-muted">
            {isAR
              ? 'الشحن يُحتسب فى صفحة الإتمام حسب المحافظة.'
              : 'Shipping calculated at checkout by governorate.'}
          </p>
          <Link
            href={`/${locale}/checkout`}
            className={`flex items-center justify-center gap-2 w-full bg-ink text-bg text-sm tracking-widest uppercase py-4 hover:bg-accent transition-colors ${
              isAR ? 'flex-row-reverse' : ''
            }`}
          >
            <span>{dict.checkout}</span>
            <ArrowIcon className={`w-4 h-4 ${isAR ? 'rotate-180' : ''}`} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
