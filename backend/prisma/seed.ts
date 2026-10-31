/**
 * Seed script — populates a fresh database with:
 *   - 27 Egyptian governorates and their shipping fees (in piastres,
 *     1 EGP = 100 piastres)
 *   - The Deda launch catalog: six real products (two prayer abayas,
 *     three cotton shirts, one blouse + skirt set) using the brand's
 *     own photography committed under frontend/public/products/
 *
 * Prices are stored in piastres so the integer columns avoid float
 * drift. The frontend formatter divides by 100 and renders two
 * decimals.
 *
 * Re-running this script is safe: it wipes any product whose slug is
 * no longer in LAUNCH_PRODUCTS (so old sample stock gets cleared out),
 * upserts the current list by slug, and clears variants + images per
 * product before re-inserting them.
 */
import { PrismaClient, Category, ColorGroup, SaleStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Governorates — the 27 administrative regions of Egypt. Shipping fees
// are in piastres (7000 = 70 EGP, 10000 = 100 EGP). Cairo + Giza get
// the discounted rate because they're next door to the courier hub;
// everywhere else pays the standard 100 EGP flat.
// ---------------------------------------------------------------------------
const CAIRO_GIZA_SHIPPING_FEE = 7000;    // 70 EGP
const OTHER_GOVERNORATE_SHIPPING = 10000; // 100 EGP

const GOVERNORATES = [
  { nameEn: 'Cairo', nameAr: 'القاهرة', shippingFee: CAIRO_GIZA_SHIPPING_FEE, sortOrder: 1 },
  { nameEn: 'Giza', nameAr: 'الجيزة', shippingFee: CAIRO_GIZA_SHIPPING_FEE, sortOrder: 2 },
  { nameEn: 'Alexandria', nameAr: 'الإسكندرية', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 3 },
  { nameEn: 'Qalyubia', nameAr: 'القليوبية', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 4 },
  { nameEn: 'Dakahlia', nameAr: 'الدقهلية', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 5 },
  { nameEn: 'Sharqia', nameAr: 'الشرقية', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 6 },
  { nameEn: 'Gharbia', nameAr: 'الغربية', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 7 },
  { nameEn: 'Monufia', nameAr: 'المنوفية', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 8 },
  { nameEn: 'Kafr El Sheikh', nameAr: 'كفر الشيخ', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 9 },
  { nameEn: 'Beheira', nameAr: 'البحيرة', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 10 },
  { nameEn: 'Damietta', nameAr: 'دمياط', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 11 },
  { nameEn: 'Port Said', nameAr: 'بورسعيد', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 12 },
  { nameEn: 'Ismailia', nameAr: 'الإسماعيلية', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 13 },
  { nameEn: 'Suez', nameAr: 'السويس', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 14 },
  { nameEn: 'North Sinai', nameAr: 'شمال سيناء', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 15 },
  { nameEn: 'South Sinai', nameAr: 'جنوب سيناء', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 16 },
  { nameEn: 'Red Sea', nameAr: 'البحر الأحمر', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 17 },
  { nameEn: 'Matrouh', nameAr: 'مطروح', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 18 },
  { nameEn: 'Fayoum', nameAr: 'الفيوم', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 19 },
  { nameEn: 'Beni Suef', nameAr: 'بني سويف', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 20 },
  { nameEn: 'Minya', nameAr: 'المنيا', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 21 },
  { nameEn: 'Assiut', nameAr: 'أسيوط', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 22 },
  { nameEn: 'Sohag', nameAr: 'سوهاج', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 23 },
  { nameEn: 'Qena', nameAr: 'قنا', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 24 },
  { nameEn: 'Luxor', nameAr: 'الأقصر', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 25 },
  { nameEn: 'Aswan', nameAr: 'أسوان', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 26 },
  { nameEn: 'New Valley', nameAr: 'الوادي الجديد', shippingFee: OTHER_GOVERNORATE_SHIPPING, sortOrder: 27 },
];

// ---------------------------------------------------------------------------
// International shipping, bundles and coupons were retired alongside
// the Rozana-era tables they lived in. Deda ships Egypt-only, flat
// pricing, no promo codes.

// ---------------------------------------------------------------------------
// Size standards — kept in sync with frontend/lib/sizes.ts. Deda carries
// standard women's letter sizes across every product.
// ---------------------------------------------------------------------------
const SIZES = ['S', 'M', 'L', 'XL'];

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
  /** Price in piastres (100 piastres = 1 EGP). */
  basePrice: number;
  /** Optional discounted price in piastres. */
  discount?: number;
  category: Category;
  isFeatured?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  sizes: string[];
  colors: SeedColor[];
  /** Image URLs — paths under /products/ served by the Next.js web
   *  container's static /public bucket. One or more allowed. */
  imageUrls: string[];
};

// Prices in piastres. Edit any of these from /admin after launch — the
// admin product form writes straight to the same columns.
const LAUNCH_PRODUCTS: SeedProduct[] = [
  {
    slug: 'cherry-prayer-abaya',
    nameEn: 'Cherry Print Prayer Abaya',
    nameAr: 'عباية صلاة بطبعة كرز',
    descriptionEn:
      'A full-cover prayer abaya in soft black fabric with a scattered cherry print. One-piece cut, slips on over clothing.',
    descriptionAr:
      'عباية صلاة بغطاء كامل من قماش أسود ناعم بطبعة الكرز. قطعة واحدة، تُلبس فوق الملابس.',
    basePrice: 65000, // 650 EGP
    category: Category.OVERHEAD,
    isFeatured: true,
    isNew: true,
    sizes: SIZES,
    colors: [
      { nameEn: 'Cherry Print', nameAr: 'طبعة كرز', hex: '#0d0d0d', group: ColorGroup.BLACK },
    ],
    imageUrls: ['/products/cherry-abaya.webp'],
  },
  {
    slug: 'leopard-prayer-abaya',
    nameEn: 'Leopard Print Prayer Abaya',
    nameAr: 'عباية صلاة بطبعة نمر',
    descriptionEn:
      'A statement prayer abaya in a classic leopard print. Full-cover, pull-on, lightweight for everyday use.',
    descriptionAr:
      'عباية صلاة مميّزة بطبعة نمر كلاسيكية. غطاء كامل، سهلة الارتداء، خامة خفيفة للاستخدام اليومي.',
    basePrice: 65000, // 650 EGP
    category: Category.OVERHEAD,
    isFeatured: true,
    isNew: true,
    sizes: SIZES,
    colors: [
      { nameEn: 'Leopard Print', nameAr: 'طبعة نمر', hex: '#8a6a3f', group: ColorGroup.BROWN },
    ],
    imageUrls: ['/products/leopard-abaya.webp'],
  },
  {
    slug: 'everyday-cotton-shirt-green',
    nameEn: 'Everyday Cotton Shirt — Green',
    nameAr: 'قميص قطن يومي — أخضر',
    descriptionEn:
      'An oversized cotton shirt with chest pockets, button front, and a longer back hem. Pairs with jeans or wide trousers.',
    descriptionAr:
      'قميص قطن واسع بجيوب على الصدر وأزرار أمامية وذيل خلفي أطول. يناسب الجينز أو البناطيل الواسعة.',
    basePrice: 35000, // 350 EGP
    category: Category.COLOURED,
    isFeatured: true,
    sizes: SIZES,
    colors: [
      { nameEn: 'Green', nameAr: 'أخضر', hex: '#3da678', group: ColorGroup.GREEN },
    ],
    imageUrls: ['/products/green-shirt.png'],
  },
  {
    slug: 'everyday-cotton-shirt-navy',
    nameEn: 'Everyday Cotton Shirt — Navy',
    nameAr: 'قميص قطن يومي — كحلى',
    descriptionEn:
      'The everyday shirt in a deep navy. Same oversized cut, same chest pockets and dropped back hem.',
    descriptionAr:
      'نفس القميص اليومي بلون الكحلي العميق. نفس القصّة الواسعة والجيوب والذيل الخلفي الأطول.',
    basePrice: 35000, // 350 EGP
    category: Category.COLOURED,
    sizes: SIZES,
    colors: [
      { nameEn: 'Navy', nameAr: 'كحلى', hex: '#1b2b4a', group: ColorGroup.BLUE },
    ],
    imageUrls: ['/products/navy-shirt.png'],
  },
  {
    slug: 'everyday-cotton-shirt-white',
    nameEn: 'Everyday Cotton Shirt — White',
    nameAr: 'قميص قطن يومي — أبيض',
    descriptionEn:
      'The everyday shirt in crisp white. The wardrobe staple — oversized cut, button front, dropped hem.',
    descriptionAr:
      'القميص اليومي باللون الأبيض الناصع. قطعة أساسية فى الدولاب — قصّة واسعة، أزرار أمامية، ذيل أطول.',
    basePrice: 35000, // 350 EGP
    category: Category.COLOURED,
    sizes: SIZES,
    colors: [
      { nameEn: 'White', nameAr: 'أبيض', hex: '#ffffff', group: ColorGroup.WHITE },
    ],
    imageUrls: ['/products/white-shirt.png'],
  },
  {
    slug: 'blouse-skirt-set-brown',
    nameEn: 'White Blouse + Brown Skirt Set',
    nameAr: 'طقم بلوزة بيضاء وتنورة بنى',
    descriptionEn:
      'A two-piece set: a crisp white blouse with bell sleeves and a floor-length satin skirt in chocolate brown. Limited launch price.',
    descriptionAr:
      'طقم من قطعتين: بلوزة بيضاء بأكمام واسعة مع تنورة ساتان طويلة بلون البنى الشوكولاتى. سعر محدود للإطلاق.',
    basePrice: 49900, // 499 EGP
    discount: 39900, // 399 EGP
    category: Category.READY,
    isFeatured: true,
    isNew: true,
    isBestSeller: true,
    sizes: SIZES,
    colors: [
      { nameEn: 'White & Brown', nameAr: 'أبيض وبنى', hex: '#5c3a24', group: ColorGroup.BROWN },
    ],
    imageUrls: ['/products/skirt-set-1.webp', '/products/skirt-set-2.webp'],
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('Seeding Egypt governorates…');
  for (const g of GOVERNORATES) {
    await prisma.governorate.upsert({
      where: { nameEn: g.nameEn },
      update: { nameAr: g.nameAr, shippingFee: g.shippingFee, sortOrder: g.sortOrder },
      create: g,
    });
  }

  // Wipe any product that isn't in the launch list (old Unsplash-sourced
  // seed stock from pre-rebrand or earlier launches). Cascade deletes
  // orderItems get set to productId=null by schema.
  console.log('Clearing stale catalog…');
  const launchSlugs = LAUNCH_PRODUCTS.map((p) => p.slug);
  const removed = await prisma.product.deleteMany({
    where: { slug: { notIn: launchSlugs } },
  });
  if (removed.count > 0) {
    console.log(`  removed ${removed.count} old product(s)`);
  }

  console.log('Seeding Deda catalog…');
  for (let i = 0; i < LAUNCH_PRODUCTS.length; i++) {
    const p = LAUNCH_PRODUCTS[i]!;

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

    for (let imgIdx = 0; imgIdx < p.imageUrls.length; imgIdx++) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          variantId: null,
          url: p.imageUrls[imgIdx]!,
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

      // Reuse the product's primary photo as the variant swatch. The
      // admin can replace it per-colour from /admin once a variant-
      // specific shoot lands.
      await prisma.productImage.create({
        data: {
          productId: product.id,
          variantId: variant.id,
          url: p.imageUrls[0]!,
          alt: `${p.nameEn} — ${c.nameEn}`,
          sortOrder: 0,
        },
      });
    }
  }

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
