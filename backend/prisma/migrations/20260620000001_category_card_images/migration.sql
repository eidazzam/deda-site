-- Admin-overridable cover image per homepage category card. The
-- category set itself is fixed (the Category enum) so we use the enum
-- as the primary key. A missing row means "use the frontend's hardcoded
-- fallback URL"; uploading a new image inserts/updates the row.

CREATE TABLE "CategoryCardImage" (
  "category" "Category" NOT NULL,
  "url" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CategoryCardImage_pkey" PRIMARY KEY ("category")
);
