'use client';

import { useEffect, useState } from 'react';

import { ProductCard } from '@/components/product-card';
import { api } from '@/lib/api/client';
import type { ProductCard as ProductCardData } from '@/lib/api/types';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';

type Props = {
  locale: Locale;
  dict: Dictionary;
};

/**
 * Featured + bestsellers strip on the homepage. Moved to the browser
 * because the Cloudflare Pages edge can't reach api.dedawomenswear.shop
 * from inside the same zone, which silently swallowed all API data
 * when this ran in the Server Component.
 */
export function HomeDataSection({ locale, dict }: Props) {
  const [data, setData] = useState<{
    featured: ProductCardData[];
    bestsellers: ProductCardData[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.products.list({ isFeatured: true, limit: 6 }, { cache: 'no-store' }),
      api.products.list({ isBestSeller: true, limit: 6 }, { cache: 'no-store' }),
    ])
      .then(([featured, bestsellers]) => {
        if (cancelled) return;
        setData({
          featured: featured.items,
          bestsellers: bestsellers.items,
        });
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Home data fetch failed', err);
        setData(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="max-w-page mx-auto px-6 lg:px-10 mt-24 lg:mt-32">
        <div className="h-10 w-48 bg-subtle animate-pulse mb-10" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10 lg:gap-x-6 lg:gap-y-14">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-subtle animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (
    !data ||
    (data.featured.length === 0 && data.bestsellers.length === 0)
  ) {
    return null;
  }

  return (
    <>
      {data.featured.length > 0 ? (
        <section className="max-w-page mx-auto px-6 lg:px-10 mt-24 lg:mt-32">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="display-xl text-4xl lg:text-5xl">{dict.featured}</h2>
              <p className="text-muted mt-3">{dict.featuredSub}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10 lg:gap-x-6 lg:gap-y-14">
            {data.featured.map((p) => (
              <ProductCard key={p.id} product={p} locale={locale} dict={dict} />
            ))}
          </div>
        </section>
      ) : null}

      {data.bestsellers.length > 0 ? (
        <section className="max-w-page mx-auto px-6 lg:px-10 mt-24 lg:mt-32">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="display-xl text-4xl lg:text-5xl">
                {dict.bestsellers}
              </h2>
              <p className="text-muted mt-3">{dict.bestsellersSub}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10 lg:gap-x-6 lg:gap-y-14">
            {data.bestsellers.map((p) => (
              <ProductCard key={p.id} product={p} locale={locale} dict={dict} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
