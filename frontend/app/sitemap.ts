import type { MetadataRoute } from 'next';

import { api } from '@/lib/api/client';
import { LOCALES } from '@/lib/i18n/config';
import { SITE_URL } from '@/lib/site';

// Mirrors the keys in /shop/[cat]/page.tsx CATEGORY_MAP — keep in sync
// when categories are added or renamed.
const CATEGORIES = [
  'all',
  'coloured',
  'black',
  'snap',
  'embroidered',
  'overhead',
  'kids',
] as const;

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

/**
 * Sitemap is rebuilt on demand (force-dynamic) so newly added products
 * show up to crawlers without waiting for a rebuild. We pull the slug
 * list from /api/products/slugs which is a one-query lightweight endpoint
 * cached at the edge — safe to call even with 1500+ products.
 *
 * The static routes are included even when the API is unreachable so we
 * never serve an empty sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  // Locale roots + category listings — duplicated per locale so each
  // gets crawled with the right hreflang context.
  for (const locale of LOCALES) {
    entries.push({
      url: `${SITE_URL}/${locale}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    });
    for (const cat of CATEGORIES) {
      entries.push({
        url: `${SITE_URL}/${locale}/shop/${cat}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.8,
      });
    }
  }

  // Product slugs come from the API. If the call fails (api down, build
  // running before deploy) we just serve the static portion above —
  // crawlers will catch up next time.
  try {
    const slugs = await api.products.slugs({ cache: 'no-store' });
    for (const p of slugs) {
      const lastModified = p.updatedAt ? new Date(p.updatedAt) : now;
      for (const locale of LOCALES) {
        entries.push({
          url: `${SITE_URL}/${locale}/product/${p.slug}`,
          lastModified,
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }
  } catch {
    // ignore — see above
  }

  return entries;
}
