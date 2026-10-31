-- Admin-managed hero slider: up to four images the shop owner uploads
-- from /admin/settings. The storefront reads these over SiteConfig
-- (not a separate HeroSlide table — Deda uses a static 4-slot layout,
-- not an open list) and falls back to the hardcoded editorial frames
-- for any null slot. Nullable so a fresh install starts on the
-- fallback hero without extra seeding.

ALTER TABLE "SiteConfig"
    ADD COLUMN IF NOT EXISTS "heroImage1Url" TEXT,
    ADD COLUMN IF NOT EXISTS "heroImage2Url" TEXT,
    ADD COLUMN IF NOT EXISTS "heroImage3Url" TEXT,
    ADD COLUMN IF NOT EXISTS "heroImage4Url" TEXT;
