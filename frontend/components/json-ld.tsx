import type { ProductDetail } from '@/lib/api/types';
import type { Locale } from '@/lib/i18n/config';
import { SITE_NAME, SITE_URL } from '@/lib/site';

// Helper that emits a single <script type="application/ld+json"/> tag.
// We stringify ourselves so the resulting JSON is compact and search
// engines see exactly what we authored.
function JsonLdScript({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd({ locale }: { locale: Locale }) {
  return (
    <JsonLdScript
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: `${SITE_URL}/${locale}`,
        logo: `${SITE_URL}/favicon.ico`,
        sameAs: [],
      }}
    />
  );
}

/**
 * Product schema is the structured data Google uses for shopping rich
 * results — name, image, price, currency, availability. We pick the
 * effective price (discount if set, else basePrice) and surface stock
 * status based on the product-level toggle.
 */
export function ProductJsonLd({
  product,
  locale,
}: {
  product: ProductDetail;
  locale: Locale;
}) {
  const isAR = locale === 'ar';
  const name = isAR ? product.nameAr : product.nameEn;
  const description = isAR ? product.descriptionAr : product.descriptionEn;
  const price = product.discount ?? product.basePrice;
  const images = [
    ...product.images.map((i) => i.url),
    ...product.variants.flatMap((v) => v.images.map((i) => i.url)),
  ].filter((u, i, arr) => arr.indexOf(u) === i);
  const availability =
    product.status === 'OUT_OF_STOCK'
      ? 'https://schema.org/OutOfStock'
      : 'https://schema.org/InStock';
  const canonical = `${SITE_URL}/${locale}/product/${product.slug}`;

  return (
    <JsonLdScript
      data={{
        '@context': 'https://schema.org',
        '@type': 'Product',
        name,
        description,
        image: images.length > 0 ? images : undefined,
        sku: `ROZ-${product.id}`,
        brand: { '@type': 'Brand', name: SITE_NAME },
        offers: {
          '@type': 'Offer',
          url: canonical,
          priceCurrency: 'KWD',
          // Prices are stored as fils in the DB; schema.org expects the
          // major currency unit (KWD).
          price: (price / 1000).toFixed(3),
          availability,
          itemCondition: 'https://schema.org/NewCondition',
        },
      }}
    />
  );
}
