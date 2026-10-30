/**
 * Seed script — populates a fresh database with:
 *   - 6 Kuwaiti governorates and their shipping fees (in piastres — 1 EGP = 1000 piastres)
 *   - A starter catalog of abaya products across the 6 Kuwaiti categories
 *     (Coloured, Black, Snap, Embroidered, Overhead, Kids) with colour
 *     variants and standard abaya size lists (52–62 for adults, 28–32
 *     for kids)
 *   - A pair of bundles
 *   - The launch coupon DEDA10 (10% off)
 *
 * Prices are stored in piastres so the integer columns avoid float drift.
 * The frontend formatter divides by 1000 and renders 3 decimal places.
 *
 * Re-running this script is safe: it upserts by unique key and clears
 * variants/images of existing products before re-inserting them.
 */
import { PrismaClient, Category, ColorGroup, CouponType, SaleStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Governorates — the six administrative regions of Kuwait. Shipping fees
// are in piastres (1500 piastres = 1.500 EGP), tuned roughly by distance from the
// Capital where the atelier is.
// ---------------------------------------------------------------------------
// Flat 2 EGP (= 2000 piastres) across all Kuwaiti governorates.
const LOCAL_SHIPPING_FEE = 2000;
const GOVERNORATES = [
  { nameEn: 'Capital', nameAr: 'العاصمة', shippingFee: LOCAL_SHIPPING_FEE, sortOrder: 1 },
  { nameEn: 'Hawalli', nameAr: 'حولي', shippingFee: LOCAL_SHIPPING_FEE, sortOrder: 2 },
  { nameEn: 'Farwaniya', nameAr: 'الفروانية', shippingFee: LOCAL_SHIPPING_FEE, sortOrder: 3 },
  { nameEn: 'Mubarak Al-Kabeer', nameAr: 'مبارك الكبير', shippingFee: LOCAL_SHIPPING_FEE, sortOrder: 4 },
  { nameEn: 'Ahmadi', nameAr: 'الأحمدي', shippingFee: LOCAL_SHIPPING_FEE, sortOrder: 5 },
  { nameEn: 'Jahra', nameAr: 'الجهراء', shippingFee: LOCAL_SHIPPING_FEE, sortOrder: 6 },
];

// International destinations — flat 7 EGP (= 7000 piastres) for now. Free
// shipping kicks in at 100 EGP subtotal (enforced in routes/orders.ts).
const INTL_SHIPPING_FEE = 7000;
const COUNTRIES = [
  { code: 'EG', nameEn: 'Egypt', nameAr: 'مصر', shippingFee: INTL_SHIPPING_FEE, sortOrder: 1 },
  { code: 'SA', nameEn: 'Saudi Arabia', nameAr: 'السعودية', shippingFee: INTL_SHIPPING_FEE, sortOrder: 2 },
  { code: 'AE', nameEn: 'United Arab Emirates', nameAr: 'الإمارات', shippingFee: INTL_SHIPPING_FEE, sortOrder: 3 },
  { code: 'QA', nameEn: 'Qatar', nameAr: 'قطر', shippingFee: INTL_SHIPPING_FEE, sortOrder: 4 },
  { code: 'BH', nameEn: 'Bahrain', nameAr: 'البحرين', shippingFee: INTL_SHIPPING_FEE, sortOrder: 5 },
  { code: 'OM', nameEn: 'Oman', nameAr: 'عُمان', shippingFee: INTL_SHIPPING_FEE, sortOrder: 6 },
  { code: 'JO', nameEn: 'Jordan', nameAr: 'الأردن', shippingFee: INTL_SHIPPING_FEE, sortOrder: 7 },
  { code: 'IQ', nameEn: 'Iraq', nameAr: 'العراق', shippingFee: INTL_SHIPPING_FEE, sortOrder: 8 },
  { code: 'SY', nameEn: 'Syria', nameAr: 'سوريا', shippingFee: INTL_SHIPPING_FEE, sortOrder: 9 },
  { code: 'LB', nameEn: 'Lebanon', nameAr: 'لبنان', shippingFee: INTL_SHIPPING_FEE, sortOrder: 10 },
  { code: 'YE', nameEn: 'Yemen', nameAr: 'اليمن', shippingFee: INTL_SHIPPING_FEE, sortOrder: 11 },
  { code: 'LY', nameEn: 'Libya', nameAr: 'ليبيا', shippingFee: INTL_SHIPPING_FEE, sortOrder: 12 },
  { code: 'TN', nameEn: 'Tunisia', nameAr: 'تونس', shippingFee: INTL_SHIPPING_FEE, sortOrder: 13 },
  { code: 'DZ', nameEn: 'Algeria', nameAr: 'الجزائر', shippingFee: INTL_SHIPPING_FEE, sortOrder: 14 },
  { code: 'MA', nameEn: 'Morocco', nameAr: 'المغرب', shippingFee: INTL_SHIPPING_FEE, sortOrder: 15 },
];

// ---------------------------------------------------------------------------
// Size standards — kept in sync with frontend/lib/sizes.ts.
// ---------------------------------------------------------------------------
const ABAYA_SIZES = [
  '50',
  '51',
  '52',
  '53',
  '54',
  '55',
  '56',
  '57',
  '58',
  '59',
  '60',
  '62',
];
const KIDS_SIZES = ['28', '30', '32'];

// ---------------------------------------------------------------------------
// Product catalog
// ---------------------------------------------------------------------------
type SeedColor = {
  nameEn: string;
  nameAr: string;
  hex: string;
  group: ColorGroup;
};

type SeedProduct = {
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  /** Price in piastres (1000 piastres = 1 EGP). */
  basePrice: number;
  discount?: number;
  category: Category;
  isFeatured?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  sizes: string[];
  colors: SeedColor[];
  /** Three verified Unsplash photo ids — main, detail, full-length. */
  imageRefs: [string, string, string];
};

const PRODUCTS: SeedProduct[] = [
  // ============ COLOURED ============
  {
    slug: 'emerald-whisper-abaya',
    nameEn: 'Emerald Whisper Abaya',
    nameAr: 'عباية إيمرالد ويسبر',
    descriptionEn:
      'A coloured abaya cut from a soft viscose crêpe. Drapes quietly, holds its shape, finished by hand at the hem.',
    descriptionAr:
      'عباية ملوّنة من خامة كريب فيسكوز ناعمة. انسياب هادئ مع تشطيب يدوي على الذيل.',
    basePrice: 65000,
    discount: 55000,
    category: Category.COLOURED,
    isFeatured: true,
    isNew: true,
    sizes: ABAYA_SIZES,
    colors: [
      { nameEn: 'Emerald', nameAr: 'زمردي', hex: '#2f5747', group: ColorGroup.GREEN },
      { nameEn: 'Burgundy', nameAr: 'برغندي', hex: '#6e2334', group: ColorGroup.RED },
      { nameEn: 'Midnight', nameAr: 'كحلي ليلي', hex: '#23304a', group: ColorGroup.BLUE },
    ],
    imageRefs: [
      '1570203543523-57e9dc7ff410',
      '1736342182213-6c037467cb38',
      '1505339805025-a5ec452332d9',
    ],
  },
  {
    slug: 'desert-dawn-abaya',
    nameEn: 'Desert Dawn Abaya',
    nameAr: 'عباية فجر الصحراء',
    descriptionEn:
      'A warm coloured everyday abaya. Light fabric, breathable for Kuwait afternoons.',
    descriptionAr:
      'عباية ملوّنة دافئة للارتداء اليومي. خامة خفيفة تتنفّس فى أجواء الكويت.',
    basePrice: 58000,
    category: Category.COLOURED,
    isFeatured: true,
    sizes: ABAYA_SIZES,
    colors: [
      { nameEn: 'Sand', nameAr: 'رملي', hex: '#c9a87c', group: ColorGroup.BEIGE },
      { nameEn: 'Olive', nameAr: 'زيتي', hex: '#737a3d', group: ColorGroup.GREEN },
    ],
    imageRefs: [
      '1736342182213-6c037467cb38',
      '1570203543523-57e9dc7ff410',
      '1767780441121-d27bfc6c8f0e',
    ],
  },

  // ============ BLACK ============
  {
    slug: 'midnight-classic-abaya',
    nameEn: 'Midnight Classic Abaya',
    nameAr: 'عباية ميدنايت الكلاسيكية',
    descriptionEn:
      'The everyday black abaya, perfected. Matte crêpe, clean lines, a quietly tailored shoulder.',
    descriptionAr:
      'العباية السوداء اليومية بأبهى صورة. كريب مطفأ، خطوط نظيفة، وكتف مفصّل بهدوء.',
    basePrice: 45000,
    category: Category.BLACK,
    isFeatured: true,
    isBestSeller: true,
    sizes: ABAYA_SIZES,
    colors: [
      { nameEn: 'Black', nameAr: 'أسود', hex: '#0d0d0d', group: ColorGroup.BLACK },
    ],
    imageRefs: [
      '1613005798967-632017e477c8',
      '1569245087840-dcf487ddbad5',
      '1522219406764-db207f1f7640',
    ],
  },
  {
    slug: 'silk-flow-black-abaya',
    nameEn: 'Silk Flow Black Abaya',
    nameAr: 'عباية حرير سوداء سيلك فلو',
    descriptionEn:
      'A black abaya in silk-blend crêpe. Falls a little softer than the classic, made for occasions.',
    descriptionAr:
      'عباية سوداء بخامة كريب ممزوجة بالحرير. انسياب أنعم من الكلاسيكية، صُمّمت للمناسبات.',
    basePrice: 72000,
    discount: 62000,
    category: Category.BLACK,
    isFeatured: true,
    isNew: true,
    sizes: ABAYA_SIZES,
    colors: [
      { nameEn: 'Black', nameAr: 'أسود', hex: '#0d0d0d', group: ColorGroup.BLACK },
      { nameEn: 'Phantom', nameAr: 'فانتوم', hex: '#1a1a1a', group: ColorGroup.BLACK },
    ],
    imageRefs: [
      '1569245087840-dcf487ddbad5',
      '1613005798967-632017e477c8',
      '1728487235101-664d87965931',
    ],
  },

  // ============ SNAP ============
  {
    slug: 'daily-snap-abaya',
    nameEn: 'Daily Snap Abaya',
    nameAr: 'عباية شك يومية',
    descriptionEn:
      'A casual everyday snap-fastened abaya. Easy to throw on, comfortable to live in.',
    descriptionAr:
      'عباية شك يومية كاجوال. سهل لبسها، مريحة للاستخدام اليومي.',
    basePrice: 38000,
    category: Category.SNAP,
    isFeatured: true,
    isBestSeller: true,
    sizes: ABAYA_SIZES,
    colors: [
      { nameEn: 'Black', nameAr: 'أسود', hex: '#0d0d0d', group: ColorGroup.BLACK },
      { nameEn: 'Mocha', nameAr: 'موكا', hex: '#604a3a', group: ColorGroup.BROWN },
      { nameEn: 'Stone', nameAr: 'حجري', hex: '#9a9183', group: ColorGroup.GRAY },
    ],
    imageRefs: [
      '1522219406764-db207f1f7640',
      '1613005798967-632017e477c8',
      '1736342182213-6c037467cb38',
    ],
  },

  // ============ EMBROIDERED ============
  {
    slug: 'hand-threaded-gold-abaya',
    nameEn: 'Hand-Threaded Gold Abaya',
    nameAr: 'عباية تطريز ذهبي يدوي',
    descriptionEn:
      'Gold thread embroidered at the cuffs and neckline. Each piece takes a week to finish.',
    descriptionAr:
      'تطريز ذهبي يدوي على الأكمام والياقة. كل قطعة تحتاج أسبوع كامل لإتمامها.',
    basePrice: 95000,
    category: Category.EMBROIDERED,
    isFeatured: true,
    isNew: true,
    sizes: ABAYA_SIZES,
    colors: [
      { nameEn: 'Beige', nameAr: 'بيج', hex: '#d4c4a8', group: ColorGroup.BEIGE },
      { nameEn: 'Cream', nameAr: 'كريمي', hex: '#ebe2d0', group: ColorGroup.BEIGE },
      { nameEn: 'Black', nameAr: 'أسود', hex: '#0d0d0d', group: ColorGroup.BLACK },
    ],
    imageRefs: [
      '1760083545495-b297b1690672',
      '1728487235101-664d87965931',
      '1570203543523-57e9dc7ff410',
    ],
  },
  {
    slug: 'crystal-trim-abaya',
    nameEn: 'Crystal Trim Abaya',
    nameAr: 'عباية تطريز كريستال',
    descriptionEn:
      'A discreet line of crystal trim along the front opening. Quietly luxurious.',
    descriptionAr:
      'صف كريستال خفي على الواجهة. فخامة هادئة.',
    basePrice: 88000,
    discount: 78000,
    category: Category.EMBROIDERED,
    isBestSeller: true,
    sizes: ABAYA_SIZES,
    colors: [
      { nameEn: 'Black', nameAr: 'أسود', hex: '#0d0d0d', group: ColorGroup.BLACK },
      { nameEn: 'Navy', nameAr: 'كحلي', hex: '#1e2a44', group: ColorGroup.BLUE },
    ],
    imageRefs: [
      '1728487235101-664d87965931',
      '1569245087840-dcf487ddbad5',
      '1760083545495-b297b1690672',
    ],
  },

  // ============ OVERHEAD ============
  {
    slug: 'veiled-grace-overhead-abaya',
    nameEn: 'Veiled Grace Overhead Abaya',
    nameAr: 'عباية راس فيلد جريس',
    descriptionEn:
      'A traditional overhead abaya cut for full coverage. Soft enough to wear all day.',
    descriptionAr:
      'عباية راس تقليدية بتغطية كاملة. ناعمة بشكل يسمح بارتدائها طوال اليوم.',
    basePrice: 55000,
    category: Category.OVERHEAD,
    isFeatured: true,
    isBestSeller: true,
    sizes: ABAYA_SIZES,
    colors: [
      { nameEn: 'Black', nameAr: 'أسود', hex: '#0d0d0d', group: ColorGroup.BLACK },
      { nameEn: 'Espresso', nameAr: 'إسبريسو', hex: '#3a2418', group: ColorGroup.BROWN },
    ],
    imageRefs: [
      '1505339805025-a5ec452332d9',
      '1613005798967-632017e477c8',
      '1522219406764-db207f1f7640',
    ],
  },

  // ============ KIDS ============
  {
    slug: 'little-mark-kids-abaya',
    nameEn: 'Little Mark Kids Abaya',
    nameAr: 'عباية أطفال ليتل مارك',
    descriptionEn:
      "A children's abaya in soft crêpe. Sized so it grows with her — easy snap closure, no scratchy seams.",
    descriptionAr:
      'عباية أطفال بخامة كريب ناعمة. مقاسات بتكبر معاها — قفل بشك سهل وخياطات ما تخدشش.',
    basePrice: 25000,
    category: Category.KIDS,
    isFeatured: true,
    isNew: true,
    sizes: KIDS_SIZES,
    colors: [
      { nameEn: 'Black', nameAr: 'أسود', hex: '#0d0d0d', group: ColorGroup.BLACK },
      { nameEn: 'Mauve', nameAr: 'موف هادئ', hex: '#8a5e7c', group: ColorGroup.PURPLE },
    ],
    imageRefs: [
      '1767780441121-d27bfc6c8f0e',
      '1627378228978-a62f71edff15',
      '1505339805025-a5ec452332d9',
    ],
  },
  {
    slug: 'mini-classic-kids-abaya',
    nameEn: 'Mini Classic Kids Abaya',
    nameAr: 'عباية أطفال ميني كلاسيك',
    descriptionEn:
      'The kids version of our Midnight Classic — same matte crêpe, sized for ages 4 to 10.',
    descriptionAr:
      'نسخة الأطفال من ميدنايت الكلاسيكية — نفس الكريب المطفأ بمقاسات تناسب من ٤ إلى ١٠ سنوات.',
    basePrice: 22000,
    category: Category.KIDS,
    sizes: KIDS_SIZES,
    colors: [
      { nameEn: 'Black', nameAr: 'أسود', hex: '#0d0d0d', group: ColorGroup.BLACK },
    ],
    imageRefs: [
      '1627378228978-a62f71edff15',
      '1767780441121-d27bfc6c8f0e',
      '1613005798967-632017e477c8',
    ],
  },
];

// ---------------------------------------------------------------------------
// Bundles — curated sets the storefront highlights at a single price.
// ---------------------------------------------------------------------------
const BUNDLES = [
  {
    slug: 'mother-daughter-set',
    nameEn: 'Mother & Daughter Set',
    nameAr: ' الأم والبنت',
    descriptionEn:
      'The Midnight Classic for her and the Mini Classic for the little one — quiet pairing for everyday.',
    descriptionAr:
      'مجموعة مناسبة لكِ و لطفلتك — تناغم هادئ للاستخدام اليومي.',
    bundlePrice: 60000,
    originalPrice: 67000,
    productSlugs: ['midnight-classic-abaya', 'mini-classic-kids-abaya'],
  },
  {
    slug: 'occasion-edit',
    nameEn: 'The Occasion Edit',
    nameAr: 'المناسبات',
    descriptionEn:
      'A coloured emerald with a hand-threaded gold piece — two looks that take you from afternoon to evening.',
    descriptionAr:
      'عباية ملوّنة مع قطعة تطريز ذهبي يدوي — إطلالتان تنقلانك من المساء للسهرة.',
    bundlePrice: 150000,
    originalPrice: 160000,
    productSlugs: ['emerald-whisper-abaya', 'hand-threaded-gold-abaya'],
  },
];

// ---------------------------------------------------------------------------
// Placeholder image URL builder — used until the studio photoshoot lands.
// ---------------------------------------------------------------------------
function placeholderImage(ref: string): string {
  return `https://images.unsplash.com/photo-${ref}?w=800&h=1000&fit=crop&q=85&auto=format`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('Seeding Kuwait governorates…');
  for (const g of GOVERNORATES) {
    await prisma.governorate.upsert({
      where: { nameEn: g.nameEn },
      update: { nameAr: g.nameAr, shippingFee: g.shippingFee, sortOrder: g.sortOrder },
      create: g,
    });
  }

  console.log('Seeding international countries…');
  for (const c of COUNTRIES) {
    await prisma.country.upsert({
      where: { code: c.code },
      update: {
        nameEn: c.nameEn,
        nameAr: c.nameAr,
        shippingFee: c.shippingFee,
        sortOrder: c.sortOrder,
      },
      create: c,
    });
  }

  console.log('Seeding abaya catalog…');
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i]!;

    // Upsert product (without variants), then replace variants and images.
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        nameEn: p.nameEn,
        nameAr: p.nameAr,
        descriptionEn: p.descriptionEn,
        descriptionAr: p.descriptionAr,
        basePrice: p.basePrice,
        discount: p.discount ?? null,
        category: p.category,
        isFeatured: p.isFeatured ?? false,
        isNew: p.isNew ?? false,
        isBestSeller: p.isBestSeller ?? false,
        sortOrder: i,
        status: SaleStatus.IN_SALE,
      },
      create: {
        slug: p.slug,
        nameEn: p.nameEn,
        nameAr: p.nameAr,
        descriptionEn: p.descriptionEn,
        descriptionAr: p.descriptionAr,
        basePrice: p.basePrice,
        discount: p.discount ?? null,
        category: p.category,
        isFeatured: p.isFeatured ?? false,
        isNew: p.isNew ?? false,
        isBestSeller: p.isBestSeller ?? false,
        sortOrder: i,
      },
    });

    // Wipe and recreate variants + images so re-running the seed stays clean.
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.variant.deleteMany({ where: { productId: product.id } });

    // Three product-level images — main, detail, full-length. variantId is
    // null so they show in the product detail carousel regardless of which
    // colour the customer has picked.
    for (let imgIdx = 0; imgIdx < p.imageRefs.length; imgIdx++) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          variantId: null,
          url: placeholderImage(p.imageRefs[imgIdx]!),
          alt: `${p.nameEn} — view ${imgIdx + 1}`,
          sortOrder: imgIdx,
        },
      });
    }

    for (let v = 0; v < p.colors.length; v++) {
      const c = p.colors[v]!;
      const variant = await prisma.variant.create({
        data: {
          productId: product.id,
          colorNameEn: c.nameEn,
          colorNameAr: c.nameAr,
          colorHex: c.hex,
          colorGroup: c.group,
          sizes: p.sizes,
          sortOrder: v,
        },
      });

      // One variant-level photo per colour so the storefront can show a
      // colour-specific shot when the customer picks that variant. Reuses
      // the product's primary photo — replace via the admin UI once real
      // colour photography lands.
      await prisma.productImage.create({
        data: {
          productId: product.id,
          variantId: variant.id,
          url: placeholderImage(p.imageRefs[0]!),
          alt: `${p.nameEn} — ${c.nameEn}`,
          sortOrder: 0,
        },
      });
    }
  }

  console.log('Seeding bundles…');
  for (let i = 0; i < BUNDLES.length; i++) {
    const b = BUNDLES[i]!;
    const bundle = await prisma.bundle.upsert({
      where: { slug: b.slug },
      update: {
        nameEn: b.nameEn,
        nameAr: b.nameAr,
        descriptionEn: b.descriptionEn,
        descriptionAr: b.descriptionAr,
        bundlePrice: b.bundlePrice,
        originalPrice: b.originalPrice,
        sortOrder: i,
      },
      create: {
        slug: b.slug,
        nameEn: b.nameEn,
        nameAr: b.nameAr,
        descriptionEn: b.descriptionEn,
        descriptionAr: b.descriptionAr,
        bundlePrice: b.bundlePrice,
        originalPrice: b.originalPrice,
        sortOrder: i,
      },
    });

    await prisma.bundleProduct.deleteMany({ where: { bundleId: bundle.id } });
    for (let j = 0; j < b.productSlugs.length; j++) {
      const product = await prisma.product.findUnique({ where: { slug: b.productSlugs[j]! } });
      if (!product) {
        console.warn(`  skipping bundle item — product not found: ${b.productSlugs[j]}`);
        continue;
      }
      await prisma.bundleProduct.create({
        data: { bundleId: bundle.id, productId: product.id, sortOrder: j },
      });
    }
  }

  console.log('Seeding launch coupon…');
  await prisma.coupon.upsert({
    where: { code: 'DEDA10' },
    update: { isActive: true },
    create: {
      code: 'DEDA10',
      type: CouponType.PERCENT,
      value: 10,
      isActive: true,
    },
  });

  console.log('Done.');
}

main()
  .catch(async (err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
