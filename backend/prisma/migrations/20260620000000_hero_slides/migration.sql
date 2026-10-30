-- Admin-managed homepage hero slider. One row per image. Sort order +
-- isActive let the admin reorder / hide slides without deleting them.
-- Seeded with the four Unsplash frames the homepage shipped with so a
-- freshly-migrated database keeps the same hero on first render.

CREATE TABLE "HeroSlide" (
  "id" SERIAL PRIMARY KEY,
  "url" TEXT NOT NULL,
  "altEn" TEXT,
  "altAr" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "HeroSlide_isActive_sortOrder_idx" ON "HeroSlide"("isActive", "sortOrder");

INSERT INTO "HeroSlide" ("url", "altEn", "altAr", "isActive", "sortOrder", "updatedAt") VALUES
  ('https://images.unsplash.com/photo-1613005798967-632017e477c8?w=1400&h=1700&fit=crop&q=85&auto=format', 'Opening look in black abaya', 'إطلالة افتتاحية بعباية سوداء', true, 0, CURRENT_TIMESTAMP),
  ('https://images.unsplash.com/photo-1570203543523-57e9dc7ff410?w=1400&h=1700&fit=crop&q=85&auto=format', 'A coloured abaya in warm tones', 'عباية ملوّنة بألوان دافئة', true, 1, CURRENT_TIMESTAMP),
  ('https://images.unsplash.com/photo-1760083545495-b297b1690672?w=1400&h=1700&fit=crop&q=85&auto=format', 'Quiet embroidery on a beige abaya', 'تطريز هادئ على عباية بيج', true, 2, CURRENT_TIMESTAMP),
  ('https://images.unsplash.com/photo-1736342182213-6c037467cb38?w=1400&h=1700&fit=crop&q=85&auto=format', 'A shared moment, dressed in tradition', 'لحظة جماعية بإطلالات تقليدية', true, 3, CURRENT_TIMESTAMP);
