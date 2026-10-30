import type { Locale } from '@/lib/i18n/config';
import { formatPrice } from '@/lib/format';

type Props = {
  basePrice: number;
  discount: number | null;
  locale: Locale;
  egpLabel: string;
  size?: 'sm' | 'md' | 'lg';
};

/**
 * Displays the price with a struck-through original next to it when
 * the product has a discount. Sizes map to typography presets we use
 * inside cards (sm), in carts (md), and on product detail (lg).
 */
export function PriceTag({ basePrice, discount, locale, egpLabel, size = 'sm' }: Props) {
  const cls =
    size === 'lg'
      ? 'text-2xl font-display'
      : size === 'md'
        ? 'text-base font-medium'
        : 'text-sm font-medium';

  if (discount !== null && discount < basePrice) {
    return (
      <span className="inline-flex items-baseline gap-2">
        <span className={`${cls} text-accent`}>
          {formatPrice(discount, locale)} {egpLabel}
        </span>
        <span className="text-xs text-muted line-through">
          {formatPrice(basePrice, locale)}
        </span>
      </span>
    );
  }

  return (
    <span className={cls}>
      {formatPrice(basePrice, locale)} {egpLabel}
    </span>
  );
}
