// Wire format mirrored from the Fastify backend. Keep in sync when the
// backend payloads change — we don't have a shared package since the two
// apps live as siblings in the same repo.

export type Category =
  | 'COLOURED'
  | 'BLACK'
  | 'SNAP'
  | 'EMBROIDERED'
  | 'OVERHEAD'
  | 'KIDS'
  | 'EVERYDAY'
  | 'READY'
  | 'WINTER';
export type SaleStatus = 'IN_SALE' | 'OUT_OF_STOCK';
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';
export type CouponType = 'PERCENT' | 'FIXED';

export type PaymentMethod =
  | 'COD'
  | 'CARD'
  | 'KNET'
  | 'APPLE_PAY'
  | 'GOOGLE_PAY'
  | 'MADA'
  | 'BENEFIT';

export type PaymentStatus =
  | 'INITIATED'
  | 'CAPTURED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';

// Deda is COD-only — kept as a named type so the backend contract stays
// explicit and we have a single spot to extend later if a payment
// gateway is ever added.
export type CheckoutPaymentMethod = 'COD';
export type ColorGroup =
  | 'WHITE'
  | 'BLACK'
  | 'GRAY'
  | 'BEIGE'
  | 'BROWN'
  | 'BLUE'
  | 'GREEN'
  | 'RED'
  | 'YELLOW'
  | 'PURPLE'
  | 'ORANGE'
  | 'MULTI';

export type ProductColor = {
  colorNameEn: string;
  colorNameAr: string;
  colorHex: string;
  colorGroup: ColorGroup;
  status: SaleStatus;
};

export type ProductCard = {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  basePrice: number;
  discount: number | null;
  category: Category;
  status: SaleStatus;
  isFeatured: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  primaryImage: string | null;
  colors: ProductColor[];
};

export type ProductVariant = ProductColor & {
  sizes: string[];
  images: { url: string; alt: string | null }[];
};

export type ProductDetail = {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  basePrice: number;
  discount: number | null;
  category: Category;
  status: SaleStatus;
  isFeatured: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  images: { url: string; alt: string | null }[];
  variants: ProductVariant[];
};

export type Governorate = {
  nameEn: string;
  nameAr: string;
  shippingFee: number;
};

// International destinations. Egypt is NOT in this list — it's the
// implicit local path that drives the governorate dropdown instead.
export type Country = {
  code: string;
  nameEn: string;
  nameAr: string;
  shippingFee: number;
};

export type Bundle = {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  bundlePrice: number;
  originalPrice: number;
  savings: number;
  imageUrl: string | null;
  products: {
    slug: string;
    nameEn: string;
    nameAr: string;
    primaryImage: string | null;
  }[];
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type CouponValidation = {
  code: string;
  type: CouponType;
  value: number;
  discount: number;
};

export type CreateOrderInput = {
  customerName: string;
  phone1: string;
  phone2?: string | null;
  // ISO-2 country code — "KW" for local Egypt orders. Defaults server-side
  // when missing so old clients keep working during rollout.
  countryCode?: string;
  // Only required when countryCode === "KW".
  governorateName?: string | null;
  address: string;
  notes?: string | null;
  couponCode?: string | null;
  // Defaults to COD when omitted so older builds keep working.
  paymentMethod?: CheckoutPaymentMethod;
  items: {
    productSlug: string;
    colorNameEn: string;
    size: string;
    quantity: number;
  }[];
};

export type CreatedOrder = {
  id: number;
  orderNumber: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus | null;
  createdAt: string;
};

export type LeadInput = {
  name: string;
  phone: string;
  email: string;
  productSlug: string;
  colorName?: string | null;
  size?: string | null;
};

export type HeroSlide = {
  id: number;
  url: string;
  altEn: string | null;
  altAr: string | null;
};

export type CategoryImage = {
  category: Category;
  url: string;
};

export type SiteConfig = {
  whatsappNumber: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  // Optional Snapchat handle URL. Added for the Gulf market where Snap
  // is a primary social channel; the backend schema may not return it
  // yet, so the type accepts undefined as well.
  snapchatUrl?: string | null;
  // Editorial split section copy + image. All optional; the storefront
  // falls back to baked-in defaults when these are unset.
  editorialEyebrowEn?: string | null;
  editorialEyebrowAr?: string | null;
  editorialHeadlineEn?: string | null;
  editorialHeadlineAr?: string | null;
  editorialBodyEn?: string | null;
  editorialBodyAr?: string | null;
  editorialImageUrl?: string | null;
};
