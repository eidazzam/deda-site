/**
 * Thin Tap Payments client. Wraps the four endpoints we actually use —
 * create charge, retrieve charge, refund, and webhook-signature check —
 * and throws TapError on every non-2xx so callers can pattern-match on
 * .code without inspecting raw fetch responses.
 *
 * We deliberately don't pull in the official "tap" npm package: the
 * surface area we need is small, and a hand-rolled wrapper makes
 * sandbox-vs-live swaps + observability much easier.
 *
 * The user's secret key picks sandbox vs live automatically — Tap routes
 * requests based on the `sk_test_` vs `sk_live_` prefix, so we never
 * need to switch the BASE_URL.
 */
import crypto from 'node:crypto';

import { env } from '../config/env.js';

export class TapError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public raw?: unknown,
  ) {
    super(message);
    this.name = 'TapError';
  }
}

// Returns true when a Tap secret key has been configured. Routes call
// this before talking to Tap and degrade gracefully (400 + clear error)
// when the integration hasn't been provisioned yet.
//
// Mock mode counts as "configured" — the init route branches on
// isTapMockMode() to skip the real network call and return our own
// hosted simulator page.
export function isTapConfigured(): boolean {
  if (env.TAP_MOCK_MODE) return true;
  return Boolean(env.TAP_SECRET_KEY && env.TAP_SECRET_KEY.startsWith('sk_'));
}

export function isTapMockMode(): boolean {
  return env.TAP_MOCK_MODE === true;
}

async function tapFetch<T>(path: string, init: RequestInit): Promise<T> {
  if (!env.TAP_SECRET_KEY) {
    throw new TapError(
      'TAP_NOT_CONFIGURED',
      'TAP_SECRET_KEY is not set',
      503,
    );
  }
  const res = await fetch(`${env.TAP_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.TAP_SECRET_KEY}`,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const body: unknown = text ? safeJson(text) : null;
  if (!res.ok) {
    const errors = (body as { errors?: { code?: string; description?: string }[] })?.errors;
    const first = errors?.[0];
    throw new TapError(
      first?.code ?? `TAP_${res.status}`,
      first?.description ?? `Tap request failed (${res.status})`,
      res.status,
      body,
    );
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ---------------------------------------------------------------------------
// Charges
// ---------------------------------------------------------------------------

export type CreateChargeInput = {
  // Major-currency-unit amount (e.g. 29 for 29 KWD), not fils. Tap takes
  // amounts in major units regardless of how we store them internally.
  amount: number;
  currency: 'KWD';
  description: string;
  // Used as Tap's idempotency / merchant transaction reference so duplicate
  // create-charge calls return the same charge instead of a new one.
  referenceTransaction: string;
  customer: {
    firstName: string;
    phone: string;
    email?: string | null;
  };
  redirectUrl: string;
  webhookUrl: string;
};

export type TapCharge = {
  id: string;
  status: TapChargeStatus;
  amount: number;
  currency: string;
  source?: { payment_method?: string };
  transaction?: { url?: string };
  reference?: { transaction?: string };
};

// Mirrors the subset of statuses Tap returns that we care about. Tap has
// a few more (e.g. ABANDONED, VOID) — they all map onto FAILED in our DB.
export type TapChargeStatus =
  | 'INITIATED'
  | 'IN_PROGRESS'
  | 'CAPTURED'
  | 'AUTHORIZED'
  | 'FAILED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'ABANDONED'
  | 'VOID';

export async function createCharge(input: CreateChargeInput): Promise<TapCharge> {
  return tapFetch<TapCharge>('/v2/charges', {
    method: 'POST',
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      threeDSecure: true,
      save_card: false,
      description: input.description,
      reference: { transaction: input.referenceTransaction },
      customer: {
        first_name: input.customer.firstName,
        email: input.customer.email ?? `${input.customer.phone}@dedawomenswear.shop`,
        phone: { country_code: '965', number: input.customer.phone.replace(/\D/g, '') },
      },
      // "src_all" tells Tap to render every method enabled on the merchant
      // account (KNET + Cards + Apple Pay + …) on the hosted page.
      source: { id: 'src_all' },
      redirect: { url: input.redirectUrl },
      post: { url: input.webhookUrl },
    }),
  });
}

export async function retrieveCharge(chargeId: string): Promise<TapCharge> {
  return tapFetch<TapCharge>(`/v2/charges/${encodeURIComponent(chargeId)}`, {
    method: 'GET',
  });
}

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

export type TapRefund = {
  id: string;
  status: 'IN_PROGRESS' | 'PROCESSED' | 'FAILED';
  amount: number;
  currency: string;
  charge_id: string;
};

export async function refundCharge(
  chargeId: string,
  amountMajor: number,
  reason = 'Customer refund',
): Promise<TapRefund> {
  return tapFetch<TapRefund>('/v2/refunds', {
    method: 'POST',
    body: JSON.stringify({
      charge_id: chargeId,
      amount: amountMajor,
      currency: 'KWD',
      reason,
    }),
  });
}

// ---------------------------------------------------------------------------
// Webhook signature
// ---------------------------------------------------------------------------

/**
 * Tap signs every webhook with HMAC-SHA256 over a deterministic string
 * built from the charge fields. They send the signature in the
 * `hashstring` header alongside the raw payload. We rebuild the same
 * string on our side and compare in constant time.
 *
 * Spec: https://www.tap.company/kw/en/integrations/webhook
 */
export function verifyWebhookSignature(
  headers: Record<string, string | string[] | undefined>,
  payload: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    // Tap nests these under `reference` and `transaction` rather than
    // top-level — we read them out below.
    reference?: { gateway?: string; payment?: string };
    transaction?: { created?: number | string };
  },
): boolean {
  if (!env.TAP_WEBHOOK_SECRET) return false;
  const incoming = String(headers['hashstring'] ?? headers['Hashstring'] ?? '');
  if (!incoming) return false;

  // Tap signs amounts with 3-decimal formatting (e.g. "32.000" for 32 KWD)
  // even though their JSON payload encodes the number without trailing
  // zeros. Verified empirically against real webhooks — see commit history.
  // The other fields live nested under `reference` and `transaction`
  // despite the docs describing them as flat names.
  const gatewayRef = payload.reference?.gateway ?? '';
  const paymentRef = payload.reference?.payment ?? '';
  const created = payload.transaction?.created ?? '';
  const toSign = [
    `x_id${payload.id}`,
    `x_amount${Number(payload.amount).toFixed(3)}`,
    `x_currency${payload.currency}`,
    `x_gateway_reference${gatewayRef}`,
    `x_payment_reference${paymentRef}`,
    `x_status${payload.status}`,
    `x_created${created}`,
  ].join('');

  const expected = crypto
    .createHmac('sha256', env.TAP_WEBHOOK_SECRET)
    .update(toSign)
    .digest('hex');

  // Constant-time compare to avoid leaking length info via timing.
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(incoming, 'utf8'),
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------

// Collapse Tap's wider status vocabulary onto our PaymentStatus enum.
export function mapTapStatusToPaymentStatus(
  status: string,
): 'INITIATED' | 'CAPTURED' | 'FAILED' | 'CANCELLED' {
  const s = status.toUpperCase();
  if (s === 'CAPTURED' || s === 'AUTHORIZED') return 'CAPTURED';
  if (s === 'CANCELLED') return 'CANCELLED';
  if (s === 'INITIATED' || s === 'IN_PROGRESS') return 'INITIATED';
  return 'FAILED';
}
