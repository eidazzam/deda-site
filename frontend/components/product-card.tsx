'use client';

import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';

import type { ProductCard as ProductCardData } from '@/lib/api/types';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { isLocalUpload } from '@/lib/image';
import { useWishlist } from '@/lib/stores/wishlist';

import { ColorSwatches } from './color-swatch';
import { HeartIcon } from './icon';
import { PriceTag } from './price-tag';

type Props = {
  product: ProductCardData;
  locale: Locale;
  dict: Dictionary;
};

export function ProductCard({ product, locale, dict }: Props) {
  const isAR = locale === 'ar';
  const name = isAR ? product.nameAr : product.nameEn;
  const isWishlisted = useWishlist((s) => s.slugs.includes(product.slug));
  const toggle = useWishlist((s) => s.toggle);

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowWishlisted = toggle(product.slug);
    toast(nowWishlisted ? dict.addedToWishlist : dict.removedFromWishlist);
  };

  const isOutOfStock = product.status === 'OUT_OF_STOCK';

  return (
    <Link
      href={`/${locale}/product/${product.slug}`}
      className="group block"
    >
      <div className="relative img-zoom aspect-[3/4] bg-subtle overflow-hidden mb-3">
        {product.primaryImage ? (
          <Image
            src={product.primaryImage}
            alt={name}
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
            className="object-cover"
            unoptimized={isLocalUpload(product.primaryImage)}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted text-xs tracking-widest uppercase">
            {dict.brand}
          </div>
        )}

        {/* Badges */}
        <div className={`absolute top-3 ${isAR ? 'right-3' : 'left-3'} flex flex-col gap-1`}>
          {product.isNew && !isOutOfStock ? (
            <span className="bg-bg text-ink text-[10px] tracking-widest uppercase px-2 py-1">
              {isAR ? 'جديد' : 'New'}
            </span>
          ) : null}
          {product.discount !== null && product.discount < product.basePrice && !isOutOfStock ? (
            <span className="bg-accent text-bg text-[10px] tracking-widest uppercase px-2 py-1">
              {isAR ? 'تخفيض' : 'Sale'}
            </span>
          ) : null}
          {isOutOfStock ? (
            <span className="bg-ink text-bg text-[10px] tracking-widest uppercase px-2 py-1">
              {dict.outOfStock}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={dict.wishlist}
          className={`absolute top-3 ${
            isAR ? 'left-3' : 'right-3'
          } p-2 bg-bg/70 backdrop-blur-sm rounded-full hover:bg-bg transition-colors`}
        >
          <HeartIcon
            className={`w-4 h-4 transition-colors ${
              isWishlisted ? 'text-accent fill-accent' : 'text-ink'
            }`}
            strokeWidth={1.5}
          />
        </button>
      </div>

      <div className="space-y-1">
        <div className="text-sm font-medium leading-tight">{name}</div>
        <div className="flex items-center justify-between">
          <PriceTag
            basePrice={product.basePrice}
            discount={product.discount}
            locale={locale}
            egpLabel={dict.egp}
            size="sm"
          />
          {product.colors.length > 0 ? (
            <ColorSwatches colors={product.colors.slice(0, 4)} size="xs" locale={locale} />
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] bg-subtle mb-3" />
      <div className="h-4 bg-subtle w-3/4 mb-2" />
      <div className="h-4 bg-subtle w-1/3" />
    </div>
  );
}
