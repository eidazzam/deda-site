// Size system shared across the storefront, admin uploader, and product
// detail. Deda sells women's wear in standard letter sizes (S–XL) rather
// than the cm-based Gulf abaya scale the fork started from — single
// source of truth so dropdowns, admin, and the size guide stay in sync.

/** Letter sizes for Deda garments. Covers S through XL — the four
 * standard sizes stocked for every piece. */
export const GARMENT_SIZES = ['S', 'M', 'L', 'XL'] as const;

/** Alias kept so the (currently few) upstream imports named
 * `ABAYA_SIZES` keep compiling — behaviour is identical, every
 * product uses the same letter range. */
export const ABAYA_SIZES = GARMENT_SIZES;
export const KIDS_SIZES = GARMENT_SIZES;

/**
 * Sentinel value used in the product detail UI to mark the "make me
 * one in my own measurements" option. When a cart item carries this
 * size, an accompanying `customSize` payload (length + bust + notes)
 * must be present on the same line.
 */
export const CUSTOM_SIZE = 'CUSTOM' as const;

export type GarmentSize = (typeof GARMENT_SIZES)[number];
export type AbayaSize = GarmentSize;
export type KidsSize = GarmentSize;
export type SizeValue = GarmentSize | typeof CUSTOM_SIZE | string;

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

/** Every product shares the same S–XL list, so the category hint from
 * the caller is ignored. Kept for API compatibility with Rozana. */
export function suggestedSizesFor(_category: string | undefined): readonly string[] {
  return GARMENT_SIZES;
}
