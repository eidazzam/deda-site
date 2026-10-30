-- Per-product size-chart image URL. Nullable: products that don't need
-- one (or haven't had one uploaded yet) just skip the size-guide link.
ALTER TABLE "Product" ADD COLUMN "sizeChartUrl" TEXT;
