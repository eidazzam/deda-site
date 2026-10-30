-- Adds a Product.isBestSeller flag so the homepage can carry a dedicated
-- "best sellers" rail alongside Featured and New. Mirrors the existing
-- isFeatured / isNew pattern: simple boolean, default false, with a
-- partial index on the flag for the storefront filter.

ALTER TABLE "Product"
  ADD COLUMN "isBestSeller" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Product_isBestSeller_idx" ON "Product"("isBestSeller");
