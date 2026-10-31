-- Deda doesn't use the Rozana-era features that these tables backed —
-- bundles, coupons, international shipping, back-in-stock leads,
-- homepage category cards, and the hero-slide CMS are all gone from
-- both the admin and the backend routes. Drop their tables + enums.
--
-- Order of DROPs is foreign-key-safe: child tables first, then parents.

DROP TABLE IF EXISTS "BundleProduct" CASCADE;
DROP TABLE IF EXISTS "Bundle" CASCADE;
DROP TABLE IF EXISTS "Lead" CASCADE;
DROP TABLE IF EXISTS "CategoryCardImage" CASCADE;
DROP TABLE IF EXISTS "HeroSlide" CASCADE;
DROP TABLE IF EXISTS "Coupon" CASCADE;
DROP TABLE IF EXISTS "Country" CASCADE;
DROP TABLE IF EXISTS "EditorialSection" CASCADE;

-- Enums only used by the dropped tables.
DROP TYPE IF EXISTS "LeadStatus";
DROP TYPE IF EXISTS "CouponType";

-- SiteConfig keeps the editorial-* columns intact for now (unused by
-- the frontend but harmless to leave), so we don't need to touch it.
