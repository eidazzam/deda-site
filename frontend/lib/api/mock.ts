/**
 * Mock storefront — mirrors `backend/prisma/seed.ts` so the Cloudflare Pages
 * site can render the full Egypt abaya catalog before the real backend is
 * deployed to the VPS. Activated by setting `NEXT_PUBLIC_USE_MOCK=true` on
 * the Pages project; `lib/api/client.ts` short-circuits every method here
 * when that flag is on.
 *
 * Mutating endpoints (orders.create, coupons.validate, leads) return
 * plausible success responses so the checkout UI can be walked through —
 * nothing persists. Once the real API is up, flip the env var off and
 * delete the var (or this file) to retire the mock entirely.
 *
 * Keep this in sync with seed.ts. The intentional duplication is the
 * price of letting Pages stand alone.
 */
import type {
  Bundle,
  Category,
  ColorGroup,
  CouponValidation,
  Country,
  CreateOrderInput,
  CreatedOrder,
  CategoryImage,
  Governorate,
  HeroSlide,
  Pagination,
  ProductCard,
  ProductColor,
  ProductDetail,
  ProductVariant,
  SiteConfig,
} from './types';
import type { ProductsListResponse, ProductsQuery } from './client';

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

const placeholderImage = (ref: string) =>
  `https://images.unsplash.com/photo-${ref}?w=800&h=1000&fit=crop&q=85&auto=format`;

type MockColor = {
  nameEn: string;
  nameAr: string;
  hex: string;
  group: ColorGroup;
};

type MockProduct = {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  basePrice: number;
  discount: number | null;
  category: Category;
  isFeatured: boolean;
  isNew: boolean;
  isBestSeller?: boolean;
  sizes: string[];
  colors: MockColor[];
  imageRef: string;
};

const MOCK_PRODUCTS: MockProduct[] = [
  // ============ COLOURED ============
  {
    id: 1,
    slug: 'emerald-whisper-abaya',
    nameEn: 'Emerald Whisper Abaya',
    nameAr: 'عباية إيمرالد ويسبر',
    descriptionEn:
      'A coloured abaya cut from a soft viscose crêpe. Drapes quietly, holds its shape, finished by hand at the hem.',
    descriptionAr:
      'عباية ملوّنة من خامة كريب فيسكوز ناعمة. انسياب هادئ مع تشطيب يدوي على الذيل.',
    basePrice: 65000,
    discount: 55000,
    category: 'COLOURED',
    isFeatured: true,
    isNew: true,
    sizes: ABAYA_SIZES,
    colors: [
      { nameEn: 'Emerald', nameAr: 'زمردي', hex: '#2f5747', group: 'GREEN' },
      { nameEn: 'Burgundy', nameAr: 'برغندي', hex: '#6e2334', group: 'RED' },
      { nameEn: 'Midnight', nameAr: 'كحلي ليلي', hex: '#23304a', group: 'BLUE' },
    ],
    imageRef: '1570203543523-57e9dc7ff410',
  },
  {
    id: 2,
    slug: 'desert-dawn-abaya',
    nameEn: 'Desert Dawn Abaya',
    nameAr: 'عباية فجر الصحراء',
    descriptionEn:
      'A warm coloured everyday abaya. Light fabric, breathable for Egypt afternoons.',
    descriptionAr:
      'عباية ملوّنة دافئة للارتداء اليومي. خامة خفيفة تتنفّس فى أجواء مصر.',
    basePrice: 58000,
    discount: null,
    category: 'COLOURED',
    isFeatured: true,
    isNew: false,
    sizes: ABAYA_SIZES,
    colors: [
      { nameEn: 'Sand', nameAr: 'رملي', hex: '#c9a87c', group: 'BEIGE' },
      { nameEn: 'Olive', nameAr: 'زيتي', hex: '#737a3d', group: 'GREEN' },
    ],
    imageRef: '1736342182213-6c037467cb38',
  },

  // ============ BLACK ============
  {
    id: 3,
    slug: 'midnight-classic-abaya',
    nameEn: 'Midnight Classic Abaya',
    nameAr: 'عباية ميدنايت الكلاسيكية',
    descriptionEn:
      'The everyday black abaya, perfected. Matte crêpe, clean lines, a quietly tailored shoulder.',
    descriptionAr:
      'العباية السوداء اليومية بأبهى صورة. كريب مطفأ، خطوط نظيفة، وكتف مفصّل بهدوء.',
    basePrice: 45000,
    discount: null,
    category: 'BLACK',
    isFeatured: true,
    isNew: false,
    isBestSeller: true,
    sizes: ABAYA_SIZES,
    colors: [{ nameEn: 'Black', nameAr: 'أسود', hex: '#0d0d0d', group: 'BLACK' }],
    imageRef: '1613005798967-632017e477c8',
  },
  {
    id: 4,
    slug: 'silk-flow-black-abaya',
    nameEn: 'Silk Flow Black Abaya',
    nameAr: 'عباية حرير سوداء سيلك فلو',
    descriptionEn:
      'A black abaya in silk-blend crêpe. Falls a little softer than the classic, made for occasions.',
    descriptionAr:
      'عباية سوداء بخامة كريب ممزوجة بالحرير. انسياب أنعم من الكلاسيكية، صُمّمت للمناسبات.',
    basePrice: 72000,
    discount: 62000,
    category: 'BLACK',
    isFeatured: true,
    isNew: true,
    sizes: ABAYA_SIZES,
    colors: [
      { nameEn: 'Black', nameAr: 'أسود', hex: '#0d0d0d', group: 'BLACK' },
      { nameEn: 'Phantom', nameAr: 'فانتوم', hex: '#1a1a1a', group: 'BLACK' },
    ],
    imageRef: '1569245087840-dcf487ddbad5',
  },

  // ============ SNAP ============
  {
    id: 5,
    slug: 'daily-snap-abaya',
    nameEn: 'Daily Snap Abaya',
    nameAr: 'عباية شك يومية',
    descriptionEn:
      'A casual everyday snap-fastened abaya. Easy to throw on, comfortable to live in.',
    descriptionAr: 'عباية شك يومية كاجوال. سهل لبسها، مريحة للاستخدام اليومي.',
    basePrice: 38000,
    discount: null,
    category: 'SNAP',
    isFeatured: true,
    isNew: false,
    isBestSeller: true,
    sizes: ABAYA_SIZES,
    colors: [
      { nameEn: 'Black', nameAr: 'أسود', hex: '#0d0d0d', group: 'BLACK' },
      { nameEn: 'Mocha', nameAr: 'موكا', hex: '#604a3a', group: 'BROWN' },
      { nameEn: 'Stone', nameAr: 'حجري', hex: '#9a9183', group: 'GRAY' },
    ],
    imageRef: '1522219406764-db207f1f7640',
  },

  // ============ EMBROIDERED ============
  {
    id: 6,
    slug: 'hand-threaded-gold-abaya',
    nameEn: 'Hand-Threaded Gold Abaya',
    nameAr: 'عباية تطريز ذهبي يدوي',
    descriptionEn:
      'Gold thread embroidered at the cuffs and neckline. Each piece takes a week to finish.',
    descriptionAr:
      'تطريز ذهبي يدوي على الأكمام والياقة. كل قطعة تحتاج أسبوع كامل لإتمامها.',
    basePrice: 95000,
    discount: null,
    category: 'EMBROIDERED',
    isFeatured: true,
    isNew: true,
    sizes: ABAYA_SIZES,
    colors: [
      { nameEn: 'Beige', nameAr: 'بيج', hex: '#d4c4a8', group: 'BEIGE' },
      { nameEn: 'Cream', nameAr: 'كريمي', hex: '#ebe2d0', group: 'BEIGE' },
      { nameEn: 'Black', nameAr: 'أسود', hex: '#0d0d0d', group: 'BLACK' },
    ],
    imageRef: '1760083545495-b297b1690672',
  },
  {
    id: 7,
    slug: 'crystal-trim-abaya',
    nameEn: 'Crystal Trim Abaya',
    nameAr: 'عباية تطريز كريستال',
    descriptionEn:
      'A discreet line of crystal trim along the front opening. Quietly luxurious.',
    descriptionAr: 'صف كريستال خفي على الواجهة. فخامة هادئة.',
    basePrice: 88000,
    discount: 78000,
    category: 'EMBROIDERED',
    isFeatured: false,
    isNew: false,
    isBestSeller: true,
    sizes: ABAYA_SIZES,
    colors: [
      { nameEn: 'Black', nameAr: 'أسود', hex: '#0d0d0d', group: 'BLACK' },
      { nameEn: 'Navy', nameAr: 'كحلي', hex: '#1e2a44', group: 'BLUE' },
    ],
    imageRef: '1728487235101-664d87965931',
  },

  // ============ OVERHEAD ============
  {
    id: 8,
    slug: 'veiled-grace-overhead-abaya',
    nameEn: 'Veiled Grace Overhead Abaya',
    nameAr: 'عباية راس فيلد جريس',
    descriptionEn:
      'A traditional overhead abaya cut for full coverage. Soft enough to wear all day.',
    descriptionAr:
      'عباية راس تقليدية بتغطية كاملة. ناعمة بشكل يسمح بارتدائها طوال اليوم.',
    basePrice: 55000,
    discount: null,
    category: 'OVERHEAD',
    isFeatured: true,
    isNew: false,
    isBestSeller: true,
    sizes: ABAYA_SIZES,
    colors: [
      { nameEn: 'Black', nameAr: 'أسود', hex: '#0d0d0d', group: 'BLACK' },
      { nameEn: 'Espresso', nameAr: 'إسبريسو', hex: '#3a2418', group: 'BROWN' },
    ],
    imageRef: '1505339805025-a5ec452332d9',
  },

  // ============ KIDS ============
  {
    id: 9,
    slug: 'little-mark-kids-abaya',
    nameEn: 'Little Mark Kids Abaya',
    nameAr: 'عباية أطفال ليتل مارك',
    descriptionEn:
      "A children's abaya in soft crêpe. Sized so it grows with her — easy snap closure, no scratchy seams.",
    descriptionAr:
      'عباية أطفال بخامة كريب ناعمة. مقاسات بتكبر معاها — قفل بشك سهل وخياطات ما تخدشش.',
    basePrice: 25000,
    discount: null,
    category: 'KIDS',
    isFeatured: true,
    isNew: true,
    sizes: KIDS_SIZES,
    colors: [
      { nameEn: 'Black', nameAr: 'أسود', hex: '#0d0d0d', group: 'BLACK' },
      { nameEn: 'Mauve', nameAr: 'موف هادئ', hex: '#8a5e7c', group: 'PURPLE' },
    ],
    imageRef: '1767780441121-d27bfc6c8f0e',
  },
  {
    id: 10,
    slug: 'mini-classic-kids-abaya',
    nameEn: 'Mini Classic Kids Abaya',
    nameAr: 'عباية أطفال ميني كلاسيك',
    descriptionEn:
      'The kids version of our Midnight Classic — same matte crêpe, sized for ages 4 to 10.',
    descriptionAr:
      'نسخة الأطفال من ميدنايت الكلاسيكية — نفس الكريب المطفأ بمقاسات تناسب من ٤ إلى ١٠ سنوات.',
    basePrice: 22000,
    discount: null,
    category: 'KIDS',
    isFeatured: false,
    isNew: false,
    sizes: KIDS_SIZES,
    colors: [{ nameEn: 'Black', nameAr: 'أسود', hex: '#0d0d0d', group: 'BLACK' }],
    imageRef: '1627378228978-a62f71edff15',
  },
];

const MOCK_GOVERNORATES: Governorate[] = [
  { nameEn: 'Capital', nameAr: 'العاصمة', shippingFee: 2000 },
  { nameEn: 'Hawalli', nameAr: 'حولي', shippingFee: 2000 },
  { nameEn: 'Farwaniya', nameAr: 'الفروانية', shippingFee: 2000 },
  { nameEn: 'Mubarak Al-Kabeer', nameAr: 'مبارك الكبير', shippingFee: 2000 },
  { nameEn: 'Ahmadi', nameAr: 'الأحمدي', shippingFee: 2000 },
  { nameEn: 'Jahra', nameAr: 'الجهراء', shippingFee: 2000 },
];

// Mirrors the seeded Country table for offline / Pages-mock mode.
const MOCK_COUNTRIES: Country[] = [
  { code: 'EG', nameEn: 'Egypt', nameAr: 'مصر', shippingFee: 7000 },
  { code: 'SA', nameEn: 'Saudi Arabia', nameAr: 'السعودية', shippingFee: 7000 },
  { code: 'AE', nameEn: 'United Arab Emirates', nameAr: 'الإمارات', shippingFee: 7000 },
  { code: 'QA', nameEn: 'Qatar', nameAr: 'قطر', shippingFee: 7000 },
  { code: 'BH', nameEn: 'Bahrain', nameAr: 'البحرين', shippingFee: 7000 },
  { code: 'OM', nameEn: 'Oman', nameAr: 'عُمان', shippingFee: 7000 },
  { code: 'JO', nameEn: 'Jordan', nameAr: 'الأردن', shippingFee: 7000 },
  { code: 'IQ', nameEn: 'Iraq', nameAr: 'العراق', shippingFee: 7000 },
  { code: 'SY', nameEn: 'Syria', nameAr: 'سوريا', shippingFee: 7000 },
  { code: 'LB', nameEn: 'Lebanon', nameAr: 'لبنان', shippingFee: 7000 },
  { code: 'YE', nameEn: 'Yemen', nameAr: 'اليمن', shippingFee: 7000 },
  { code: 'LY', nameEn: 'Libya', nameAr: 'ليبيا', shippingFee: 7000 },
  { code: 'TN', nameEn: 'Tunisia', nameAr: 'تونس', shippingFee: 7000 },
  { code: 'DZ', nameEn: 'Algeria', nameAr: 'الجزائر', shippingFee: 7000 },
  { code: 'MA', nameEn: 'Morocco', nameAr: 'المغرب', shippingFee: 7000 },
];

type MockBundle = {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  bundlePrice: number;
  originalPrice: number;
  productSlugs: string[];
};

const MOCK_BUNDLES: MockBundle[] = [
  {
    id: 1,
    slug: 'mother-daughter',
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
    id: 2,
    slug: 'occasion',
    nameEn: 'The Occasion Edit',
    nameAr: 'المناسبات',
    descriptionEn:
      'A coloured emerald with a hand-threaded gold piece — two looks that take you from afternoon to evening.',
    descriptionAr:
      'عباية  ملوّنة مع قطعة تطريز ذهبي يدوي — إطلالتان تنقلانك من المساء للسهرة.',
    bundlePrice: 150000,
    originalPrice: 160000,
    productSlugs: ['emerald-whisper-abaya', 'hand-threaded-gold-abaya'],
  },
];

// ---------------------------------------------------------------------------
// Wire-format converters — keep these symmetric with how the backend
// serialises ProductCard / ProductDetail / Bundle.
// ---------------------------------------------------------------------------

function toProductCard(p: MockProduct): ProductCard {
  const colors: ProductColor[] = p.colors.map((c) => ({
    colorNameEn: c.nameEn,
    colorNameAr: c.nameAr,
    colorHex: c.hex,
    colorGroup: c.group,
    status: 'IN_SALE',
  }));
  return {
    id: p.id,
    slug: p.slug,
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    basePrice: p.basePrice,
    discount: p.discount,
    category: p.category,
    status: 'IN_SALE',
    isFeatured: p.isFeatured,
    isNew: p.isNew,
    isBestSeller: p.isBestSeller ?? false,
    primaryImage: placeholderImage(p.imageRef),
    colors,
  };
}

function toProductDetail(p: MockProduct): ProductDetail {
  const img = placeholderImage(p.imageRef);
  const variants: ProductVariant[] = p.colors.map((c) => ({
    colorNameEn: c.nameEn,
    colorNameAr: c.nameAr,
    colorHex: c.hex,
    colorGroup: c.group,
    status: 'IN_SALE',
    sizes: p.sizes,
    images: [{ url: img, alt: `${p.nameEn} — ${c.nameEn}` }],
  }));
  return {
    id: p.id,
    slug: p.slug,
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    descriptionEn: p.descriptionEn,
    descriptionAr: p.descriptionAr,
    basePrice: p.basePrice,
    discount: p.discount,
    category: p.category,
    status: 'IN_SALE',
    isFeatured: p.isFeatured,
    isNew: p.isNew,
    isBestSeller: p.isBestSeller ?? false,
    images: [{ url: img, alt: p.nameEn }],
    variants,
  };
}

function toBundle(b: MockBundle): Bundle {
  const products = b.productSlugs
    .map((slug) => MOCK_PRODUCTS.find((p) => p.slug === slug))
    .filter((p): p is MockProduct => p !== undefined)
    .map((p) => ({
      slug: p.slug,
      nameEn: p.nameEn,
      nameAr: p.nameAr,
      primaryImage: placeholderImage(p.imageRef),
    }));
  return {
    id: b.id,
    slug: b.slug,
    nameEn: b.nameEn,
    nameAr: b.nameAr,
    descriptionEn: b.descriptionEn,
    descriptionAr: b.descriptionAr,
    bundlePrice: b.bundlePrice,
    originalPrice: b.originalPrice,
    savings: b.originalPrice - b.bundlePrice,
    imageUrl: products[0]?.primaryImage ?? null,
    products,
  };
}

// ---------------------------------------------------------------------------
// Public surface — one function per real API endpoint.
// ---------------------------------------------------------------------------

export function mockListProducts(q: ProductsQuery): ProductsListResponse {
  let items = MOCK_PRODUCTS.slice();

  if (q.category) {
    const cat = q.category.toUpperCase();
    items = items.filter((p) => p.category === cat);
  }
  if (q.color) {
    const groups = q.color
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    items = items.filter((p) => p.colors.some((c) => groups.includes(c.group)));
  }
  if (q.size) {
    const sizes = q.size
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    items = items.filter((p) => p.sizes.some((s) => sizes.includes(s)));
  }
  if (q.isFeatured) items = items.filter((p) => p.isFeatured);
  if (q.isNew) items = items.filter((p) => p.isNew);
  if (q.isBestSeller) items = items.filter((p) => p.isBestSeller);
  if (q.search) {
    const needle = q.search.toLowerCase();
    items = items.filter(
      (p) =>
        p.nameEn.toLowerCase().includes(needle) ||
        p.nameAr.includes(q.search!) ||
        p.slug.includes(needle),
    );
  }

  const sort = q.sort ?? 'newest';
  const effectivePrice = (p: MockProduct) => p.discount ?? p.basePrice;
  if (sort === 'oldest') items.reverse();
  else if (sort === 'price-asc')
    items.sort((a, b) => effectivePrice(a) - effectivePrice(b));
  else if (sort === 'price-desc')
    items.sort((a, b) => effectivePrice(b) - effectivePrice(a));
  // 'newest' keeps catalog order (id asc ≈ insertion order).

  const page = Math.max(1, q.page ?? 1);
  const limit = Math.max(1, q.limit ?? 24);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const paged = items.slice(start, start + limit);

  const pagination: Pagination = { page, limit, total, totalPages };
  return { items: paged.map(toProductCard), pagination };
}

export function mockGetProductBySlug(slug: string): ProductDetail {
  const p = MOCK_PRODUCTS.find((x) => x.slug === slug);
  if (!p) {
    throw Object.assign(new Error('Product not found'), {
      name: 'ApiError',
      code: 'NOT_FOUND',
      status: 404,
    });
  }
  return toProductDetail(p);
}

export function mockListGovernorates(): Governorate[] {
  return MOCK_GOVERNORATES.slice();
}

export function mockListCountries(): Country[] {
  return MOCK_COUNTRIES.slice();
}

export function mockListBundles(): Bundle[] {
  return MOCK_BUNDLES.map(toBundle);
}

// Hero slider mock — mirrors the four editorial frames the homepage
// shipped with so Cloudflare Pages mock mode keeps rendering them when
// the real backend is unreachable.
const MOCK_HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1613005798967-632017e477c8?w=1400&h=1700&fit=crop&q=85&auto=format',
    altEn: 'Opening look in black abaya',
    altAr: 'إطلالة افتتاحية بعباية سوداء',
  },
  {
    id: 2,
    url: 'https://images.unsplash.com/photo-1570203543523-57e9dc7ff410?w=1400&h=1700&fit=crop&q=85&auto=format',
    altEn: 'A coloured abaya in warm tones',
    altAr: 'عباية ملوّنة بألوان دافئة',
  },
  {
    id: 3,
    url: 'https://images.unsplash.com/photo-1760083545495-b297b1690672?w=1400&h=1700&fit=crop&q=85&auto=format',
    altEn: 'Quiet embroidery on a beige abaya',
    altAr: 'تطريز هادئ على عباية بيج',
  },
  {
    id: 4,
    url: 'https://images.unsplash.com/photo-1736342182213-6c037467cb38?w=1400&h=1700&fit=crop&q=85&auto=format',
    altEn: 'A shared moment, dressed in tradition',
    altAr: 'لحظة جماعية بإطلالات تقليدية',
  },
];

export function mockListHeroSlides(): HeroSlide[] {
  return MOCK_HERO_SLIDES.slice();
}

// Category card overrides — empty by default so the storefront keeps
// its hardcoded category images in mock mode. The admin uploads
// per-category covers; that data lives on the real backend only.
export function mockListCategoryImages(): CategoryImage[] {
  return [];
}

export function mockValidateCoupon(
  code: string,
  subtotal: number,
): CouponValidation {
  if (code.trim().toUpperCase() !== 'DEDA10') {
    throw Object.assign(new Error('Invalid coupon'), {
      name: 'ApiError',
      code: 'INVALID_COUPON',
      status: 400,
    });
  }
  const discount = Math.floor(subtotal * 0.1);
  return { code: 'DEDA10', type: 'PERCENT', value: 10, discount };
}

export function mockCreateOrder(input: CreateOrderInput): CreatedOrder {
  // Compute a believable total from the mock catalog so the success page
  // shows numbers that match the cart the user just submitted.
  let subtotal = 0;
  for (const item of input.items) {
    const p = MOCK_PRODUCTS.find((x) => x.slug === item.productSlug);
    if (!p) continue;
    subtotal += (p.discount ?? p.basePrice) * item.quantity;
  }
  // Mirror the backend: Egypt uses governorate fees + 30 EGP free
  // threshold, everywhere else uses a flat country fee + 100 EGP threshold.
  const isEgypt = (input.countryCode ?? 'KW') === 'KW';
  let baseShippingFee = 2000;
  if (isEgypt) {
    const gov = MOCK_GOVERNORATES.find((g) => g.nameEn === input.governorateName);
    baseShippingFee = gov?.shippingFee ?? 2000;
  } else {
    const country = MOCK_COUNTRIES.find((c) => c.code === input.countryCode);
    baseShippingFee = country?.shippingFee ?? 7000;
  }
  const freeThreshold = isEgypt ? 30_000 : 100_000;
  const shippingFee = subtotal >= freeThreshold ? 0 : baseShippingFee;
  let discount = 0;
  if (input.couponCode && input.couponCode.trim().toUpperCase() === 'DEDA10') {
    discount = Math.floor(subtotal * 0.1);
  }
  const total = subtotal + shippingFee - discount;
  const now = new Date();
  // Mock mode treats every order as COD — no Tap charge is created and
  // the storefront skips the redirect step entirely.
  return {
    id: Date.now(),
    orderNumber: `RZ-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate(),
    ).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    subtotal,
    shippingFee,
    discount,
    total,
    status: 'PENDING',
    paymentMethod: 'COD',
    paymentStatus: null,
    createdAt: now.toISOString(),
  };
}

export function mockNotifyOutOfStock(): { ok: true } {
  return { ok: true };
}

export function mockSiteConfig(): SiteConfig {
  return {
    whatsappNumber: '+96599999999',
    facebookUrl: null,
    instagramUrl: 'https://instagram.com/deda.kw',
    tiktokUrl: null,
    snapchatUrl: 'https://snapchat.com/add/deda.kw',
  };
}
