import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ShopCategoryResults } from '@/components/shop-category-results';
import { ShopFilters } from '@/components/shop-filters';
import type { Category, ColorGroup } from '@/lib/api/types';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; cat: string }>;
}): Promise<Metadata> {
  const { locale, cat } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale as Locale);
  const isAR = locale === 'ar';
  const labelKey = cat as keyof typeof dict;
  const heading = cat === 'all'
    ? (isAR ? 'كل المنتجات' : 'Shop all')
    : (dict[labelKey] ?? cat);
  return buildMetadata({
    locale: locale as Locale,
    title: heading,
    description: isAR
      ? `مجموعة ${heading} من ديدا — عبايات حديثة بحرفية متّزنة.`
      : `Deda's ${heading} collection — modern abayas with restrained craft.`,
    pathFromLocaleRoot: `/shop/${cat}`,
  });
}

const CATEGORY_MAP: Record<string, Category | null> = {
  all: null,
  coloured: 'COLOURED',
  black: 'BLACK',
  snap: 'SNAP',
  embroidered: 'EMBROIDERED',
  overhead: 'OVERHEAD',
  kids: 'KIDS',
  everyday: 'EVERYDAY',
  ready: 'READY',
  winter: 'WINTER',
};

const VALID_SORTS = ['newest', 'oldest', 'price-asc', 'price-desc'] as const;
type SortKey = (typeof VALID_SORTS)[number];

function pickSort(value: string | undefined): SortKey {
  return (VALID_SORTS as readonly string[]).includes(value ?? '')
    ? (value as SortKey)
    : 'newest';
}

function parseColors(raw: string | undefined): ColorGroup[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is ColorGroup =>
      [
        'WHITE',
        'BLACK',
        'GRAY',
        'BEIGE',
        'BROWN',
        'BLUE',
        'GREEN',
        'RED',
        'YELLOW',
        'PURPLE',
        'ORANGE',
        'MULTI',
      ].includes(s),
    );
}

export default async function ShopCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; cat: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale, cat } = await params;
  const search = await searchParams;
  if (!isLocale(locale)) notFound();
  if (!(cat in CATEGORY_MAP)) notFound();
  const dict = getDictionary(locale as Locale);
  const isAR = locale === 'ar';
  const category = CATEGORY_MAP[cat];

  const sort = pickSort(search.sort);
  const colors = parseColors(search.color);
  const sizes = (search.size ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const page = Math.max(1, Number(search.page ?? 1) || 1);
  const searchTerm = search.search?.trim() || undefined;

  const heading =
    cat === 'all'
      ? isAR
        ? 'كل المنتجات'
        : 'All'
      : dict[cat as keyof typeof dict] ?? cat;

  return (
    <div className="max-w-page mx-auto px-6 lg:px-10 py-10 lg:py-16 animate-fade-up">
      <div className="mb-10">
        <div className="text-xs tracking-widest uppercase text-muted mb-3">
          {dict.shopCollection}
        </div>
        <h1 className="display-xl text-4xl lg:text-6xl">{heading}</h1>
        {searchTerm ? (
          <div className="mt-3 text-sm text-muted">
            {isAR ? 'بحث: ' : 'Search: '}
            <span className="text-ink">“{searchTerm}”</span>
          </div>
        ) : null}
      </div>

      <div className="grid lg:grid-cols-[200px_1fr] gap-10 lg:gap-14">
        <ShopFilters
          locale={locale as Locale}
          dict={dict}
          selectedColors={colors}
          selectedSizes={sizes}
          selectedSort={sort}
          category={cat}
        />

        <div>
          {/* Client-side fetch — Cloudflare Pages edge can't reliably
              reach api.dedawomenswear.shop from inside the same zone, so the
              browser does the fetch where CORS is already wired up.
              All props here must be plain serializable data — no JSX
              or function callbacks across the server→client boundary. */}
          <ShopCategoryResults
            category={category}
            cat={cat}
            colors={colors}
            sizes={sizes}
            sort={sort}
            page={page}
            searchTerm={searchTerm}
            locale={locale as Locale}
            dict={dict}
            pathname={`/${locale}/shop/${cat}`}
            search={search}
          />
        </div>
      </div>
    </div>
  );
}
