import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CheckoutPageClient } from '@/components/checkout-page-client';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale as Locale);
  return buildMetadata({
    locale: locale as Locale,
    title: dict.checkoutTitle,
    pathFromLocaleRoot: '/checkout',
    noIndex: true,
  });
}

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);

  return (
    <div className="max-w-page mx-auto px-6 lg:px-10 py-10 lg:py-16 animate-fade-up">
      <h1 className="display-xl text-4xl lg:text-5xl mb-10">{dict.checkoutTitle}</h1>
      {/* Browser-side fetch — Cloudflare Pages edge can't reach
          api.dedawomenswear.shop reliably from the same zone. */}
      <CheckoutPageClient locale={locale as Locale} dict={dict} />
    </div>
  );
}
