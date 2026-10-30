import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CartPageClient } from '@/components/cart-page-client';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildMetadata } from '@/lib/seo';

export const runtime = 'edge';

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
    title: dict.cart,
    pathFromLocaleRoot: '/cart',
    noIndex: true,
  });
}

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);

  return (
    <div className="max-w-page mx-auto px-6 lg:px-10 py-10 lg:py-16 animate-fade-up">
      <CartPageClient locale={locale as Locale} dict={dict} />
    </div>
  );
}
