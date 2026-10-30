import type { Locale } from '@/lib/i18n/config';

/**
 * Rendered as a fallback when a Server Component can't reach the API.
 * Keeps the page from blowing up while the backend is offline (which
 * happens during local builds before the VPS deployment lands).
 */
export function ApiDownNotice({ locale }: { locale: Locale }) {
  const isAR = locale === 'ar';
  return (
    <section className="max-w-md mx-auto text-center py-24 px-6">
      <div className="text-xs tracking-widest uppercase text-muted mb-3">
        {isAR ? 'مؤقتاً' : 'Temporary'}
      </div>
      <h1 className="font-display text-3xl mb-3">
        {isAR ? 'المتجر فى الطريق' : 'Storefront is loading'}
      </h1>
      <p className="text-muted text-sm leading-relaxed">
        {isAR
          ? 'نُجهّز المنتجات الآن. عاود التحديث خلال دقيقة.'
          : "We're preparing the catalog. Refresh in a moment."}
      </p>
    </section>
  );
}
