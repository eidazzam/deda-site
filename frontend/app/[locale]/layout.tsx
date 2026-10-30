import { notFound } from 'next/navigation';

import { Shell } from '@/components/shell';
import { api } from '@/lib/api/client';
import type { SiteConfig } from '@/lib/api/types';
import { dirOf, isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

// Re-fetch site-config on every request so admin updates show up
// immediately. Tiny payload, cheap query.
export const dynamic = 'force-dynamic';
// Required when this layout runs on Cloudflare Pages — the dashboard
// project's compat flag is nodejs_compat but each dynamic route still
// has to opt into the edge runtime explicitly.
//
// Note: we used to also expose `generateStaticParams` here to
// pre-render `/en` and `/ar`, but Next.js refuses to mix
// `runtime = 'edge'` with `generateStaticParams` on the same segment.
// The body's `isLocale()` check below still rejects unknown locales
// with a 404, so dropping static params just makes locale routing
// fully dynamic — fine, since `dynamic = 'force-dynamic'` already
// opts everything inside this layout into per-request rendering.

async function loadSiteConfig(): Promise<SiteConfig | null> {
  try {
    return await api.siteConfig.get({ cache: 'no-store' });
  } catch {
    return null;
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);
  const config = await loadSiteConfig();

  return (
    <div lang={locale} dir={dirOf(locale as Locale)}>
      <Shell locale={locale as Locale} dict={dict} config={config}>
        {children}
      </Shell>
    </div>
  );
}
