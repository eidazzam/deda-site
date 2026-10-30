-- Additional indexes to keep the storefront fast as the catalog grows
-- toward ~1500 products. Each covers a hot query path observed in
-- backend/src/routes/products.ts and /admin/products.ts.

CREATE INDEX "Product_status_sortOrder_idx" ON "Product"("status", "sortOrder");

CREATE INDEX "Product_category_status_sortOrder_idx"
  ON "Product"("category", "status", "sortOrder");

CREATE INDEX "Product_status_basePrice_idx" ON "Product"("status", "basePrice");
