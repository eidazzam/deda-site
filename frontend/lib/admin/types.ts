// Admin payloads mirrored from backend/src/routes/admin/*. Keep in sync
// when route handlers change shape — there's no shared package since the
// two apps live as siblings.

import type {
  Category,
  ColorGroup,
  CouponType,
  OrderStatus,
  SaleStatus,
} from '../api/types';

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

export type AdminPayment = {
  tapChargeId: string;
  status: PaymentStatus;
  method: PaymentMethod | null;
  amount: number;
  refundedAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminOrderListItem = {
  id: number;
  orderNumber: string;
  customerName: string;
  phone1: string;
  countryCode: string;
  // null for international orders — governorate only applies to KW.
  governorateName: string | null;
  // Full street address — added to the list response so the export
  // print report can show it inline without an extra fetch per row.
  address: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus | null;
  total: number;
  status: OrderStatus;
  itemsCount: number;
  // Per-line product summary included in the list response so the
  // export-print report can render product names without a per-row
  // detail fetch. Empty if the order has no items (shouldn't happen).
  items: {
    productNameEn: string;
    productNameAr: string;
    colorNameEn: string;
    colorNameAr: string;
    size: string;
    quantity: number;
    // Null if the product was deleted after the order was placed —
    // the snapshot keeps name + price but loses the live category.
    category: Category | null;
  }[];
  isUnread: boolean;
  createdAt: string;
};

export type AdminOrderDetail = {
  id: number;
  orderNumber: string;
  customerName: string;
  phone1: string;
  phone2: string | null;
  countryCode: string;
  governorateName: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus | null;
  payment: AdminPayment | null;
  address: string;
  notes: string | null;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  couponCode: string | null;
  status: OrderStatus;
  adminNotes: string | null;
  items: {
    productSlug: string;
    productNameEn: string;
    productNameAr: string;
    colorNameEn: string;
    colorNameAr: string;
    colorHex: string;
    size: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  createdAt: string;
  updatedAt: string;
};

export type LeadStatus = 'NEW' | 'CONTACTED' | 'RESOLVED';

export type AdminLead = {
  id: number;
  name: string;
  phone: string;
  email: string;
  productSlug: string;
  productNameEn: string;
  productNameAr: string;
  colorName: string | null;
  size: string | null;
  status: LeadStatus;
  adminNotes: string | null;
  viewedAt: string | null;
  createdAt: string;
};

export type AdminVariant = {
  id: number;
  colorNameEn: string;
  colorNameAr: string;
  colorHex: string;
  colorGroup: ColorGroup;
  status: SaleStatus;
};

export type AdminProductListItem = {
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
  sortOrder: number;
  primaryImage: string | null;
  variantsCount: number;
  imagesCount: number;
  variants: AdminVariant[];
};

export type AdminProductDetail = {
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
  sortOrder: number;
  images: { id: number; url: string; alt: string | null; sortOrder: number; variantId: number | null }[];
  variants: {
    id: number;
    colorNameEn: string;
    colorNameAr: string;
    colorHex: string;
    colorGroup: ColorGroup;
    status: SaleStatus;
    sortOrder: number;
    sizes: string[];
    images: { id: number; url: string; alt: string | null; sortOrder: number }[];
  }[];
  createdAt: string;
  updatedAt: string;
};

export type AdminCoupon = {
  code: string;
  type: CouponType;
  value: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  expiresAt: string | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminGovernorate = {
  id: number;
  nameEn: string;
  nameAr: string;
  shippingFee: number;
  isActive: boolean;
  sortOrder: number;
};

export type AdminCountry = {
  id: number;
  code: string;
  nameEn: string;
  nameAr: string;
  shippingFee: number;
  isActive: boolean;
  sortOrder: number;
};

export type AdminStats = {
  totalOrders: number;
  pendingOrders: number;
  newOrdersCount: number;
  unreadLeads: number;
  totalRevenue: number;
  averageOrderValue: number;
  productsCount: number;
  activeCoupons: number;
  last30Days: { day: string; orders: number; revenue: number }[];
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminHeroSlide = {
  id: number;
  url: string;
  altEn: string | null;
  altAr: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminBundleListItem = {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  bundlePrice: number;
  originalPrice: number;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  productsCount: number;
  updatedAt: string;
};

export type AdminBundleDetail = {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  bundlePrice: number;
  originalPrice: number;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  productIds: number[];
  createdAt: string;
  updatedAt: string;
};

export type AdminBundleInput = {
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  bundlePrice: number;
  originalPrice: number;
  isActive?: boolean;
  sortOrder?: number;
  productIds: number[];
};

export type AdminCategoryImage = {
  category: Category;
  url: string;
  updatedAt: string;
};

export type AdminSiteConfig = {
  id: number;
  whatsappNumber: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  editorialEyebrowEn: string | null;
  editorialEyebrowAr: string | null;
  editorialHeadlineEn: string | null;
  editorialHeadlineAr: string | null;
  editorialBodyEn: string | null;
  editorialBodyAr: string | null;
  editorialImageUrl: string | null;
  updatedAt: string;
};
