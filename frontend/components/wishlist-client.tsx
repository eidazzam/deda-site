'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ProductCard, ProductCardSkeleton } from './product-card';

import { api, ApiError } from '@/lib/api/client';
import type { ProductCard as ProductCardData } from '@/lib/api/types';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { useWishlist } from '@/lib/stores/wishlist';

type Props = { locale: Locale; dict: Dictionary };

/**
 * The wishlist lives in localStorage, so fetching the matching product
 * data has to happen client-side. We pull every favourite by slug in
 * parallel and tolerate 404s — if a product was removed, we just drop it
 * silently rather than leave a phantom card on the page.
 */
export function WishlistClient({ locale, dict }: Props) {
  const slugs = useWishlist((s) => s.slugs);
  const [products, setProducts] = useState<ProductCardData[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      if (slugs.length === 0) {
        if (!cancelled) {
          setProducts([]);
          setLoading(false);
        }
        return;
      }

      const results = await Promise.allSettled(
        slugs.map((slug) => api.products.bySlug(slug, { cache: 'no-store' })),
      );

      if (cancelled) return;

      // Map ProductDetail → the lighter ProductCard shape so we can reuse
      // the existing card component.
      const cards: ProductCardData[] = results
        .filter(
          (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof api.products.bySlug>>> =>
            r.status === 'fulfilled',
        )
        .map((r) => ({
          id: r.value.id,
          slug: r.value.slug,
          nameEn: r.value.nameEn,
          nameAr: r.value.nameAr,
          basePrice: r.value.basePrice,
          discount: r.value.discount,
          category: r.value.category,
          status: r.value.status,
          isFeatured: r.value.isFeatured,
          isNew: r.value.isNew,
          isBestSeller: r.value.isBestSeller,
          primaryImage:
            r.value.images[0]?.url ??
            r.value.variants[0]?.images[0]?.url ??
            null,
          colors: r.value.variants.map((v) => ({
            colorNameEn: v.colorNameEn,
            colorNameAr: v.colorNameAr,
            colorHex: v.colorHex,
            colorGroup: v.colorGroup,
            status: v.status,
          })),
        }));

      setProducts(cards);
      setLoading(false);

      // Best-effort cleanup: any slug whose detail call failed with 404
      // is removed from the wishlist so the list doesn't grow stale.
      const stale = slugs.filter((slug, i) => {
        const r = results[i];
        return r?.status === 'rejected' && r.reason instanceof ApiError && r.reason.status === 404;
      });
      if (stale.length > 0) {
        const store = useWishlist.getState();
        stale.forEach((slug) => store.toggle(slug));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slugs]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <h2 className="font-display text-3xl mb-3">{dict.wishlistEmpty}</h2>
        <Link
          href={`/${locale}/shop/all`}
          className="inline-block mt-4 bg-ink text-bg text-sm tracking-widest uppercase px-8 py-3 hover:bg-accent transition-colors"
        >
          {dict.shopCollection}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10 lg:gap-x-6 lg:gap-y-14">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} locale={locale} dict={dict} />
      ))}
    </div>
  );
}
