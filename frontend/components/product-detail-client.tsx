'use client';

import { motion, type PanInfo } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { ColorSwatches } from './color-swatch';
import { HeartIcon } from './icon';
import { OutOfStockForm } from './out-of-stock-form';
import { PriceTag } from './price-tag';

import type { ProductDetail } from '@/lib/api/types';
import { isLocalUpload } from '@/lib/image';
import { trackAddToCart, trackViewContent } from '@/lib/pixels';
import { useCart } from '@/lib/stores/cart';
import { useWishlist } from '@/lib/stores/wishlist';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';

type Props = {
  product: ProductDetail;
  locale: Locale;
  dict: Dictionary;
};

/**
 * The interactive half of the product page. Handles colour / size
 * selection, the gallery + thumbnail strip, the Add-to-Cart button, and
 * the out-of-stock notification form. Receives the product as a prop
 * from the parent Server Component so all data fetching stays server-side.
 */
export function ProductDetailClient({ product, locale, dict }: Props) {
  const isAR = locale === 'ar';
  const [colorIdx, setColorIdx] = useState(() => {
    const firstInStock = product.variants.findIndex((v) => v.status === 'IN_SALE');
    return firstInStock >= 0 ? firstInStock : 0;
  });
  const variant = product.variants[colorIdx];
  const [size, setSize] = useState<string | null>(null);
  const [imageIdx, setImageIdx] = useState(0);
  const [qty, setQty] = useState(1);

  // Custom-size flow. One input — the customer types whatever number /
  // measurement she wants and we stamp it onto the size string so it
  // flows through to the invoice and the tailor sees it on the order.
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const isCustomSize = size?.startsWith(isAR ? 'مقاس خاص' : 'Custom') ?? false;

  // Gallery prefers product-level images (what the admin uploads through
  // the "Images" section). Variant images act as a fallback for products
  // that haven't been photographed yet — usually the Unsplash placeholders
  // the seed inserted. Without this priority order the seed placeholders
  // hide the admin's real uploads.
  const galleryImages = useMemo(() => {
    if (product.images.length > 0) return product.images;
    if (variant && variant.images.length > 0) return variant.images;
    return [];
  }, [product.images, variant]);

  const addToCart = useCart((s) => s.add);
  const isWishlisted = useWishlist((s) => s.slugs.includes(product.slug));
  const toggleWish = useWishlist((s) => s.toggle);

  // Fires the pixel ViewContent event once per product visit. The pixel
  // scripts are no-ops when env IDs are empty so this is safe to call.
  useEffect(() => {
    trackViewContent({
      productSlug: product.slug,
      productName: isAR ? product.nameAr : product.nameEn,
      value: product.discount ?? product.basePrice,
    });
  }, [product, isAR]);

  const productOutOfStock = product.status === 'OUT_OF_STOCK';
  const variantOutOfStock = variant?.status === 'OUT_OF_STOCK';
  const isAvailable = !productOutOfStock && !variantOutOfStock;

  const onColorPick = (i: number) => {
    setColorIdx(i);
    setImageIdx(0);
    setSize(null);
    setShowCustomForm(false);
  };

  const onPickStandardSize = (s: string) => {
    setSize(s);
    setShowCustomForm(false);
  };

  const onToggleCustomForm = () => {
    setShowCustomForm((open) => !open);
    if (!isCustomSize) setSize(null);
  };

  const applyCustomSize = () => {
    const value = customValue.trim();
    if (!value) return;
    const encoded = `${isAR ? 'مقاس خاص' : 'Custom'} · ${value}`;
    setSize(encoded);
    setShowCustomForm(false);
  };

  const onAddToCart = () => {
    if (!variant || !isAvailable || !size) return;
    const unitPrice = product.discount ?? product.basePrice;
    addToCart({
      productSlug: product.slug,
      productNameEn: product.nameEn,
      productNameAr: product.nameAr,
      colorNameEn: variant.colorNameEn,
      colorNameAr: variant.colorNameAr,
      colorHex: variant.colorHex,
      size,
      unitPrice,
      image: galleryImages[0]?.url ?? null,
      quantity: qty,
    });
    trackAddToCart({
      productSlug: product.slug,
      productName: isAR ? product.nameAr : product.nameEn,
      value: unitPrice * qty,
      quantity: qty,
    });
    toast.success(dict.addedToCart);
  };

  const onWishlist = () => {
    const next = toggleWish(product.slug);
    toast(next ? dict.addedToWishlist : dict.removedFromWishlist);
  };

  const sizes = variant?.sizes ?? [];
  const name = isAR ? product.nameAr : product.nameEn;
  const desc = isAR ? product.descriptionAr : product.descriptionEn;
  const mainImage = galleryImages[imageIdx]?.url ?? galleryImages[0]?.url ?? null;

  return (
    <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 lg:gap-16 items-start">
      {/* Gallery — swipeable on touch devices */}
      <div>
        <motion.div
          className="img-zoom relative aspect-[4/5] bg-subtle overflow-hidden touch-pan-y select-none"
          // Allow horizontal drag; clamp so the motion stays subtle and the
          // image doesn't fly off-screen.
          drag={galleryImages.length > 1 ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={(_, info: PanInfo) => {
            if (galleryImages.length < 2) return;
            const threshold = 50; // px the user must swipe past
            // Swipe LEFT → next image, swipe RIGHT → previous. RTL stays the
            // same because the gallery's logical order is independent of
            // the page's reading direction (we want "next" to mean "later
            // in the strip" either way).
            if (info.offset.x < -threshold) {
              setImageIdx((i) => (i + 1) % galleryImages.length);
            } else if (info.offset.x > threshold) {
              setImageIdx((i) => (i - 1 + galleryImages.length) % galleryImages.length);
            }
          }}
        >
          {mainImage ? (
            <Image
              key={mainImage}
              src={mainImage}
              alt={name}
              fill
              sizes="(min-width: 1024px) 55vw, 100vw"
              priority
              className="object-cover animate-fade-in pointer-events-none"
              unoptimized={isLocalUpload(mainImage)}
              draggable={false}
            />
          ) : null}
          {galleryImages.length > 1 ? (
            // Tappable dot indicator at the bottom of the image. Each dot
            // jumps to its image directly, in addition to the swipe gesture
            // — gives a clear visual hint that more images exist and lets
            // people who don't think to swipe still navigate.
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {galleryImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageIdx(i);
                  }}
                  aria-label={`View image ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    i === imageIdx
                      ? 'w-6 bg-bg'
                      : 'w-2 bg-bg/50 hover:bg-bg/80'
                  }`}
                />
              ))}
            </div>
          ) : null}

          {/* Out-of-stock overlay — fires when either the whole product
              or the currently-selected variant is marked sold out. Sits
              above the image with a subtle backdrop so the photo stays
              recognisable underneath. */}
          {!isAvailable ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <div className="absolute inset-0 bg-ink/55 backdrop-blur-[1px]" />
              <div className="relative bg-bg/95 text-ink px-6 py-3 tracking-[0.25em] uppercase text-xs sm:text-sm font-medium border border-ink/10 shadow-lg rotate-[-4deg]">
                {isAR ? 'غير متاح' : 'Out of stock'}
              </div>
            </div>
          ) : null}
        </motion.div>
        {galleryImages.length > 1 ? (
          <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar">
            {galleryImages.map((img, i) => (
              <button
                key={img.url + i}
                onClick={() => setImageIdx(i)}
                aria-label={`Image ${i + 1}`}
                className={`relative w-20 h-24 flex-shrink-0 bg-subtle overflow-hidden transition-opacity ${
                  i === imageIdx ? 'opacity-100 ring-1 ring-ink' : 'opacity-60 hover:opacity-100'
                }`}
              >
                <Image
                  src={img.url}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized={isLocalUpload(img.url)}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Info column */}
      <div className={isAR ? 'lg:pr-2' : 'lg:pl-2'}>
        {product.isNew ? (
          <div className="text-[10px] tracking-widest uppercase text-accent mb-3">
            {isAR ? 'جديد' : 'New'}
          </div>
        ) : null}
        <h1 className="display-xl text-3xl lg:text-5xl mb-4">{name}</h1>
        <div className="mb-6">
          <PriceTag
            basePrice={product.basePrice}
            discount={product.discount}
            locale={locale}
            egpLabel={dict.egp}
            size="lg"
          />
        </div>
        <p className="text-muted leading-relaxed mb-8">{desc}</p>

        {/* Colour picker */}
        {product.variants.length > 0 ? (
          <div className="mb-6">
            <div className="text-[11px] tracking-widest uppercase mb-3">
              {dict.color}
              {variant ? (
                <span className="ml-3 text-muted normal-case tracking-normal">
                  · {isAR ? variant.colorNameAr : variant.colorNameEn}
                </span>
              ) : null}
            </div>
            <ColorSwatches
              colors={product.variants}
              selectedIndex={colorIdx}
              onSelect={onColorPick}
              size="md"
              locale={locale === 'ar' ? 'ar' : 'en'}
            />
          </div>
        ) : null}

        {/* Sizes */}
        {sizes.length > 0 ? (
          <div className="mb-6">
            <div className="text-[11px] tracking-widest uppercase mb-3">{dict.size}</div>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => onPickStandardSize(s)}
                  disabled={!isAvailable}
                  className={`min-w-12 h-10 px-3 text-sm transition-colors border ${
                    size === s
                      ? 'bg-ink text-bg border-ink'
                      : 'bg-bg text-ink border-border hover:border-ink'
                  } ${!isAvailable ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {s}
                </button>
              ))}
              {/* Custom size — opens an inline form so customers can
                  give their own measurements when none of the listed
                  sizes fit. The Apply button collapses the numbers
                  into a readable size string the tailor sees on the
                  invoice. */}
              <button
                onClick={onToggleCustomForm}
                disabled={!isAvailable}
                className={`h-10 px-4 text-sm transition-colors border ${
                  isCustomSize || showCustomForm
                    ? 'bg-accent/15 text-accent border-accent'
                    : 'bg-bg text-ink border-border border-dashed hover:border-ink'
                } ${!isAvailable ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                + {dict.customSize}
              </button>
            </div>

            {/* Custom size form — one input, customer types her own
                size number / value and we ship it through to the
                order on Apply. */}
            {showCustomForm ? (
              <div className="mt-4 p-4 border border-accent/30 bg-accent/5">
                <p className="text-xs text-muted mb-3 leading-relaxed">
                  {dict.customSizeHint}
                </p>
                <div className="flex items-stretch gap-2">
                  <input
                    type="text"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyCustomSize();
                    }}
                    autoFocus
                    className="flex-1 bg-bg border border-border px-3 py-2.5 text-sm focus:border-ink outline-none"
                    placeholder={isAR ? 'اكتبي مقاسك' : 'Enter your size'}
                  />
                  <button
                    onClick={applyCustomSize}
                    disabled={!customValue.trim()}
                    className="bg-ink text-bg text-[10px] tracking-widest uppercase px-5 hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {isAR ? 'تأكيد' : 'Apply'}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Confirmation chip — shows the chosen custom size in a
                readable line so the customer can verify before adding
                to cart. */}
            {isCustomSize && !showCustomForm ? (
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-ink-soft bg-accent/10 border border-accent/30 px-3 py-2">
                <span className="text-accent font-medium">
                  {isAR ? 'مقاسك:' : 'Your size:'}
                </span>
                <span>{size}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Quantity + Actions */}
        {isAvailable ? (
          <>
            <div className="mb-6">
              <div className="text-[11px] tracking-widest uppercase mb-3">
                {isAR ? 'الكمية' : 'Quantity'}
              </div>
              <div className="inline-flex items-center border border-border">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 hover:bg-subtle"
                  aria-label="Decrease"
                >
                  −
                </button>
                <span className="w-12 text-center">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(10, q + 1))}
                  className="w-10 h-10 hover:bg-subtle"
                  aria-label="Increase"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onAddToCart}
                disabled={!size}
                className="flex-1 bg-ink text-bg text-sm tracking-widest uppercase py-4 hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {size
                  ? dict.addToCart
                  : isAR
                    ? 'اختر مقاس'
                    : 'Select a size'}
              </button>
              <button
                onClick={onWishlist}
                aria-label={dict.wishlist}
                className="w-14 h-14 grid place-items-center border border-border hover:border-ink transition-colors"
              >
                <HeartIcon
                  className={`w-5 h-5 ${isWishlisted ? 'text-accent fill-accent' : ''}`}
                />
              </button>
            </div>
          </>
        ) : (
          <div className="mt-8">
            <OutOfStockForm
              locale={locale}
              dict={dict}
              productSlug={product.slug}
              colorName={variant ? (isAR ? variant.colorNameAr : variant.colorNameEn) : undefined}
              size={size ?? undefined}
            />
          </div>
        )}

        <div className="mt-10 pt-8 border-t border-border text-xs text-muted space-y-2">
          <p>
            {isAR
              ? 'توصيل إلى جميع محافظات الكويت خلال ٢-٥ أيام عمل.'
              : 'Delivery to all Kuwait governorates in 2-5 business days.'}
          </p>
          <p>{dict.paymentNote}</p>
        </div>
      </div>
    </div>
  );
}
