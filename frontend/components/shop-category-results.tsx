'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { CustomSizeDemo } from '@/components/custom-size-demo';
import { ArrowIcon } from '@/components/icon';
import { api, type ProductsListResponse } from '@/lib/api/client';
import type { Category, ColorGroup } from '@/lib/api/types';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/config';
import { ABAYA_SIZES, KIDS_SIZES } from '@/lib/sizes';

import { ProductCard, ProductCardSkeleton } from './product-card';

type Props = {
  category: Category | null;
  cat: string;
  colors: ColorGroup[];
  sizes: string[];
  sort: 'newest' | 'oldest' | 'price-asc' | 'price-desc';
  page: number;
  searchTerm: string | undefined;
  locale: Locale;
  dict: Dictionary;
  pathname: string;
  search: Record<string, string | undefined>;
};

export function ShopCategoryResults({
  category,
  cat,
  colors,
  sizes,
  sort,
  page,
  searchTerm,
  locale,
  dict,
  pathname,
  search,
}: Props) {
  const [data, setData] = useState<ProductsListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.products
      .list(
        {
          category: category ?? undefined,
          color: colors.length > 0 ? colors.join(',') : undefined,
          size: sizes.length > 0 ? sizes.join(',') : undefined,
          sort,
          page,
          limit: 24,
          search: searchTerm,
        },
        { cache: 'no-store' },
      )
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Shop category fetch failed', err);
        setData(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, colors.join(','), sizes.join(','), sort, page, searchTerm]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10 lg:gap-x-6 lg:gap-y-14">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (data === null || data.items.length === 0) {
    return <ComingSoon category={cat} dict={dict} locale={locale} />;
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10 lg:gap-x-6 lg:gap-y-14">
        {data.items.map((p) => (
          <ProductCard key={p.id} product={p} locale={locale} dict={dict} />
        ))}
      </div>
      {data.pagination.totalPages > 1 ? (
        <Pagination
          pathname={pathname}
          search={search}
          current={data.pagination.page}
          total={data.pagination.totalPages}
          locale={locale}
        />
      ) : null}
    </>
  );
}

function ComingSoon({
  category,
  dict,
  locale,
}: {
  category: string;
  dict: Dictionary;
  locale: Locale;
}) {
  const isAR = locale === 'ar';
  const isKids = category === 'kids';
  const sizes = isKids ? KIDS_SIZES : ABAYA_SIZES;

  return (
    <div className="py-12 lg:py-16">
      <div className="text-center max-w-md mx-auto mb-12">
        <div className="text-[11px] tracking-[0.22em] uppercase text-accent mb-4">
          {isAR ? 'قريباً' : 'Coming soon'}
        </div>
        <h2 className="display-md text-3xl lg:text-4xl mb-4">
          {isAR ? 'المجموعة قيد التحضير' : 'Collection in the works'}
        </h2>
        <p className="text-muted leading-relaxed">
          {isAR
            ? 'نحضّر هذه المجموعة من ورشتنا، وستظهر القطع هنا قريباً. سجّلي اهتمامك من خلال إنستجرام لتعرفي بأول إطلاق.'
            : "We're finalising this collection from our atelier. Pieces land here shortly — follow along on Instagram for the first drop."}
        </p>
      </div>

      <div className="max-w-md mx-auto border border-border p-6 lg:p-8 bg-bg-card">
        <div className="text-[11px] tracking-widest uppercase text-muted mb-5 text-center">
          {isAR
            ? isKids
              ? 'مقاسات الأطفال (سم)'
              : 'المقاسات المتاحة (سم)'
            : isKids
              ? 'Kids sizes (cm)'
              : 'Available sizes (cm)'}
        </div>
        <div className="flex flex-wrap justify-center gap-2 mb-5">
          {sizes.map((s) => (
            <div
              key={s}
              className="min-w-12 h-10 px-3 grid place-items-center text-sm border border-border bg-bg"
            >
              {s}
            </div>
          ))}
          <CustomSizeDemo dict={dict} locale={locale} />
        </div>
        <p className="text-xs text-muted text-center leading-relaxed">
          {dict.customSizeHint}
        </p>
      </div>

      <div className="text-center mt-12">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-sm tracking-widest uppercase border-b border-ink pb-2 hover:border-accent hover:text-accent transition-colors"
        >
          <span>{dict.backHome}</span>
        </Link>
      </div>
    </div>
  );
}

function Pagination({
  pathname,
  search,
  current,
  total,
  locale,
}: {
  pathname: string;
  search: Record<string, string | undefined>;
  current: number;
  total: number;
  locale: Locale;
}) {
  const isAR = locale === 'ar';
  const linkFor = (page: number) => {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(search)) {
      if (k === 'page' || v === undefined) continue;
      usp.set(k, v);
    }
    if (page > 1) usp.set('page', String(page));
    const qs = usp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const pages = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <nav className="mt-14 flex items-center justify-center gap-1 text-sm">
      {current > 1 ? (
        <Link
          href={linkFor(current - 1)}
          className="px-3 py-2 hover:text-accent transition-colors"
        >
          <ArrowIcon className={`w-4 h-4 ${isAR ? '' : 'rotate-180'}`} />
        </Link>
      ) : null}
      {pages.map((p) => (
        <Link
          key={p}
          href={linkFor(p)}
          className={`min-w-9 h-9 grid place-items-center transition-colors ${
            p === current ? 'bg-ink text-bg' : 'text-muted hover:text-ink'
          }`}
        >
          {p}
        </Link>
      ))}
      {current < total ? (
        <Link
          href={linkFor(current + 1)}
          className="px-3 py-2 hover:text-accent transition-colors"
        >
          <ArrowIcon className={`w-4 h-4 ${isAR ? 'rotate-180' : ''}`} />
        </Link>
      ) : null}
    </nav>
  );
}
