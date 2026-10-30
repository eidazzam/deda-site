import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Internal customer flow pages — we already mark them noindex
        // via metadata, but blocking here is belt-and-suspenders.
        disallow: ['/api/', '/admin', '/*/cart', '/*/checkout', '/*/wishlist'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
