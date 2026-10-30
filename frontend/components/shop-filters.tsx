'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { ColorGroup } from '@/lib/api/types';
import { ABAYA_SIZES, KIDS_SIZES } from '@/lib/sizes';

// Colour swatches for the filter sidebar. The hex is just the chip colour
// (a representative tone) — the API still groups by ColorGroup enum.
const COLOR_OPTIONS: Array<{ group: ColorGroup; hex: string; labelEn: string; labelAr: string }> = [
  { group: 'WHITE', hex: '#f5f0e6', labelEn: 'White', labelAr: 'أبيض' },
  { group: 'BLACK', hex: '#1a1a1a', labelEn: 'Black', labelAr: 'أسود' },
  { group: 'GRAY', hex: '#9a9a9a', labelEn: 'Gray', labelAr: 'رمادى' },
  { group: 'BEIGE', hex: '#d4c4a8', labelEn: 'Beige', labelAr: 'بيج' },
  { group: 'BROWN', hex: '#5a3a28', labelEn: 'Brown', labelAr: 'بنى' },
  { group: 'BLUE', hex: '#1e2a44', labelEn: 'Blue', labelAr: 'أزرق' },
  { group: 'GREEN', hex: '#7a7d4a', labelEn: 'Green', labelAr: 'أخضر' },
  { group: 'ORANGE', hex: '#c87456', labelEn: 'Terracotta', labelAr: 'ترّاكوتا' },
  { group: 'RED', hex: '#8b2a2a', labelEn: 'Red', labelAr: 'أحمر' },
];

type Props = {
  locale: Locale;
  dict: Dictionary;
  selectedColors: ColorGroup[];
  selectedSizes: string[];
  selectedSort: 'newest' | 'oldest' | 'price-asc' | 'price-desc';
  /** Which slug we're filtering inside — drives the size list (adult vs kids). */
  category: string;
};

export function ShopFilters({
  locale,
  dict,
  selectedColors,
  selectedSizes,
  selectedSort,
  category,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAR = locale === 'ar';

  // Helper that builds a new querystring with one key changed.
  const replaceParam = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === '') next.delete(k);
        else next.set(k, v);
      }
      // Reset to page 1 whenever filters change so we don't show an empty page.
      next.delete('page');
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const toggleColor = (group: ColorGroup) => {
    const next = selectedColors.includes(group)
      ? selectedColors.filter((g) => g !== group)
      : [...selectedColors, group];
    replaceParam({ color: next.length > 0 ? next.join(',') : null });
  };

  const toggleSize = (size: string) => {
    const next = selectedSizes.includes(size)
      ? selectedSizes.filter((s) => s !== size)
      : [...selectedSizes, size];
    replaceParam({ size: next.length > 0 ? next.join(',') : null });
  };

  const setSort = (sort: typeof selectedSort) => replaceParam({ sort });
  const clearAll = () => router.push(pathname);
  const hasAny =
    selectedColors.length > 0 ||
    selectedSizes.length > 0 ||
    selectedSort !== 'newest';

  // Kids categories show the small size scale (28-32). Everything else uses
  // the adult abaya scale (50-60, plus 62).
  const sizeOptions = category === 'kids' ? KIDS_SIZES : ABAYA_SIZES;

  return (
    <aside className="space-y-8 lg:sticky lg:top-32 lg:self-start">
      <div className="flex items-center justify-between">
        <div className="text-xs tracking-widest uppercase text-muted">
          {isAR ? 'تصفية' : 'Filter'}
        </div>
        {hasAny ? (
          <button
            onClick={clearAll}
            className="text-[10px] tracking-widest uppercase text-accent hover:underline"
          >
            {isAR ? 'مسح' : 'Clear'}
          </button>
        ) : null}
      </div>

      {/* Colour filter — removed at the merchant's request: every abaya
          is largely styled around the same neutral palette and the colour
          chips were adding clutter without filtering value. The
          COLOR_OPTIONS constant and the ColorGroup query plumbing stay
          in place so it can be reinstated later by re-adding this block. */}

      {/* Size */}
      <div>
        <div className="text-[11px] tracking-widest uppercase mb-3">
          {dict.size}
        </div>
        <div className="flex flex-wrap gap-2">
          {sizeOptions.map((s) => {
            const selected = selectedSizes.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggleSize(s)}
                className={`min-w-10 h-9 px-2.5 text-sm border transition-colors ${
                  selected
                    ? 'bg-ink text-bg border-ink'
                    : 'bg-bg text-ink border-border hover:border-ink'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort */}
      <div>
        <div className="text-[11px] tracking-widest uppercase mb-3">{dict.sort}</div>
        <div className="space-y-1.5">
          {(
            [
              ['newest', dict.newest],
              ['price-asc', dict.priceLowHigh],
              ['price-desc', dict.priceHighLow],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setSort(value)}
              className={`block text-sm text-${isAR ? 'right' : 'left'} w-full hover:text-accent transition-colors ${
                selectedSort === value ? 'text-ink font-medium' : 'text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
