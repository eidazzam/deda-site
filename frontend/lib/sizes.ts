// Size system shared across the storefront, admin uploader, and product
// detail. Lengths are in centimetres — the standard Gulf abaya measure.
// Keep these arrays the single source of truth so the dropdowns and the
// size guide stay in sync.

/** Standard adult abaya lengths (cm). Full Gulf range — every cm
 * 50–60, plus 62 for taller fits. */
export const ABAYA_SIZES = [
  '50',
  '51',
  '52',
  '53',
  '54',
  '55',
  '56',
  '57',
  '58',
  '59',
  '60',
  '62',
] as const;

/** Kids' abaya lengths (cm). Standard Gulf children range in 2-cm
 * steps from 24 up to 48 — covers ~2 years old through pre-teen. */
export const KIDS_SIZES = [
  '24',
  '26',
  '28',
  '30',
  '32',
  '34',
  '36',
  '38',
  '40',
  '42',
  '44',
  '46',
  '48',
] as const;

/**
 * Sentinel value used in the product detail UI to mark the "make me
 * one in my own measurements" option. When a cart item carries this
 * size, an accompanying `customSize` payload (length + bust + notes)
 * must be present on the same line.
 */
export const CUSTOM_SIZE = 'CUSTOM' as const;

export type AbayaSize = (typeof ABAYA_SIZES)[number];
export type KidsSize = (typeof KIDS_SIZES)[number];
export type SizeValue = AbayaSize | KidsSize | typeof CUSTOM_SIZE | string;

/**
 * Shape the customer fills in when they pick "Custom size". Numeric
 * fields are stored as raw strings so we don't lose leading zeros or
 * fractional cm; the backend treats the whole thing as opaque text.
 */
export type CustomSizeInput = {
  /** Total length head-to-hem in cm. */
  length: string;
  /** Chest/bust circumference in cm. Optional for kids items. */
  bust?: string;
  /** Sleeve length in cm. Optional. */
  sleeve?: string;
  /** Free-text notes — anything the tailor should know. */
  notes?: string;
};

/** Picks the right size list to suggest based on the product category. */
export function suggestedSizesFor(category: string | undefined): readonly string[] {
  if (!category) return ABAYA_SIZES;
  if (category.toLowerCase() === 'kids') return KIDS_SIZES;
  return ABAYA_SIZES;
}
