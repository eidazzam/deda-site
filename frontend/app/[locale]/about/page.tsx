import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArrowIcon } from '@/components/icon';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildMetadata } from '@/lib/seo';

export const runtime = 'edge';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale as Locale);
  const isAR = locale === 'ar';
  return buildMetadata({
    locale: locale as Locale,
    title: dict.about,
    description: isAR
      ? 'دار كويتية للعبايات الحديثة — صناعة هادئة، تفاصيل دقيقة، ومقاسات تليق بكِ.'
      : "Kuwait's quiet abaya house — restrained design, careful craft, sizing made for you.",
    pathFromLocaleRoot: '/about',
  });
}

// Brand-owned editorial artwork replacing the stock photography that
// used to live here. Both sit under /public/brand/ so Cloudflare Pages
// and the VPS Next.js serve them from the same relative path.
const HERO_IMAGE = '/brand/about-hero.jpg';

const CRAFT_IMAGE = '/brand/about-craft.jpg';

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);
  const isAR = locale === 'ar';

  return (
    <div className="animate-fade-up">
      {/* Hero — half-image, half-statement */}
      <section className="max-w-page mx-auto px-6 lg:px-10 pt-10 lg:pt-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className={isAR ? 'lg:text-right' : ''}>
            <div className="text-xs tracking-[0.22em] uppercase text-accent mb-6">
              {dict.aboutEyebrow}
            </div>
            <h1 className="display-xl text-4xl lg:text-6xl leading-[1.05] mb-6">
              {dict.aboutTitle}
            </h1>
            <p className="text-muted text-lg leading-relaxed max-w-prose">
              {dict.aboutLead}
            </p>
          </div>
          <div className="img-zoom aspect-[4/5] bg-subtle overflow-hidden relative order-first lg:order-last">
            <Image
              src={HERO_IMAGE}
              alt={dict.brand}
              fill
              sizes="(min-width: 1024px) 45vw, 90vw"
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* Craft */}
      <section className="max-w-page mx-auto px-6 lg:px-10 mt-24 lg:mt-32">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="img-zoom aspect-[4/5] bg-subtle overflow-hidden relative">
            <Image
              src={CRAFT_IMAGE}
              alt=""
              fill
              sizes="(min-width: 1024px) 45vw, 90vw"
              className="object-cover"
            />
          </div>
          <div className={isAR ? 'lg:text-right' : ''}>
            <div className="text-xs tracking-widest uppercase text-accent mb-6">
              {dict.aboutCraftHeading}
            </div>
            <h2 className="display-xl text-3xl lg:text-5xl mb-6 leading-[0.95]">
              {dict.aboutCraftHeading}
            </h2>
            <p className="text-muted leading-relaxed text-lg max-w-prose">
              {dict.aboutCraftBody}
            </p>
          </div>
        </div>
      </section>

      {/* Values — three quiet columns */}
      <section className="max-w-page mx-auto px-6 lg:px-10 mt-24 lg:mt-32">
        <div className={`mb-12 ${isAR ? 'text-right' : ''}`}>
          <div className="text-xs tracking-widest uppercase text-accent mb-3">
            {dict.aboutValuesHeading}
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {[
            { title: dict.aboutValueOneTitle, body: dict.aboutValueOneBody },
            { title: dict.aboutValueTwoTitle, body: dict.aboutValueTwoBody },
            {
              title: dict.aboutValueThreeTitle,
              body: dict.aboutValueThreeBody,
            },
          ].map((v, idx) => (
            <div
              key={v.title}
              className={`border-t border-border pt-6 ${isAR ? 'text-right' : ''}`}
            >
              <div className="text-xs tracking-widest uppercase text-muted mb-4">
                {String(idx + 1).padStart(2, '0')}
              </div>
              <h3 className="font-display text-2xl lg:text-3xl mb-4">{v.title}</h3>
              <p className="text-muted leading-relaxed">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA / contact close */}
      <section className="max-w-page mx-auto px-6 lg:px-10 mt-24 lg:mt-32 mb-24 lg:mb-32">
        <div className="border border-border p-10 lg:p-16 bg-subtle/40 text-center max-w-3xl mx-auto">
          <div className="text-xs tracking-widest uppercase text-accent mb-4">
            {dict.aboutContactHeading}
          </div>
          <h2 className="display-md text-3xl lg:text-4xl mb-6">
            {dict.aboutContactHeading}
          </h2>
          <p className="text-muted leading-relaxed mb-8 max-w-prose mx-auto">
            {dict.aboutContactBody}
          </p>
          <Link
            href={`/${locale}/shop/all`}
            className="inline-flex items-center gap-3 text-sm tracking-widest uppercase border-b border-ink pb-2 hover:border-accent hover:text-accent transition-colors"
          >
            <span>{dict.shopCollection}</span>
            <ArrowIcon className={`w-4 h-4 ${isAR ? 'rotate-180' : ''}`} />
          </Link>
        </div>
      </section>
    </div>
  );
}
