'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ApiDownNotice } from '@/components/api-down-notice';
import { ProductDetailClient } from '@/components/product-detail-client';
import { api, ApiError } from '@/lib/api/client';
import type { ProductDetail } from '@/lib/api/types';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';

type Props = {
  slug: string;
  locale: Locale;
  dict: Dictionary;
};

/**
 * Browser-side loader for the product detail page. Cloudflare Pages edge
 * can't reach api.dedawomenswear.shop from inside the same zone, so we render
 * the shell server-side and pull the product from the browser where
 * CORS is wired up.
 */
export function ProductPageClient({ slug, locale, dict }: Props) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'notfound' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    api.products
      .bySlug(slug, { cache: 'no-store' })
      .then((res) => {
        if (cancelled) return;
        setProduct(res);
        setState('ok');
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setState('notfound');
        } else {
          console.error('Product fetch failed', err);
          setState('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state === 'loading') {
    return <ProductSkeleton />;
  }

  if (state === 'notfound') {
    const isAR = locale === 'ar';
    return (
      <section className="max-w-md mx-auto text-center py-24 px-6">
        <div className="text-xs tracking-widest uppercase text-muted mb-3">
          404
        </div>
        <h1 className="font-display text-3xl mb-3">
          {isAR ? 'المنتج غير موجود' : 'Product not found'}
        </h1>
        <p className="text-muted text-sm leading-relaxed mb-6">
          {isAR
            ? 'الرابط لم يعد متاحاً. تصفّحي المجموعة بدلاً من ذلك.'
            : "The link is no longer available. Browse the collection instead."}
        </p>
        <Link
          href={`/${locale}/shop/all`}
          className="inline-flex items-center gap-2 text-sm tracking-widest uppercase border-b border-ink pb-2 hover:border-accent hover:text-accent transition-colors"
        >
          {dict.shopCollection}
        </Link>
      </section>
    );
  }

  if (state === 'error' || !product) {
    return <ApiDownNotice locale={locale} />;
  }

  return <ProductDetailClient product={product} locale={locale} dict={dict} />;
}

function ProductSkeleton() {
  return (
    <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 animate-pulse">
      <div className="aspect-[3/4] bg-subtle" />
      <div className="space-y-4">
        <div className="h-4 w-32 bg-subtle" />
        <div className="h-10 w-3/4 bg-subtle" />
        <div className="h-5 w-1/3 bg-subtle" />
        <div className="h-px w-full bg-border my-6" />
        <div className="h-4 w-full bg-subtle" />
        <div className="h-4 w-5/6 bg-subtle" />
        <div className="h-4 w-2/3 bg-subtle" />
        <div className="h-12 w-full bg-subtle mt-8" />
      </div>
    </div>
  );
}
