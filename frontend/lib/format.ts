import type { Locale } from './i18n/config';

/**
 * Converts a price stored as fils (1 KWD = 1000 fils) to a KWD string
 * using Latin digits. Kuwait conventionally shows up to 3 fraction
 * digits, but we trim trailing zeros so 22000 fils reads as "22" not
 * "22.000".
 *
 * The `locale` parameter is kept for API compatibility but ignored —
 * prices always render in Latin digits (0–9) because the merchant
 * prefers them to look identical across the storefront, the invoice,
 * and the report regardless of whether the surrounding UI is Arabic
 * or English. Arabic readers handle Latin price numerals fluently and
 * it removes any ambiguity for couriers reading the printed PDF.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function formatPrice(fils: number, _locale: Locale): string {
  const kwd = fils / 1000;
  return kwd.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}
