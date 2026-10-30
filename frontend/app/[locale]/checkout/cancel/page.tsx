import Link from 'next/link';
import { notFound } from 'next/navigation';

import { isLocale, type Locale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

/**
 * Customers land here when Tap reports a failed or cancelled charge. We
 * keep the order intact (status PENDING, paymentStatus FAILED) so the
 * admin still sees it in the dashboard and can reach out, or so the
 * customer can re-open the cart and try again.
 */
export default async function CheckoutCancelPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ o?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const isAR = locale === 'ar';
  const { o } = await searchParams;

  return (
    <div
      className="max-w-md mx-auto px-6 py-24 text-center animate-fade-up"
      dir={isAR ? 'rtl' : 'ltr'}
    >
      <div className="text-5xl mb-4">😕</div>
      <h1 className="font-display text-3xl mb-3">
        {isAR ? 'لم يكتمل الدفع' : 'Payment was not completed'}
      </h1>
      <p className="text-sm text-muted mb-8">
        {isAR
          ? 'يبدو أن الدفع تمّ إلغاؤه أو فشل. لم يتم تحصيل أي مبلغ، وطلبك لا يزال محفوظًا.'
          : 'It looks like the payment was cancelled or failed. No charge was made, and your order is still saved.'}
      </p>

      <div className="space-y-3">
        <Link
          href={`/${locale}`}
          className="block w-full bg-ink text-bg text-sm tracking-widest uppercase py-3 hover:bg-accent transition-colors"
        >
          {isAR ? 'العودة للتسوّق' : 'Back to shop'}
        </Link>
        <Link
          href={`/${locale}/checkout`}
          className="block w-full border border-border text-sm tracking-widest uppercase py-3 hover:border-ink transition-colors"
        >
          {isAR ? 'حاول الدفع مرة أخرى' : 'Try checkout again'}
        </Link>
      </div>

      {o ? (
        <p className="mt-8 text-[11px] text-muted">
          {isAR ? 'رقم الطلب' : 'Order ref'}: #{o}
        </p>
      ) : null}
    </div>
  );
}
