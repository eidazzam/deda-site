import type { ProductColor } from '@/lib/api/types';

type Props = {
  colors: ProductColor[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  locale?: 'en' | 'ar';
};

/**
 * A row of colour pills. Used as a static row inside product cards
 * (no onSelect) and as the interactive picker on the product page
 * (with onSelect). Out-of-stock colours render with a diagonal slash.
 */
export function ColorSwatches({
  colors,
  selectedIndex,
  onSelect,
  size = 'sm',
  showLabel = false,
  locale = 'en',
}: Props) {
  const dim = size === 'md' ? 'w-7 h-7' : size === 'sm' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <div className="flex items-center gap-2">
      {colors.map((c, i) => {
        const selected = selectedIndex === i;
        const isOut = c.status === 'OUT_OF_STOCK';
        const baseLabel = locale === 'ar' ? c.colorNameAr : c.colorNameEn;
        const label = isOut
          ? `${baseLabel} — ${locale === 'ar' ? 'غير متاح' : 'out of stock'}`
          : baseLabel;

        const className = [
          'relative rounded-full transition-transform',
          dim,
          selected
            ? 'ring-2 ring-offset-2 ring-offset-bg ring-ink'
            : 'ring-1 ring-border',
          onSelect && !isOut ? 'cursor-pointer hover:scale-110' : '',
          isOut ? 'opacity-60' : '',
        ]
          .filter(Boolean)
          .join(' ');

        const swatchStyle = { backgroundColor: c.colorHex };
        const sharedProps = {
          className,
          style: swatchStyle,
          'aria-label': label,
          title: label,
        };

        const slash = isOut ? (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                'linear-gradient(to top right, transparent calc(50% - 0.5px), #c87456 calc(50% - 0.5px), #c87456 calc(50% + 0.5px), transparent calc(50% + 0.5px))',
            }}
          />
        ) : null;

        if (onSelect && !isOut) {
          return (
            <button
              key={`${c.colorNameEn}-${i}`}
              type="button"
              onClick={() => onSelect(i)}
              {...sharedProps}
            >
              {slash}
            </button>
          );
        }

        return (
          <span key={`${c.colorNameEn}-${i}`} {...sharedProps}>
            {slash}
          </span>
        );
      })}
      {showLabel && selectedIndex !== undefined && colors[selectedIndex] ? (
        <span className="text-xs text-muted ml-2">
          {locale === 'ar'
            ? colors[selectedIndex].colorNameAr
            : colors[selectedIndex].colorNameEn}
        </span>
      ) : null}
    </div>
  );
}
