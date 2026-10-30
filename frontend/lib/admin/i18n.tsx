'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

// Single flat dictionary so every admin page can pull strings without
// nested key paths. Add new keys to BOTH languages; missing translations
// fall back to the key name so a missing label is at least visible.
type Dict = {
  // Sidebar nav
  'sidebar.dashboard': string;
  'sidebar.orders': string;
  'sidebar.leads': string;
  'sidebar.products': string;
  'sidebar.bundles': string;
  'sidebar.coupons': string;
  'sidebar.governorates': string;
  'sidebar.countries': string;
  'sidebar.heroSlides': string;
  'sidebar.categoryImages': string;
  'sidebar.editorial': string;
  'sidebar.settings': string;
  'sidebar.signedInAs': string;
  'sidebar.logout': string;

  // Common
  'common.admin': string;
  'common.loading': string;
  'common.save': string;
  'common.saving': string;
  'common.saveChanges': string;
  'common.cancel': string;
  'common.delete': string;
  'common.deleting': string;
  'common.edit': string;
  'common.view': string;
  'common.add': string;
  'common.reset': string;
  'common.replace': string;
  'common.upload': string;
  'common.uploading': string;
  'common.remove': string;
  'common.search': string;
  'common.confirmDelete': string;
  'common.optional': string;
  'common.failedToLoad': string;
  'common.saveFailed': string;
  'common.deleteFailed': string;
  'common.uploadFailed': string;

  // Dashboard
  'dashboard.title': string;
  'dashboard.totalOrders': string;
  'dashboard.pending': string;
  'dashboard.revenue': string;
  'dashboard.avgOrder': string;
  'dashboard.last30Days': string;
  'dashboard.viewAllOrders': string;

  // Orders
  'orders.title': string;
  'orders.search': string;
  'orders.allStatus': string;
  'orders.exportCsv': string;
  'orders.exportPdf': string;
  'orders.colOrder': string;
  'orders.colCustomer': string;
  'orders.colPhone': string;
  'orders.colGovernorate': string;
  'orders.colItems': string;
  'orders.colTotal': string;
  'orders.colStatus': string;
  'orders.colDate': string;
  'orders.empty': string;
  'orders.confirmDelete': string;
  'orders.deleted': string;
  'orders.status.pending': string;
  'orders.status.confirmed': string;
  'orders.status.shipped': string;
  'orders.status.delivered': string;
  'orders.status.cancelled': string;

  // Order detail
  'orderDetail.customer': string;
  'orderDetail.phone': string;
  'orderDetail.address': string;
  'orderDetail.governorate': string;
  'orderDetail.items': string;
  'orderDetail.subtotal': string;
  'orderDetail.shipping': string;
  'orderDetail.discount': string;
  'orderDetail.total': string;
  'orderDetail.notes': string;
  'orderDetail.adminNotes': string;
  'orderDetail.placedAt': string;
  'orderDetail.printInvoice': string;
  'orderDetail.payment': string;

  // Invoice / printable views
  'invoice.title': string;
  'invoice.brandTagline': string;
  'invoice.billTo': string;
  'invoice.shipTo': string;
  'invoice.paymentMethod': string;
  'invoice.paymentStatus': string;
  'invoice.itemsCount': string;
  'invoice.colItem': string;
  'invoice.colQty': string;
  'invoice.colUnit': string;
  'invoice.colSubtotal': string;
  'invoice.sku': string;
  'invoice.size': string;
  'invoice.subtotal': string;
  'invoice.shipping': string;
  'invoice.shippingFree': string;
  'invoice.discount': string;
  'invoice.total': string;
  'invoice.customerNotes': string;
  'invoice.adminNotes': string;
  'invoice.thankYou': string;
  'invoice.contactLine': string;
  'invoice.printSave': string;
  'invoice.close': string;
  'invoice.preparing': string;
  'invoice.payOnDelivery': string;
  'invoice.piece': string;
  'invoice.pieces': string;
  'invoice.line': string;
  'invoice.lines': string;
  'invoice.method.cod': string;
  'invoice.method.card': string;
  'invoice.method.knet': string;
  'invoice.method.applePay': string;
  'invoice.method.googlePay': string;
  'invoice.method.mada': string;
  'invoice.method.benefit': string;
  'invoice.payStatus.initiated': string;
  'invoice.payStatus.captured': string;
  'invoice.payStatus.failed': string;
  'invoice.payStatus.cancelled': string;
  'invoice.payStatus.refunded': string;

  // Orders report (export-print)
  'report.title': string;
  'report.filter': string;
  'report.search': string;
  'report.generated': string;
  'report.allStatus': string;
  'report.ordersCount': string;
  'report.itemsCount': string;
  'report.revenue': string;
  'report.empty': string;
  'report.preparing': string;
  'report.colProduct': string;

  // Storefront category labels — used by the orders report to render
  // each line's category alongside the product name.
  'cat.coloured': string;
  'cat.black': string;
  'cat.snap': string;
  'cat.embroidered': string;
  'cat.overhead': string;
  'cat.kids': string;
  'cat.everyday': string;
  'cat.ready': string;
  'cat.winter': string;

  // Leads
  'leads.title': string;
  'leads.subtitle': string;

  // Products
  'products.title': string;
  'products.addNew': string;
  'products.empty': string;
  'products.allCategories': string;
  'products.featured': string;
  'products.new': string;
  'products.bestSeller': string;
  'products.featuredCheckbox': string;
  'products.newCheckbox': string;
  'products.bestSellerCheckbox': string;
  'products.status': string;
  'products.sortOrder': string;
  'products.basePrice': string;
  'products.discount': string;
  'products.nameEn': string;
  'products.nameAr': string;
  'products.descriptionEn': string;
  'products.descriptionAr': string;
  'products.slug': string;
  'products.category': string;
  'products.colours': string;

  // Bundles
  'bundles.title': string;
  'bundles.subtitle': string;
  'bundles.addNew': string;
  'bundles.empty': string;
  'bundles.coverImage': string;
  'bundles.products': string;
  'bundles.hidden': string;
  'bundles.bundlePrice': string;
  'bundles.originalPrice': string;
  'bundles.showOnHome': string;
  'bundles.productPicker': string;
  'bundles.searchProducts': string;
  'bundles.moveUp': string;
  'bundles.moveDown': string;
  'bundles.uploadAfterSave': string;
  'bundles.newBundle': string;
  'bundles.newBundleSubtitle': string;

  // Coupons
  'coupons.title': string;
  'coupons.code': string;
  'coupons.type': string;
  'coupons.value': string;
  'coupons.expires': string;
  'coupons.usage': string;
  'coupons.active': string;

  // Hero slides
  'hero.title': string;
  'hero.subtitle': string;
  'hero.addSlide': string;
  'hero.currentSlides': string;
  'hero.imageField': string;
  'hero.altEn': string;
  'hero.altAr': string;
  'hero.sortOrder': string;
  'hero.showOnHome': string;

  // Category images
  'categories.title': string;
  'categories.subtitle': string;
  'categories.custom': string;
  'categories.default': string;

  // Editorial
  'editorial.title': string;
  'editorial.subtitle': string;
  'editorial.coverImage': string;
  'editorial.eyebrowEn': string;
  'editorial.eyebrowAr': string;
  'editorial.headlineEn': string;
  'editorial.headlineAr': string;
  'editorial.bodyEn': string;
  'editorial.bodyAr': string;

  // Settings
  'settings.title': string;
  'settings.subtitle': string;
  'settings.whatsapp': string;
  'settings.whatsappHint': string;
  'settings.facebook': string;
  'settings.instagram': string;
  'settings.tiktok': string;
  'settings.saved': string;

  // Login
  'login.title': string;
  'login.username': string;
  'login.password': string;
  'login.signIn': string;
  'login.signingIn': string;
  'login.failed': string;

  // Governorates
  'governorates.title': string;
  'governorates.nameEn': string;
  'governorates.nameAr': string;
  'governorates.shippingFee': string;
  'governorates.active': string;

  // Countries / international shipping
  'countries.title': string;
  'countries.code': string;
  'countries.nameEn': string;
  'countries.nameAr': string;
  'countries.shippingFee': string;
  'countries.active': string;
};

const EN: Dict = {
  'sidebar.dashboard': 'Dashboard',
  'sidebar.orders': 'Orders',
  'sidebar.leads': 'Out-of-stock leads',
  'sidebar.products': 'Products',
  'sidebar.bundles': 'Bundles',
  'sidebar.coupons': 'Coupons',
  'sidebar.governorates': 'Governorates',
  'sidebar.countries': 'International shipping',
  'sidebar.heroSlides': 'Homepage slides',
  'sidebar.categoryImages': 'Category images',
  'sidebar.editorial': 'Editorial section',
  'sidebar.settings': 'Settings',
  'sidebar.signedInAs': 'Signed in as',
  'sidebar.logout': 'Logout',

  'common.admin': 'Admin',
  'common.loading': 'Loading…',
  'common.save': 'Save',
  'common.saving': 'Saving…',
  'common.saveChanges': 'Save changes',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.deleting': 'Deleting…',
  'common.edit': 'Edit',
  'common.view': 'View',
  'common.add': 'Add',
  'common.reset': 'Reset',
  'common.replace': 'Replace',
  'common.upload': 'Upload',
  'common.uploading': 'Uploading…',
  'common.remove': 'Remove',
  'common.search': 'Search',
  'common.confirmDelete': 'Delete? This cannot be undone.',
  'common.optional': 'optional',
  'common.failedToLoad': 'Failed to load',
  'common.saveFailed': 'Save failed',
  'common.deleteFailed': 'Delete failed',
  'common.uploadFailed': 'Upload failed',

  'dashboard.title': 'Dashboard',
  'dashboard.totalOrders': 'Total orders',
  'dashboard.pending': 'Pending',
  'dashboard.revenue': 'Revenue (all time)',
  'dashboard.avgOrder': 'Avg. order value',
  'dashboard.last30Days': 'Last 30 days',
  'dashboard.viewAllOrders': 'View all orders →',

  'orders.title': 'Orders',
  'orders.search': 'Search by name, phone, or BA-XXXX…',
  'orders.allStatus': 'All status',
  'orders.exportCsv': 'Export CSV',
  'orders.exportPdf': 'Export PDF',
  'orders.colOrder': 'Order',
  'orders.colCustomer': 'Customer',
  'orders.colPhone': 'Phone',
  'orders.colGovernorate': 'Governorate',
  'orders.colItems': 'Items',
  'orders.colTotal': 'Total',
  'orders.colStatus': 'Status',
  'orders.colDate': 'Date',
  'orders.empty': 'No orders match these filters.',
  'orders.confirmDelete': 'Permanently delete this order? This cannot be undone.',
  'orders.deleted': 'Deleted',
  'orders.status.pending': 'Pending',
  'orders.status.confirmed': 'Confirmed',
  'orders.status.shipped': 'Shipped',
  'orders.status.delivered': 'Delivered',
  'orders.status.cancelled': 'Cancelled',

  'orderDetail.customer': 'Customer',
  'orderDetail.phone': 'Phone',
  'orderDetail.address': 'Address',
  'orderDetail.governorate': 'Governorate',
  'orderDetail.items': 'Items',
  'orderDetail.subtotal': 'Subtotal',
  'orderDetail.shipping': 'Shipping',
  'orderDetail.discount': 'Discount',
  'orderDetail.total': 'Total',
  'orderDetail.notes': 'Customer notes',
  'orderDetail.adminNotes': 'Admin notes',
  'orderDetail.placedAt': 'Placed at',
  'orderDetail.printInvoice': 'Print invoice',
  'orderDetail.payment': 'Payment',

  'invoice.title': 'Invoice',
  'invoice.brandTagline': 'Kuwait abayas',
  'invoice.billTo': 'Bill to',
  'invoice.shipTo': 'Ship to',
  'invoice.paymentMethod': 'Payment method',
  'invoice.paymentStatus': 'Payment status',
  'invoice.itemsCount': 'Items count',
  'invoice.colItem': 'Item',
  'invoice.colQty': 'Qty',
  'invoice.colUnit': 'Unit',
  'invoice.colSubtotal': 'Subtotal',
  'invoice.sku': 'SKU',
  'invoice.size': 'Size',
  'invoice.subtotal': 'Subtotal',
  'invoice.shipping': 'Shipping',
  'invoice.shippingFree': 'FREE',
  'invoice.discount': 'Discount',
  'invoice.total': 'Total',
  'invoice.customerNotes': 'Customer notes',
  'invoice.adminNotes': 'Internal notes',
  'invoice.thankYou': 'Thank you for choosing Deda',
  'invoice.contactLine': 'For returns or questions, contact us via WhatsApp',
  'invoice.printSave': 'Print / Save PDF',
  'invoice.close': 'Close',
  'invoice.preparing': 'Preparing invoice…',
  'invoice.payOnDelivery': 'Pay on delivery',
  'invoice.piece': 'piece',
  'invoice.pieces': 'pieces',
  'invoice.line': 'line',
  'invoice.lines': 'lines',
  'invoice.method.cod':       'Cash on delivery',
  'invoice.method.card':      'Credit / Debit Card',
  'invoice.method.knet':      'KNET',
  'invoice.method.applePay':  'Apple Pay',
  'invoice.method.googlePay': 'Google Pay',
  'invoice.method.mada':      'Mada',
  'invoice.method.benefit':   'Benefit',
  'invoice.payStatus.initiated': 'Initiated',
  'invoice.payStatus.captured':  'Paid',
  'invoice.payStatus.failed':    'Failed',
  'invoice.payStatus.cancelled': 'Cancelled',
  'invoice.payStatus.refunded':  'Refunded',

  'report.title':       'Orders report',
  'report.filter':      'Filter',
  'report.search':      'Search',
  'report.generated':   'Generated',
  'report.allStatus':   'all status',
  'report.ordersCount': 'Orders',
  'report.itemsCount':  'Items',
  'report.revenue':     'Revenue (non-cancelled)',
  'report.empty':       'No orders match these filters.',
  'report.preparing':   'Preparing report…',
  'report.colProduct':  'Products',

  'cat.coloured':    'Coloured',
  'cat.black':       'Black',
  'cat.snap':        'Snap',
  'cat.embroidered': 'Embroidered',
  'cat.overhead':    'Overhead',
  'cat.kids':        'Kids',
  'cat.everyday':    'Everyday',
  'cat.ready':       'Ready',
  'cat.winter':      'Winter',

  'leads.title': 'Out-of-stock leads',
  'leads.subtitle': 'Customers waiting for restock notifications.',

  'products.title': 'Products',
  'products.addNew': 'Add product',
  'products.empty': 'No products yet.',
  'products.allCategories': 'All categories',
  'products.featured': 'Featured',
  'products.new': 'New',
  'products.bestSeller': 'Best seller',
  'products.featuredCheckbox': 'Featured (homepage)',
  'products.newCheckbox': 'New (badge)',
  'products.bestSellerCheckbox': 'Best seller (homepage)',
  'products.status': 'Status',
  'products.sortOrder': 'Sort order',
  'products.basePrice': 'Base price (piastres)',
  'products.discount': 'Discount (piastres)',
  'products.nameEn': 'Name (English)',
  'products.nameAr': 'Name (Arabic)',
  'products.descriptionEn': 'Description (English)',
  'products.descriptionAr': 'Description (Arabic)',
  'products.slug': 'Slug',
  'products.category': 'Category',
  'products.colours': 'Colours',

  'bundles.title': 'Bundles',
  'bundles.subtitle':
    'Curated outfit sets shown in the "إطلالات" section on the homepage.',
  'bundles.addNew': 'Add bundle',
  'bundles.empty': 'No bundles yet. Click "Add bundle" to create the first one.',
  'bundles.coverImage': 'Cover image',
  'bundles.products': 'products',
  'bundles.hidden': 'Hidden',
  'bundles.bundlePrice': 'Bundle price (piastres)',
  'bundles.originalPrice': 'Original price (piastres)',
  'bundles.showOnHome': 'Show on homepage',
  'bundles.productPicker': 'Products in this bundle',
  'bundles.searchProducts': 'Search products by name or slug…',
  'bundles.moveUp': 'Move up',
  'bundles.moveDown': 'Move down',
  'bundles.uploadAfterSave': 'Upload the cover image after saving.',
  'bundles.newBundle': 'New bundle',
  'bundles.newBundleSubtitle':
    'Create the bundle first, then upload its cover image on the next screen.',

  'coupons.title': 'Coupons',
  'coupons.code': 'Code',
  'coupons.type': 'Type',
  'coupons.value': 'Value',
  'coupons.expires': 'Expires',
  'coupons.usage': 'Usage',
  'coupons.active': 'Active',

  'hero.title': 'Homepage slides',
  'hero.subtitle':
    'The rotating hero on the homepage. Upload an image, tag it with AR/EN alt text, and reorder by changing the sort number.',
  'hero.addSlide': 'Add slide',
  'hero.currentSlides': 'Current slides',
  'hero.imageField': 'Image',
  'hero.altEn': 'Alt text (English)',
  'hero.altAr': 'Alt text (Arabic)',
  'hero.sortOrder': 'Sort order',
  'hero.showOnHome': 'Show on homepage',

  'categories.title': 'Category images',
  'categories.subtitle':
    'The six cover photos for the homepage category grid. Upload a new image to override the default; click Reset to restore the built-in photo.',
  'categories.custom': 'Custom',
  'categories.default': 'Default',

  'editorial.title': 'Editorial section',
  'editorial.subtitle':
    'The image + copy block near the bottom of the homepage. Leave any field blank to fall back to the built-in default.',
  'editorial.coverImage': 'Cover image',
  'editorial.eyebrowEn': 'Eyebrow (English)',
  'editorial.eyebrowAr': 'Eyebrow (Arabic)',
  'editorial.headlineEn': 'Headline (English)',
  'editorial.headlineAr': 'Headline (Arabic)',
  'editorial.bodyEn': 'Body (English)',
  'editorial.bodyAr': 'Body (Arabic)',

  'settings.title': 'Settings',
  'settings.subtitle':
    'Links rendered in the storefront footer. Leave a field blank to hide that icon from the site.',
  'settings.whatsapp': 'WhatsApp number',
  'settings.whatsappHint': 'Include the country code, e.g. +201234567890',
  'settings.facebook': 'Facebook page URL',
  'settings.instagram': 'Instagram profile URL',
  'settings.tiktok': 'TikTok profile URL',
  'settings.saved': 'Saved',

  'login.title': 'Admin login',
  'login.username': 'Username',
  'login.password': 'Password',
  'login.signIn': 'Sign in',
  'login.signingIn': 'Signing in…',
  'login.failed': 'Login failed',

  'governorates.title': 'Governorates',
  'governorates.nameEn': 'Name (English)',
  'governorates.nameAr': 'Name (Arabic)',
  'governorates.shippingFee': 'Shipping fee',
  'governorates.active': 'Active',

  'countries.title': 'International shipping',
  'countries.code': 'Code',
  'countries.nameEn': 'Name (English)',
  'countries.nameAr': 'Name (Arabic)',
  'countries.shippingFee': 'Shipping fee',
  'countries.active': 'Active',
};

const AR: Dict = {
  'sidebar.dashboard': 'لوحة التحكم',
  'sidebar.orders': 'الطلبات',
  'sidebar.leads': 'طلبات إعادة التوفر',
  'sidebar.products': 'المنتجات',
  'sidebar.bundles': 'البندلات',
  'sidebar.coupons': 'الكوبونات',
  'sidebar.governorates': 'المحافظات',
  'sidebar.countries': 'الشحن الدولى',
  'sidebar.heroSlides': 'سلايدر الصفحة الرئيسية',
  'sidebar.categoryImages': 'صور الفئات',
  'sidebar.editorial': 'قسم الحرفية',
  'sidebar.settings': 'الإعدادات',
  'sidebar.signedInAs': 'تسجيل الدخول كـ',
  'sidebar.logout': 'تسجيل الخروج',

  'common.admin': 'الإدارة',
  'common.loading': 'جارٍ التحميل…',
  'common.save': 'حفظ',
  'common.saving': 'جارٍ الحفظ…',
  'common.saveChanges': 'حفظ التغييرات',
  'common.cancel': 'إلغاء',
  'common.delete': 'حذف',
  'common.deleting': 'جارٍ الحذف…',
  'common.edit': 'تعديل',
  'common.view': 'عرض',
  'common.add': 'إضافة',
  'common.reset': 'إعادة',
  'common.replace': 'استبدال',
  'common.upload': 'رفع',
  'common.uploading': 'جارٍ الرفع…',
  'common.remove': 'إزالة',
  'common.search': 'بحث',
  'common.confirmDelete': 'هل أنت متأكد من الحذف؟ لا يمكن التراجع.',
  'common.optional': 'اختيارى',
  'common.failedToLoad': 'فشل التحميل',
  'common.saveFailed': 'فشل الحفظ',
  'common.deleteFailed': 'فشل الحذف',
  'common.uploadFailed': 'فشل الرفع',

  'dashboard.title': 'لوحة التحكم',
  'dashboard.totalOrders': 'إجمالى الطلبات',
  'dashboard.pending': 'قيد الانتظار',
  'dashboard.revenue': 'الإيرادات (الإجمالى)',
  'dashboard.avgOrder': 'متوسط قيمة الطلب',
  'dashboard.last30Days': 'آخر ٣٠ يوم',
  'dashboard.viewAllOrders': 'عرض كل الطلبات ←',

  'orders.title': 'الطلبات',
  'orders.search': 'ابحث بالاسم أو الهاتف أو BA-XXXX…',
  'orders.allStatus': 'كل الحالات',
  'orders.exportCsv': 'تصدير CSV',
  'orders.exportPdf': 'تصدير PDF',
  'orders.colOrder': 'رقم الطلب',
  'orders.colCustomer': 'العميل',
  'orders.colPhone': 'الهاتف',
  'orders.colGovernorate': 'المحافظة',
  'orders.colItems': 'القطع',
  'orders.colTotal': 'الإجمالى',
  'orders.colStatus': 'الحالة',
  'orders.colDate': 'التاريخ',
  'orders.empty': 'لا توجد طلبات تطابق هذه المعايير.',
  'orders.confirmDelete': 'حذف الطلب نهائياً؟ لا يمكن التراجع.',
  'orders.deleted': 'تم الحذف',
  'orders.status.pending': 'قيد الانتظار',
  'orders.status.confirmed': 'مؤكد',
  'orders.status.shipped': 'تم الشحن',
  'orders.status.delivered': 'تم التسليم',
  'orders.status.cancelled': 'ملغى',

  'orderDetail.customer': 'العميل',
  'orderDetail.phone': 'الهاتف',
  'orderDetail.address': 'العنوان',
  'orderDetail.governorate': 'المحافظة',
  'orderDetail.items': 'القطع',
  'orderDetail.subtotal': 'المجموع الفرعى',
  'orderDetail.shipping': 'الشحن',
  'orderDetail.discount': 'الخصم',
  'orderDetail.total': 'الإجمالى',
  'orderDetail.notes': 'ملاحظات العميل',
  'orderDetail.adminNotes': 'ملاحظات الإدارة',
  'orderDetail.placedAt': 'تاريخ الطلب',
  'orderDetail.printInvoice': 'طباعة الفاتورة',
  'orderDetail.payment': 'الدفع',

  'invoice.title': 'فاتورة',
  'invoice.brandTagline': 'عبايات الكويت',
  'invoice.billTo': 'العميل',
  'invoice.shipTo': 'عنوان التوصيل',
  'invoice.paymentMethod': 'طريقة الدفع',
  'invoice.paymentStatus': 'حالة الدفع',
  'invoice.itemsCount': 'إجمالى القطع',
  'invoice.colItem': 'المنتج',
  'invoice.colQty': 'الكمية',
  'invoice.colUnit': 'سعر الوحدة',
  'invoice.colSubtotal': 'الإجمالى',
  'invoice.sku': 'كود',
  'invoice.size': 'المقاس',
  'invoice.subtotal': 'المجموع الفرعى',
  'invoice.shipping': 'الشحن',
  'invoice.shippingFree': 'مجانى',
  'invoice.discount': 'الخصم',
  'invoice.total': 'الإجمالى',
  'invoice.customerNotes': 'ملاحظات العميل',
  'invoice.adminNotes': 'ملاحظات داخلية',
  'invoice.thankYou': 'شكراً لاختياركم ديدا',
  'invoice.contactLine': 'للإرجاع أو الاستفسار، تواصلوا عبر واتساب',
  'invoice.printSave': 'طباعة / حفظ PDF',
  'invoice.close': 'إغلاق',
  'invoice.preparing': 'جارٍ تجهيز الفاتورة…',
  'invoice.payOnDelivery': 'الدفع عند الاستلام',
  'invoice.piece': 'قطعة',
  'invoice.pieces': 'قطع',
  'invoice.line': 'سطر',
  'invoice.lines': 'أسطر',
  'invoice.method.cod':       'الدفع عند الاستلام',
  'invoice.method.card':      'بطاقة ائتمان',
  'invoice.method.knet':      'كي نت',
  'invoice.method.applePay':  'آبل باى',
  'invoice.method.googlePay': 'جوجل باى',
  'invoice.method.mada':      'مدى',
  'invoice.method.benefit':   'بنفت',
  'invoice.payStatus.initiated': 'قيد الدفع',
  'invoice.payStatus.captured':  'تم الدفع',
  'invoice.payStatus.failed':    'فشل',
  'invoice.payStatus.cancelled': 'ملغى',
  'invoice.payStatus.refunded':  'تم الاسترداد',

  'report.title':       'تقرير الطلبات',
  'report.filter':      'تصفية',
  'report.search':      'بحث',
  'report.generated':   'تاريخ التقرير',
  'report.allStatus':   'كل الحالات',
  'report.ordersCount': 'الطلبات',
  'report.itemsCount':  'القطع',
  'report.revenue':     'الإيرادات (بدون الملغى)',
  'report.empty':       'لا توجد طلبات تطابق هذه المعايير.',
  'report.preparing':   'جارٍ تجهيز التقرير…',
  'report.colProduct':  'المنتجات',

  'cat.coloured':    'ملوّنة',
  'cat.black':       'سوداء',
  'cat.snap':        'شك',
  'cat.embroidered': 'تطريز',
  'cat.overhead':    'راس',
  'cat.kids':        'أطفال',
  'cat.everyday':    'عملية',
  'cat.ready':       'جاهزة',
  'cat.winter':      'شتوية',

  'leads.title': 'طلبات إعادة التوفر',
  'leads.subtitle': 'عملاء فى انتظار إشعار عودة المنتج.',

  'products.title': 'المنتجات',
  'products.addNew': 'إضافة منتج',
  'products.empty': 'لا توجد منتجات.',
  'products.allCategories': 'كل الفئات',
  'products.featured': 'مميز',
  'products.new': 'جديد',
  'products.bestSeller': 'الأكثر مبيعاً',
  'products.featuredCheckbox': 'مميز (الصفحة الرئيسية)',
  'products.newCheckbox': 'جديد (شارة)',
  'products.bestSellerCheckbox': 'الأكثر مبيعاً (الصفحة الرئيسية)',
  'products.status': 'الحالة',
  'products.sortOrder': 'ترتيب العرض',
  'products.basePrice': 'السعر الأساسى (فلس)',
  'products.discount': 'الخصم (فلس)',
  'products.nameEn': 'الاسم (إنجليزى)',
  'products.nameAr': 'الاسم (عربى)',
  'products.descriptionEn': 'الوصف (إنجليزى)',
  'products.descriptionAr': 'الوصف (عربى)',
  'products.slug': 'الرابط (slug)',
  'products.category': 'الفئة',
  'products.colours': 'الألوان',

  'bundles.title': 'البندلات',
  'bundles.subtitle': 'مجموعات منتقاة تُعرض فى قسم "إطلالات" بالصفحة الرئيسية.',
  'bundles.addNew': 'إضافة بندل',
  'bundles.empty': 'لا توجد بندلات. اضغط "إضافة بندل" لإنشاء أول واحد.',
  'bundles.coverImage': 'صورة الغلاف',
  'bundles.products': 'منتج',
  'bundles.hidden': 'مخفى',
  'bundles.bundlePrice': 'سعر البندل (فلس)',
  'bundles.originalPrice': 'السعر الأصلى (فلس)',
  'bundles.showOnHome': 'إظهار فى الصفحة الرئيسية',
  'bundles.productPicker': 'منتجات هذا البندل',
  'bundles.searchProducts': 'ابحث عن منتج بالاسم أو الرابط…',
  'bundles.moveUp': 'تحريك لأعلى',
  'bundles.moveDown': 'تحريك لأسفل',
  'bundles.uploadAfterSave': 'ارفع صورة الغلاف بعد الحفظ.',
  'bundles.newBundle': 'بندل جديد',
  'bundles.newBundleSubtitle': 'أنشئ البندل أولاً، ثم ارفع صورة الغلاف فى الصفحة التالية.',

  'coupons.title': 'الكوبونات',
  'coupons.code': 'الكود',
  'coupons.type': 'النوع',
  'coupons.value': 'القيمة',
  'coupons.expires': 'تاريخ الانتهاء',
  'coupons.usage': 'الاستخدام',
  'coupons.active': 'مفعّل',

  'hero.title': 'سلايدر الصفحة الرئيسية',
  'hero.subtitle':
    'الصور المتغيرة فى أعلى الصفحة الرئيسية. ارفع صورة، اكتب نصاً بديلاً، وغيّر رقم الترتيب.',
  'hero.addSlide': 'إضافة سلايد',
  'hero.currentSlides': 'السلايدات الحالية',
  'hero.imageField': 'الصورة',
  'hero.altEn': 'نص بديل (إنجليزى)',
  'hero.altAr': 'نص بديل (عربى)',
  'hero.sortOrder': 'الترتيب',
  'hero.showOnHome': 'إظهار فى الصفحة الرئيسية',

  'categories.title': 'صور الفئات',
  'categories.subtitle':
    'الست صور التى تظهر فى شبكة فئات الصفحة الرئيسية. ارفع صورة جديدة لاستبدال الافتراضية أو اضغط Reset لإعادة الافتراضية.',
  'categories.custom': 'مخصص',
  'categories.default': 'افتراضى',

  'editorial.title': 'قسم الحرفية',
  'editorial.subtitle':
    'صورة + نص فى أسفل الصفحة الرئيسية. اترك أى حقل فارغ ليرجع للقيمة الافتراضية.',
  'editorial.coverImage': 'صورة الغلاف',
  'editorial.eyebrowEn': 'الكلمة العلوية (إنجليزى)',
  'editorial.eyebrowAr': 'الكلمة العلوية (عربى)',
  'editorial.headlineEn': 'العنوان (إنجليزى)',
  'editorial.headlineAr': 'العنوان (عربى)',
  'editorial.bodyEn': 'النص (إنجليزى)',
  'editorial.bodyAr': 'النص (عربى)',

  'settings.title': 'الإعدادات',
  'settings.subtitle': 'روابط تظهر فى تذييل المتجر. اترك الحقل فارغاً لإخفاء الأيقونة.',
  'settings.whatsapp': 'رقم واتساب',
  'settings.whatsappHint': 'مع مفتاح الدولة، مثل +201234567890',
  'settings.facebook': 'رابط صفحة فيسبوك',
  'settings.instagram': 'رابط بروفايل انستاجرام',
  'settings.tiktok': 'رابط بروفايل تيك توك',
  'settings.saved': 'تم الحفظ',

  'login.title': 'تسجيل دخول الإدارة',
  'login.username': 'اسم المستخدم',
  'login.password': 'كلمة المرور',
  'login.signIn': 'دخول',
  'login.signingIn': 'جارٍ الدخول…',
  'login.failed': 'فشل تسجيل الدخول',

  'governorates.title': 'المحافظات',
  'governorates.nameEn': 'الاسم (إنجليزى)',
  'governorates.nameAr': 'الاسم (عربى)',
  'governorates.shippingFee': 'رسوم الشحن',
  'governorates.active': 'مفعّل',

  'countries.title': 'الشحن الدولى',
  'countries.code': 'الكود',
  'countries.nameEn': 'الاسم (إنجليزى)',
  'countries.nameAr': 'الاسم (عربى)',
  'countries.shippingFee': 'رسوم الشحن',
  'countries.active': 'مفعّل',
};

export type AdminLocale = 'en' | 'ar';

type Ctx = {
  locale: AdminLocale;
  setLocale: (l: AdminLocale) => void;
  t: (key: keyof Dict) => string;
};

const AdminI18nContext = createContext<Ctx | null>(null);
const STORAGE_KEY = 'deda-admin-locale';

export function AdminI18nProvider({ children }: { children: ReactNode }) {
  // Default to Arabic so a fresh login matches the storefront's
  // Kuwait-first audience. Persisted on every change.
  const [locale, setLocaleState] = useState<AdminLocale>('ar');

  // Read the persisted choice on mount. We can't initialise the state
  // from localStorage directly because that runs during SSR (window is
  // undefined). Two-step + dir attribute below keeps things consistent.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ar') setLocaleState(saved);
  }, []);

  // Mirror the locale onto <html> so global CSS (font-family, direction)
  // picks up the change without each page having to opt in.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  const setLocale = (l: AdminLocale) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, l);
    }
    setLocaleState(l);
  };

  const value = useMemo<Ctx>(() => {
    const dict = locale === 'ar' ? AR : EN;
    return {
      locale,
      setLocale,
      t: (key) => dict[key] ?? key,
    };
  }, [locale]);

  return (
    <AdminI18nContext.Provider value={value}>{children}</AdminI18nContext.Provider>
  );
}

export function useAdminI18n() {
  const ctx = useContext(AdminI18nContext);
  if (!ctx) {
    // Outside the provider (e.g. login page before mount). Return a
    // best-effort fallback so calls don't crash.
    return { locale: 'ar' as AdminLocale, setLocale: () => {}, t: (k: keyof Dict) => k };
  }
  return ctx;
}
