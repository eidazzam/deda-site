import Link from 'next/link';
import { notFound } from 'next/navigation';

import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

export const runtime = 'edge';

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ n?: string }>;
}) {
  const { locale } = await params;
  const { n: orderNumber } = await searchParams;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);
  const isAR = locale === 'ar';

  return (
    <div className="max-w-md mx-auto text-center py-24 px-6">
      <svg
        viewBox="0 0 80 80"
        className="w-20 h-20 mx-auto mb-8 text-accent"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="40" cy="40" r="34" />
        <path d="M26 41l10 10 18-22" />
      </svg>

      <h1 className="display-xl text-3xl lg:text-4xl mb-4">{dict.confirmTitle}</h1>
      {orderNumber ? (
        <div className="text-xs tracking-widest uppercase text-muted mb-4">
          {isAR ? 'رقم الطلب' : 'Order number'}{' '}
          <span className="text-ink font-medium">{orderNumber}</span>
        </div>
      ) : null}
      <p className="text-muted leading-relaxed mb-10">{dict.confirmSub}</p>

      <Link
        href={`/${locale}`}
        className="inline-block bg-ink text-bg text-sm tracking-widest uppercase px-8 py-3 hover:bg-accent transition-colors"
      >
        {dict.backHome}
      </Link>
    </div>
  );
}
