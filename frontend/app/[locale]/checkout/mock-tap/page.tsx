import { notFound } from 'next/navigation';

import { isLocale, type Locale } from '@/lib/i18n/config';

import { MockTapClient } from './mock-tap-client';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

/**
 * Local-only Tap simulator. The backend's checkout-tap.ts redirects
 * here instead of Tap when TAP_MOCK_MODE is on. Three buttons drive
 * the three real outcomes (CAPTURED / FAILED / CANCELLED) and the
 * client component forwards to /checkout/return so the rest of the
 * flow runs end-to-end.
 */
export default async function MockTapPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ o?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { o } = await searchParams;
  const orderId = Number(o);
  if (!Number.isInteger(orderId) || orderId < 1) notFound();

  return <MockTapClient orderId={orderId} locale={locale as Locale} />;
}
