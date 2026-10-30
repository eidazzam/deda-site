import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { HeroSlider } from '@/components/hero-slider';
import { HomeDataSection } from '@/components/home-data-section';
import { ArrowIcon } from '@/components/icon';
import { OrganizationJsonLd } from '@/components/json-ld';
import { api } from '@/lib/api/client';
import { isLocalUpload, resolveImageUrl } from '@/lib/image';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildMetadata } from '@/lib/seo';

// Pages that read the API stay dynamic during local development so the
// build doesn't have to reach the backend. On the VPS we can flip this
// to `revalidate = 60` for ISR once the API is reliably reachable.
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const isAR = locale === 'ar';
  return buildMetadata({
    locale: locale as Locale,
    title: isAR
      ? 'ديدا — عبايات فاخرة من الكويت'
      : 'Deda — Luxury Kuwaiti Abayas',
    pathFromLocaleRoot: '',
  });
}

// Real Gulf/Middle Eastern abaya photography sourced from Unsplash —
// each URL was verified by fetching its photo page on unsplash.com to
// confirm the CDN id resolves. Six categories match the Kuwaiti
// shopping vocabulary the client uses: Coloured, Black, Snap, Embroidered,
// Overhead, and Kids.
const CATEGORY_CARDS = [
  {
    cat: 'coloured',
    // Multicolored abaya dress — pure colour story.
    image: 'https://images.unsplash.com/photo-1570203543523-57e9dc7ff410?w=800&h=1000&fit=crop&q=85&auto=format',
  },
  {
    cat: 'black',
    // Woman in black hijab and black abaya — Gulf staple.
    image: 'https://images.unsplash.com/photo-1613005798967-632017e477c8?w=800&h=1000&fit=crop&q=85&auto=format',
  },
  {
    cat: 'snap',
    // Three women in everyday modest dress — snap/casual energy.
    image: 'https://images.unsplash.com/photo-1522219406764-db207f1f7640?w=800&h=1000&fit=crop&q=85&auto=format',
  },
  {
    cat: 'embroidered',
    // Beige abaya with embroidery — detail piece.
    image: 'https://images.unsplash.com/photo-1760083545495-b297b1690672?w=800&h=1000&fit=crop&q=85&auto=format',
  },
  {
    cat: 'overhead',
    // Flowing abaya covering head + shoulders — overhead silhouette.
    image: 'https://images.unsplash.com/photo-1569245087840-dcf487ddbad5?w=800&h=1000&fit=crop&q=85&auto=format',
  },
  {
    cat: 'kids',
    // Child wearing a small black abaya — kids collection.
    image: 'https://images.unsplash.com/photo-1767780441121-d27bfc6c8f0e?w=800&h=1000&fit=crop&q=85&auto=format',
  },
  {
    cat: 'everyday',
    // Daily-wear abaya, relaxed silhouette — practical / "العملية" pieces.
    image: 'https://images.unsplash.com/photo-1583846783214-7229a91b20ed?w=800&h=1000&fit=crop&q=85&auto=format',
  },
  {
    cat: 'ready',
    // In-stock, ships same day — the "جاهزة" ready-to-wear rack.
    image: 'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&h=1000&fit=crop&q=85&auto=format',
  },
  {
    cat: 'winter',
    // Heavier weaves + warmer palette for cold-weather months — "شتوية".
    image: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&h=1000&fit=crop&q=85&auto=format',
  },
] as const;

// Hero slides — fallback only. The homepage now fetches the live list
// from `/api/hero-slides`; this array is used when the API is
// unreachable or returns an empty set, so the storefront never renders
// a blank hero. Keep at least one entry here.
const FALLBACK_HERO_SLIDES = [
  {
    // Woman in black hijab and black abaya — strongest opener.
    url: 'https://images.unsplash.com/photo-1613005798967-632017e477c8?w=1400&h=1700&fit=crop&q=85&auto=format',
    altAr: 'إطلالة افتتاحية بعباية سوداء',
    altEn: 'Opening look in black abaya',
  },
  {
    // Multicoloured abaya — colour story.
    url: 'https://images.unsplash.com/photo-1570203543523-57e9dc7ff410?w=1400&h=1700&fit=crop&q=85&auto=format',
    altAr: 'عباية ملوّنة بألوان دافئة',
    altEn: 'A coloured abaya in warm tones',
  },
  {
    // Beige embroidered abaya — detail variation.
    url: 'https://images.unsplash.com/photo-1760083545495-b297b1690672?w=1400&h=1700&fit=crop&q=85&auto=format',
    altAr: 'تطريز هادئ على عباية بيج',
    altEn: 'Quiet embroidery on a beige abaya',
  },
  {
    // Group of women in traditional dress — cultural framing.
    url: 'https://images.unsplash.com/photo-1736342182213-6c037467cb38?w=1400&h=1700&fit=crop&q=85&auto=format',
    altAr: 'لحظة جماعية بإطلالات تقليدية',
    altEn: 'A shared moment, dressed in tradition',
  },
];

const EDITORIAL_IMAGE =
  // Seated portrait — used for the craft / editorial split below.
  'https://images.unsplash.com/photo-1627378228978-a62f71edff15?w=1000&h=1250&fit=crop&q=85&auto=format';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);
  const isAR = locale === 'ar';

  // Live hero slides from the DB. If the API is unreachable or returns
  // an empty list (e.g. fresh deploy before the admin has added any),
  // fall back to the four hardcoded editorial frames so the hero never
  // collapses to a blank box.
  let heroSlides = FALLBACK_HERO_SLIDES.map((s) => ({
    url: s.url,
    altAr: s.altAr,
    altEn: s.altEn,
  }));
  try {
    const live = await api.heroSlides.list();
    if (live.length > 0) {
      heroSlides = live.map((s) => ({
        url: resolveImageUrl(s.url),
        altAr: s.altAr ?? '',
        altEn: s.altEn ?? '',
      }));
    }
  } catch {
    // Fallback already populated above. Keep the hero rendering.
  }

  // Category card overrides — merge the admin-uploaded image (when any)
  // into the hardcoded list. Each row keyed by Category enum; a missing
  // row keeps the built-in image so the section never has a blank tile.
  const categoryCards = CATEGORY_CARDS.map((c) => ({ ...c, image: c.image as string }));
  try {
    const overrides = await api.categoryImages.list();
    if (overrides.length > 0) {
      const byCategory = new Map(
        overrides.map((o) => [o.category.toLowerCase(), resolveImageUrl(o.url)]),
      );
      for (const card of categoryCards) {
        const override = byCategory.get(card.cat);
        if (override) card.image = override;
      }
    }
  } catch {
    // Fallback already in place. Categories stay on the hardcoded URLs.
  }

  // Editorial split overrides — admin-saved copy + image, with hardcoded
  // defaults as the safety net for fresh installs / API failures.
  const editorial = {
    eyebrowEn: 'Craft',
    eyebrowAr: 'حرفية',
    headlineEn: "Every piece carries a maker's hand.",
    headlineAr: 'كل قطعة تحمل أثر .',
    bodyEn:
      'We work with small ateliers from Kuwait across the Gulf, choose considered fabrics, and measure success by the details only the wearer notices.',
    bodyAr:
      'نعمل مع ورش صغيرة من الكويت إلى الخليج، نختار خامات راقية ونقيس النجاح بتفاصيل لا يراها أحد إلا من تلبسها.',
    imageUrl: EDITORIAL_IMAGE,
  };
  try {
    const cfg = await api.siteConfig.get();
    if (cfg.editorialEyebrowEn) editorial.eyebrowEn = cfg.editorialEyebrowEn;
    if (cfg.editorialEyebrowAr) editorial.eyebrowAr = cfg.editorialEyebrowAr;
    if (cfg.editorialHeadlineEn) editorial.headlineEn = cfg.editorialHeadlineEn;
    if (cfg.editorialHeadlineAr) editorial.headlineAr = cfg.editorialHeadlineAr;
    if (cfg.editorialBodyEn) editorial.bodyEn = cfg.editorialBodyEn;
    if (cfg.editorialBodyAr) editorial.bodyAr = cfg.editorialBodyAr;
    if (cfg.editorialImageUrl) editorial.imageUrl = resolveImageUrl(cfg.editorialImageUrl);
  } catch {
    // Editorial section stays on its built-in defaults.
  }

  return (
    <div className="animate-fade-up">
      <OrganizationJsonLd locale={locale as Locale} />
      {/* Hero */}
      <section className="relative">
        <div className="max-w-page mx-auto px-6 lg:px-10 pt-8 lg:pt-16">
          <div className="grid sm:grid-cols-12 gap-8 lg:gap-12 items-end">
            <div className="sm:col-span-5 lg:col-span-5 lg:pb-20">
              <div className="text-xs tracking-[0.18em] uppercase text-accent mb-8">
                {dict.heroEyebrow}
              </div>
              <h1 className="display-xl text-[14vw] sm:text-[7vw] md:text-[5.5vw] lg:text-[6.5rem] mb-6">
                <span className="block">{dict.heroTitle}</span>
                <em className="block not-italic text-accent font-light">{dict.heroTitle2}</em>
              </h1>
              <p className="text-muted text-lg max-w-md leading-relaxed mb-10">
                {dict.heroSub}
              </p>
              <Link
                href={`/${locale}/shop/all`}
                className="group inline-flex items-center gap-3 text-sm tracking-widest uppercase border-b border-ink pb-2 hover:border-accent hover:text-accent transition-colors"
              >
                <span>{dict.shopCollection}</span>
                <ArrowIcon
                  className={`w-4 h-4 ${isAR ? 'rotate-180' : ''} group-hover:translate-x-1 transition-transform`}
                />
              </Link>
            </div>
            <div className="sm:col-span-7 lg:col-span-7">
              <HeroSlider
                slides={heroSlides}
                locale={locale as Locale}
                badge={{
                  ar: 'تصوير: ديدا استوديو',
                  en: 'Photographed by Deda Studio',
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-page mx-auto px-6 lg:px-10 mt-24 lg:mt-32">
        <div className="flex items-end justify-between mb-10">
          <h2 className="display-xl text-4xl lg:text-5xl">{dict.categories}</h2>
          <Link
            href={`/${locale}/shop/all`}
            className="hidden sm:inline-flex items-center gap-2 text-sm tracking-widest uppercase link-underline"
          >
            <span>{dict.discover}</span>
            <ArrowIcon className={`w-4 h-4 ${isAR ? 'rotate-180' : ''}`} />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-5">
          {categoryCards.map((c) => (
            <Link
              key={c.cat}
              href={`/${locale}/shop/${c.cat}`}
              className="group relative img-zoom aspect-[3/4] bg-subtle overflow-hidden"
            >
              <Image
                src={c.image}
                alt={dict[c.cat as keyof typeof dict] ?? c.cat}
                fill
                sizes="(min-width: 1024px) 22vw, 45vw"
                className="object-cover"
                unoptimized={isLocalUpload(c.image)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" />
              <div
                className={`absolute bottom-5 ${
                  isAR ? 'right-5' : 'left-5'
                } text-bg ${isAR ? 'text-right' : 'text-left'}`}
              >
                <div className="font-display text-2xl">
                  {dict[c.cat as keyof typeof dict] ?? c.cat}
                </div>
                <div
                  className={`mt-2 text-xs tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 ${
                    isAR ? 'flex-row-reverse' : ''
                  }`}
                >
                  <span>{dict.discover}</span>
                  <ArrowIcon className={`w-3.5 h-3.5 ${isAR ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured + bundles — fetched on the client so the Cloudflare
          Pages edge same-zone DNS issue can't silently swallow the API. */}
      <HomeDataSection locale={locale as Locale} dict={dict} />

      {/* Editorial split — admin-editable copy + image, falls back to
          the hardcoded defaults above when the API is unreachable. */}
      <section className="max-w-page mx-auto px-6 lg:px-10 mt-24 lg:mt-32">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="img-zoom aspect-[4/5] bg-subtle overflow-hidden relative">
            <Image
              src={editorial.imageUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 45vw, 90vw"
              className="object-cover"
              unoptimized={isLocalUpload(editorial.imageUrl)}
            />
          </div>
          <div className={`lg:px-8 ${isAR ? 'lg:text-right' : ''}`}>
            <div className="text-xs tracking-widest uppercase text-accent mb-6">
              {isAR ? editorial.eyebrowAr : editorial.eyebrowEn}
            </div>
            <h2 className="display-xl text-4xl lg:text-6xl mb-6 leading-[0.95]">
              {isAR ? editorial.headlineAr : editorial.headlineEn}
            </h2>
            <p className="text-muted leading-relaxed text-lg whitespace-pre-line">
              {isAR ? editorial.bodyAr : editorial.bodyEn}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
