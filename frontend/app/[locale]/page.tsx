import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { HeroSlider } from '@/components/hero-slider';
import { HomeDataSection } from '@/components/home-data-section';
import { ArrowIcon } from '@/components/icon';
import { OrganizationJsonLd } from '@/components/json-ld';
import { api } from '@/lib/api/client';
import { resolveImageUrl } from '@/lib/image';
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
      ? 'ديدا — عبايات فاخرة من مصر'
      : 'Deda — Luxury Egyptian Abayas',
    pathFromLocaleRoot: '',
  });
}

// Fallback hero slides — used when the admin hasn't uploaded any
// hero images from /admin/settings yet, or when the siteConfig fetch
// fails. The storefront reads up to four heroImage{1..4}Url columns
// off SiteConfig and prefers those; anything null falls through to
// the hardcoded editorial frames below so the hero never collapses.
const FALLBACK_HERO_SLIDES = [
  {
    url: 'https://images.unsplash.com/photo-1613005798967-632017e477c8?w=1400&h=1700&fit=crop&q=85&auto=format',
    altAr: 'إطلالة افتتاحية بعباية سوداء',
    altEn: 'Opening look in black abaya',
  },
  {
    url: 'https://images.unsplash.com/photo-1570203543523-57e9dc7ff410?w=1400&h=1700&fit=crop&q=85&auto=format',
    altAr: 'عباية ملوّنة بألوان دافئة',
    altEn: 'A coloured abaya in warm tones',
  },
  {
    url: 'https://images.unsplash.com/photo-1760083545495-b297b1690672?w=1400&h=1700&fit=crop&q=85&auto=format',
    altAr: 'تطريز هادئ على عباية بيج',
    altEn: 'Quiet embroidery on a beige abaya',
  },
  {
    url: 'https://images.unsplash.com/photo-1736342182213-6c037467cb38?w=1400&h=1700&fit=crop&q=85&auto=format',
    altAr: 'لحظة جماعية بإطلالات تقليدية',
    altEn: 'A shared moment, dressed in tradition',
  },
];

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);
  const isAR = locale === 'ar';

  // Hero slides — the admin can upload up to four custom hero images
  // from /admin/settings; whatever is set overrides the matching slot
  // from the hardcoded fallback. We read the config over the browser-
  // side API, so a Cloudflare edge-DNS hiccup lands us on the fallback
  // rather than a blank hero.
  let heroSlides = FALLBACK_HERO_SLIDES.map((s) => ({
    url: s.url,
    altAr: s.altAr,
    altEn: s.altEn,
  }));
  try {
    const cfg = await api.siteConfig.get();
    const custom = [
      cfg.heroImage1Url,
      cfg.heroImage2Url,
      cfg.heroImage3Url,
      cfg.heroImage4Url,
    ]
      .filter((u): u is string => Boolean(u))
      .map((url) => ({
        url: resolveImageUrl(url),
        altAr: '',
        altEn: '',
      }));
    if (custom.length > 0) heroSlides = custom;
  } catch {
    // Keep the fallback hero rendering.
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

      {/* Deda doesn't carve the catalogue into categories, so the
          Rozana-style category grid is replaced with a single CTA
          dropping visitors straight into the flat product list. */}

      {/* Featured strip — fetched on the client so the Cloudflare
          Pages edge same-zone DNS issue can't silently swallow the API. */}
      <HomeDataSection locale={locale as Locale} dict={dict} />
    </div>
  );
}
