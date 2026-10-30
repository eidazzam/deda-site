import { notFound } from 'next/navigation';

import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

import { ReturnPoller } from './return-poller';

// Edge runtime + dynamic — the customer lands here straight from Tap's
// hosted page, so SSR must not cache the response and the page must
// re-render per request.
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

/**
 * Landing page after a Tap redirect. The customer arrives with
 *   /{locale}/checkout/return?o={orderId}
 * and the client component polls /api/orders/:id/status until the
 * webhook has flipped the paymentStatus, then sends them on to the
 * success or cancel page.
 */
export default async function CheckoutReturnPage({
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

  const dict = getDictionary(locale as Locale);

  return (
    <ReturnPoller
      orderId={orderId}
      locale={locale as Locale}
      isAR={locale === 'ar'}
      successPath={`/${locale}/checkout/success`}
      cancelPath={`/${locale}/checkout/cancel`}
      label={{
        confirming: locale === 'ar' ? 'جارٍ تأكيد الدفع…' : 'Confirming your payment…',
        slow:
          locale === 'ar'
            ? 'الإجراء يأخذ وقتاً أطول من المعتاد. سنرسل تأكيداً بمجرد تسجيل الدفع.'
            : 'This is taking longer than usual. We will email you once the payment lands.',
        ordersTitle: dict.checkoutTitle,
      }}
    />
  );
}
