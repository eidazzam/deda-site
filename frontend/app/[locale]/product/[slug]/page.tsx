import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ProductPageClient } from '@/components/product-page-client';
import { api } from '@/lib/api/client';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  try {
    const product = await api.products.bySlug(slug, { cache: 'no-store' });
    const isAR = locale === 'ar';
    const title = isAR ? product.nameAr : product.nameEn;
    const description = (isAR ? product.descriptionAr : product.descriptionEn)
      .slice(0, 200);
    const image =
      product.images[0]?.url ?? product.variants[0]?.images[0]?.url ?? null;
    return buildMetadata({
      locale: locale as Locale,
      title,
      description,
      image,
      pathFromLocaleRoot: `/product/${slug}`,
    });
  } catch {
    return buildMetadata({
      locale: locale as Locale,
      title: 'Product',
      pathFromLocaleRoot: `/product/${slug}`,
      noIndex: true,
    });
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);

  return (
    <div className="max-w-page mx-auto px-6 lg:px-10 py-10 lg:py-16 animate-fade-up">
      {/* Browser-side fetch — the Cloudflare Pages edge can't reach
          api.dedawomenswear.shop from the same zone, so we render the shell
          server-side and pull the product on the client. */}
      <ProductPageClient slug={slug} locale={locale as Locale} dict={dict} />
    </div>
  );
}
