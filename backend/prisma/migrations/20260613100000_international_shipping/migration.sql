-- International shipping support.
-- Adds a Country table for the 15 Arab destinations we ship to and
-- threads countryCode through Order so the shipping calculator can
-- branch on Kuwait (per-governorate) vs international (flat per-country).

-- 1. New Country table
CREATE TABLE "Country" (
  "id"          SERIAL          PRIMARY KEY,
  "code"        TEXT            NOT NULL,
  "nameEn"      TEXT            NOT NULL,
  "nameAr"      TEXT            NOT NULL,
  "shippingFee" INTEGER         NOT NULL,
  "isActive"    BOOLEAN         NOT NULL DEFAULT true,
  "sortOrder"   INTEGER         NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX "Country_code_key"   ON "Country"("code");
CREATE UNIQUE INDEX "Country_nameEn_key" ON "Country"("nameEn");

-- 2. Order columns. Existing rows default to Kuwait so historical orders
--    keep showing their governorate as before.
ALTER TABLE "Order"
  ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'KW';

ALTER TABLE "Order"
  ALTER COLUMN "governorateName" DROP NOT NULL;

-- 3. Seed the 15 Arab destinations with a flat 7 KWD (= 7000 fils) fee.
INSERT INTO "Country" ("code", "nameEn", "nameAr", "shippingFee", "sortOrder") VALUES
  ('EG', 'Egypt',                 'مصر',       7000,  1),
  ('SA', 'Saudi Arabia',          'السعودية',  7000,  2),
  ('AE', 'United Arab Emirates',  'الإمارات',  7000,  3),
  ('QA', 'Qatar',                 'قطر',       7000,  4),
  ('BH', 'Bahrain',               'البحرين',   7000,  5),
  ('OM', 'Oman',                  'عُمان',     7000,  6),
  ('JO', 'Jordan',                'الأردن',    7000,  7),
  ('IQ', 'Iraq',                  'العراق',    7000,  8),
  ('SY', 'Syria',                 'سوريا',     7000,  9),
  ('LB', 'Lebanon',               'لبنان',     7000, 10),
  ('YE', 'Yemen',                 'اليمن',     7000, 11),
  ('LY', 'Libya',                 'ليبيا',     7000, 12),
  ('TN', 'Tunisia',               'تونس',      7000, 13),
  ('DZ', 'Algeria',               'الجزائر',   7000, 14),
  ('MA', 'Morocco',               'المغرب',    7000, 15);
