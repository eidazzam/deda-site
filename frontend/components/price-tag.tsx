import type { Locale } from '@/lib/i18n/config';
import { formatPrice } from '@/lib/format';

type Props = {
  basePrice: number;
  discount: number | null;
  locale: Locale;
  egpLabel: string;
  size?: 'sm' | 'md' | 'lg';
  /** Shows a "limited time" chip under the price when the product is
   *  discounted. Enabled on the product detail page; cards keep it off
   *  to avoid visual noise in dense grids. */
  showLimitedBadge?: boolean;
};

/**
 * Displays the price with a struck-through original next to it when
 * the product has a discount. Sizes map to typography presets we use
 * inside cards (sm), in carts (md), and on product detail (lg).
 */
export function PriceTag({
  basePrice,
  discount,
  locale,
  egpLabel,
  size = 'sm',
  showLimitedBadge = false,
}: Props) {
  const cls =
    size === 'lg'
      ? 'text-2xl font-display'
      : size === 'md'
        ? 'text-base font-medium'
        : 'text-sm font-medium';
  const isAR = locale === 'ar';

  if (discount !== null && discount < basePrice) {
    return (
      <span className="inline-flex flex-col items-start gap-1">
        <span className="inline-flex items-baseline gap-2">
          <span className={`${cls} text-accent`}>
            {formatPrice(discount, locale)} {egpLabel}
          </span>
          <span className="text-xs text-muted line-through">
            {formatPrice(basePrice, locale)}
          </span>
        </span>
        {showLimitedBadge ? (
          <span className="inline-block bg-ink text-accent text-[10px] tracking-widest uppercase px-2 py-0.5">
            {isAR ? 'فقط ولفترة محدودة' : 'Limited time offer'}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span className={cls}>
      {formatPrice(basePrice, locale)} {egpLabel}
    </span>
  );
}
