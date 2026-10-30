import type { Locale } from './i18n/config';

/**
 * Converts a price stored as piastres (1 EGP = 100 piastres) to an EGP
 * string using Latin digits. Egypt conventionally shows up to 2 fraction
 * digits — we trim trailing zeros so 29900 piastres reads as "299" not
 * "299.00", and 29950 piastres reads as "299.5".
 *
 * The `locale` parameter is kept for API compatibility but ignored —
 * prices always render in Latin digits (0–9) because the merchant
 * prefers them to look identical across the storefront, the invoice,
 * and the report regardless of whether the surrounding UI is Arabic
 * or English. Arabic readers handle Latin price numerals fluently and
 * it removes any ambiguity for couriers reading the printed PDF.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function formatPrice(piastres: number, _locale: Locale): string {
  const egp = piastres / 100;
  return egp.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
