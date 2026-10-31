import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';

// Self-hosted fonts via @fontsource. Importing the .css files here
// means the woff2 files ship inside our own build artefact and load
// from the same origin as the HTML — no Google Fonts CDN hop during
// build (which used to break Cloudflare Pages when Google throttled
// us), no iOS Safari caching quirks, identical bytes on every device.
// Inter covers Latin display + body; Cairo + El Messiri handle Arabic.
// Cairo is the modern geometric Egyptian sans (named after the city);
// El Messiri is an Egyptian decorative display face for the hero/
// display headings. Both replace the earlier Tajawal + Reem Kufi pair,
// which read more Gulf-modernist than Egyptian.
import '@fontsource/inter/200.css';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/cairo/arabic-300.css';
import '@fontsource/cairo/arabic-400.css';
import '@fontsource/cairo/arabic-500.css';
import '@fontsource/cairo/arabic-700.css';
import '@fontsource/el-messiri/arabic-400.css';
import '@fontsource/el-messiri/arabic-500.css';
import '@fontsource/el-messiri/arabic-600.css';
import '@fontsource/el-messiri/arabic-700.css';

import { HydrateStores } from '@/components/hydrate-stores';
import { Pixels } from '@/components/pixels';
import { DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — عبايات فاخرة`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION.en,
  applicationName: SITE_NAME,
  openGraph: {
    siteName: SITE_NAME,
    images: [{ url: DEFAULT_OG_IMAGE }],
  },
  twitter: {
    card: 'summary_large_image',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // We default the root <html> to lang="ar"/dir="rtl" to match the
    // storefront's default locale and give iOS Safari a stable
    // text-shaping context from the very first paint. The /en route's
    // [locale] layout still wraps its content in <div lang="en"
    // dir="ltr">, which CSS and the browser respect for that subtree.
    <html
      lang="ar"
      dir="rtl"
    >
      {/* Platform detector — tags <html> with `platform-ios` so the
          CSS in globals.css can serve SF Arabic to iPhones/iPads (where
          Cairo renders differently from desktop) and keep Cairo as the
          brand font on every other platform. Runs inline before the
          first paint so there's no flash. */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var u=navigator.userAgent;var isiOS=/iPhone|iPad|iPod/i.test(u)||(u.indexOf('Mac')>-1&&'ontouchend' in document);if(isiOS)document.documentElement.classList.add('platform-ios');})();",
          }}
        />
      </head>
      <body className="font-sans">
        {children}
        <HydrateStores />
        <Pixels />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 2500,
            style: {
              // Inverted vs the cream page so the toast pops dark.
              background: '#1a1a1a',
              color: '#faf7f2',
              borderRadius: 0,
              padding: '12px 20px',
              fontSize: '14px',
              letterSpacing: '0.02em',
            },
          }}
        />
      </body>
    </html>
  );
}
