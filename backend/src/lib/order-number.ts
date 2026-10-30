/**
 * Customer-facing order number. Internal IDs start at 1 — we shift them
 * by 2900 so the very first order shows as "BA-2901". The legacy build
 * was generating fake numbers in that range, so existing customers expect
 * the same shape.
 */
export function formatOrderNumber(id: number): string {
  return `BA-${(id + 2900).toString().padStart(4, '0')}`;
}
