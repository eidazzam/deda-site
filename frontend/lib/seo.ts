import type { Metadata } from 'next';

import type { Locale } from './i18n/config';
import { DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './site';

/**
 * Build the alternates block for a page that exists in both locales.
 * `pathFromLocaleRoot` is everything after `/<locale>` — pass `''` for
 * the locale's home page.
 */
export function buildAlternates(
  locale: Locale,
  pathFromLocaleRoot: string,
): NonNullable<Metadata['alternates']> {
  const path = pathFromLocaleRoot.startsWith('/')
    ? pathFromLocaleRoot
    : `/${pathFromLocaleRoot}`;
  const trimmed = path === '/' ? '' : path;
  return {
    canonical: `${SITE_URL}/${locale}${trimmed}`,
    languages: {
      en: `${SITE_URL}/en${trimmed}`,
      ar: `${SITE_URL}/ar${trimmed}`,
      'x-default': `${SITE_URL}/en${trimmed}`,
    },
  };
}

/**
 * Compose page-level metadata that inherits the site defaults from
 * the root layout. Pass null/undefined for fields you don't want to
 * override.
 */
export function buildMetadata({
  locale,
  title,
  description,
  pathFromLocaleRoot,
  image,
  noIndex,
}: {
  locale: Locale;
  title: string;
  description?: string;
  pathFromLocaleRoot: string;
  image?: string | null;
  noIndex?: boolean;
}): Metadata {
  const isAR = locale === 'ar';
  const finalDescription =
    description ?? (isAR ? SITE_DESCRIPTION.ar : SITE_DESCRIPTION.en);
  const finalImage = image ?? DEFAULT_OG_IMAGE;
  const alternates = buildAlternates(locale, pathFromLocaleRoot);

  return {
    title,
    description: finalDescription,
    alternates,
    openGraph: {
      type: 'website',
      title,
      description: finalDescription,
      siteName: SITE_NAME,
      locale: isAR ? 'ar_EG' : 'en_US',
      url: alternates.canonical as string,
      images: finalImage ? [{ url: finalImage }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: finalDescription,
      images: finalImage ? [finalImage] : undefined,
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
  };
}
