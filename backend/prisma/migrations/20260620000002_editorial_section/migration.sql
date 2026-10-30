-- Admin-editable copy + image for the homepage editorial split section
-- (the "حرفية / Craft" block). All fields nullable so unsaved values
-- fall back to the hardcoded defaults in the storefront.

ALTER TABLE "SiteConfig"
  ADD COLUMN "editorialEyebrowEn"  TEXT,
  ADD COLUMN "editorialEyebrowAr"  TEXT,
  ADD COLUMN "editorialHeadlineEn" TEXT,
  ADD COLUMN "editorialHeadlineAr" TEXT,
  ADD COLUMN "editorialBodyEn"     TEXT,
  ADD COLUMN "editorialBodyAr"     TEXT,
  ADD COLUMN "editorialImageUrl"   TEXT;
