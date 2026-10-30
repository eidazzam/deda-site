export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

export const SITE_NAME = 'Deda';

export const SITE_DESCRIPTION = {
  en: 'Deda — luxury Kuwaiti abayas. Bilingual elegance, restrained craft, quietly powerful pieces.',
  ar: 'ديدا — عبايات فاخرة من الكويت. أناقة هادئة بحرفية رفيعة، قطع تعبّر عن حضورك.',
};

// Default OG image — committed alongside the brand logo so social
// previews load from the same origin and don't rely on any third
// party. Lives at frontend/public/brand/og-share.jpg; resolved to
// an absolute URL by Next.js via the `metadataBase` setting.
export const DEFAULT_OG_IMAGE = '/brand/og-share.jpg';

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID ?? '';
export const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID ?? '';
