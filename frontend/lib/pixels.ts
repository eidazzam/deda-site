/**
 * Thin wrappers around the Facebook + TikTok commerce events. All are
 * no-ops when the pixel script hasn't been injected (env IDs empty),
 * so client components don't need to gate the call themselves.
 */

type FbqFn = (event: string, action: string, params?: Record<string, unknown>) => void;
type TtqFn = { track?: (event: string, params?: Record<string, unknown>) => void };

declare global {
  interface Window {
    fbq?: FbqFn;
    ttq?: TtqFn;
  }
}

const CURRENCY = 'EGP';

// Pixel values come in as piastres (the unit prices live as in the DB).
// FB/TikTok expect the value in the major currency unit.
const toMajor = (piastres: number) => piastres / 1000;

export function trackViewContent(payload: {
  productSlug: string;
  productName: string;
  value: number;
}) {
  if (typeof window === 'undefined') return;
  window.fbq?.('track', 'ViewContent', {
    content_ids: [payload.productSlug],
    content_name: payload.productName,
    content_type: 'product',
    value: toMajor(payload.value),
    currency: CURRENCY,
  });
  window.ttq?.track?.('ViewContent', {
    contents: [{ content_id: payload.productSlug, content_name: payload.productName }],
    value: toMajor(payload.value),
    currency: CURRENCY,
  });
}

export function trackAddToCart(payload: {
  productSlug: string;
  productName: string;
  value: number;
  quantity: number;
}) {
  if (typeof window === 'undefined') return;
  window.fbq?.('track', 'AddToCart', {
    content_ids: [payload.productSlug],
    content_name: payload.productName,
    content_type: 'product',
    value: toMajor(payload.value),
    currency: CURRENCY,
  });
  window.ttq?.track?.('AddToCart', {
    contents: [
      {
        content_id: payload.productSlug,
        content_name: payload.productName,
        quantity: payload.quantity,
      },
    ],
    value: toMajor(payload.value),
    currency: CURRENCY,
  });
}

export function trackInitiateCheckout(payload: {
  totalValue: number;
  itemCount: number;
}) {
  if (typeof window === 'undefined') return;
  window.fbq?.('track', 'InitiateCheckout', {
    num_items: payload.itemCount,
    value: toMajor(payload.totalValue),
    currency: CURRENCY,
  });
  window.ttq?.track?.('InitiateCheckout', {
    value: toMajor(payload.totalValue),
    currency: CURRENCY,
  });
}

export function trackPurchase(payload: { orderNumber: string; totalValue: number }) {
  if (typeof window === 'undefined') return;
  window.fbq?.('track', 'Purchase', {
    value: toMajor(payload.totalValue),
    currency: CURRENCY,
    order_id: payload.orderNumber,
  });
  window.ttq?.track?.('CompletePayment', {
    value: toMajor(payload.totalValue),
    currency: CURRENCY,
    order_id: payload.orderNumber,
  });
}
