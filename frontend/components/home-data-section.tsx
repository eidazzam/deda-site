'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import { ProductCard } from '@/components/product-card';
import { api } from '@/lib/api/client';
import type { Bundle, ProductCard as ProductCardData } from '@/lib/api/types';
import { formatPrice } from '@/lib/format';
import { isLocalUpload } from '@/lib/image';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';

type Props = {
  locale: Locale;
  dict: Dictionary;
};

/**
 * Featured + bundles strip on the homepage. Moved to the browser because
 * the Cloudflare Pages edge can't reach api.dedawomenswear.shop from inside the
 * same zone, which silently swallowed all API data when this ran in the
 * Server Component.
 */
export function HomeDataSection({ locale, dict }: Props) {
  const isAR = locale === 'ar';
  const [data, setData] = useState<{
    featured: ProductCardData[];
    bestsellers: ProductCardData[];
    bundles: Bundle[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.products.list({ isFeatured: true, limit: 6 }, { cache: 'no-store' }),
      api.products.list({ isBestSeller: true, limit: 6 }, { cache: 'no-store' }),
      api.bundles.list({ cache: 'no-store' }),
    ])
      .then(([featured, bestsellers, bundles]) => {
        if (cancelled) return;
        setData({
          featured: featured.items,
          bestsellers: bestsellers.items,
          bundles,
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
    (data.featured.length === 0 &&
      data.bestsellers.length === 0 &&
      data.bundles.length === 0)
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

      {data.bundles.length > 0 ? (
        <section className="max-w-page mx-auto px-6 lg:px-10 mt-24 lg:mt-32">
          <div className="mb-10">
            <h2 className="display-xl text-4xl lg:text-5xl">{dict.bundles}</h2>
            <p className="text-muted mt-3">{dict.bundlesSub}</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
            {data.bundles.map((b) => (
              <div key={b.id} className="relative bg-subtle/50 p-6 lg:p-10">
                {/* Bundle cover — single editorial image when the admin
                    uploaded one, falls back to the in-bundle product grid
                    otherwise so older bundles keep working. */}
                {b.imageUrl ? (
                  <div className="img-zoom aspect-[5/4] bg-bg overflow-hidden relative mb-6">
                    <Image
                      src={b.imageUrl}
                      alt={isAR ? b.nameAr : b.nameEn}
                      fill
                      sizes="(min-width: 1024px) 45vw, 90vw"
                      className="object-cover"
                      unoptimized={isLocalUpload(b.imageUrl)}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {b.products.map((p) => (
                      <div
                        key={p.slug}
                        className="img-zoom aspect-[3/4] bg-bg overflow-hidden relative"
                      >
                        {p.primaryImage ? (
                          <Image
                            src={p.primaryImage}
                            alt={isAR ? p.nameAr : p.nameEn}
                            fill
                            sizes="(min-width: 1024px) 15vw, 30vw"
                            className="object-cover"
                            unoptimized={isLocalUpload(p.primaryImage)}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
                <h3 className="font-display text-2xl lg:text-3xl mb-2">
                  {isAR ? b.nameAr : b.nameEn}
                </h3>
                <p className="text-sm text-muted">
                  {isAR ? b.descriptionAr : b.descriptionEn}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
