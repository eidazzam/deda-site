/**
 * Pricing helpers. Coupon validation lived here in the Rozana fork but
 * Deda doesn't run promo codes, so the Coupon/CouponType types + the
 * validateCoupon function were dropped alongside the schema prune.
 * Only the per-unit price helper remains.
 */

/**
 * Effective price per unit for a product — the discount field overrides
 * basePrice when set.
 */
export function unitPriceOf(product: { basePrice: number; discount: number | null }): number {
  return product.discount ?? product.basePrice;
}
