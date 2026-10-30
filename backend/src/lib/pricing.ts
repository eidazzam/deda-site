import type { Prisma, Coupon } from '@prisma/client';
import { CouponType } from '@prisma/client';

export type CouponInvalidReason =
  | 'not-found'
  | 'inactive'
  | 'expired'
  | 'exhausted'
  | 'min-order-not-met';

export type CouponValidation =
  | { valid: true; discount: number; coupon: Coupon }
  | { valid: false; reason: CouponInvalidReason };

/**
 * Validate a coupon against a given subtotal and return the discount
 * amount in piastres (EGP). Accepts either the main PrismaClient or a
 * transaction client — passing the tx client during order creation keeps
 * the read inside the same transaction.
 */
export async function validateCoupon(
  db: Prisma.TransactionClient | { coupon: Prisma.CouponDelegate },
  rawCode: string,
  subtotal: number,
): Promise<CouponValidation> {
  const code = rawCode.trim().toUpperCase();
  const coupon = await db.coupon.findUnique({ where: { code } });

  if (!coupon) return { valid: false, reason: 'not-found' };
  if (!coupon.isActive) return { valid: false, reason: 'inactive' };
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return { valid: false, reason: 'expired' };
  }
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, reason: 'exhausted' };
  }
  if (coupon.minOrderAmount !== null && subtotal < coupon.minOrderAmount) {
    return { valid: false, reason: 'min-order-not-met' };
  }

  let discount =
    coupon.type === CouponType.PERCENT
      ? Math.floor((subtotal * coupon.value) / 100)
      : coupon.value;

  if (coupon.maxDiscount !== null && discount > coupon.maxDiscount) {
    discount = coupon.maxDiscount;
  }
  // Never discount more than the subtotal itself.
  discount = Math.min(discount, subtotal);

  return { valid: true, discount, coupon };
}

/**
 * Effective price per unit for a product — the discount field overrides
 * basePrice when set.
 */
export function unitPriceOf(product: { basePrice: number; discount: number | null }): number {
  return product.discount ?? product.basePrice;
}
