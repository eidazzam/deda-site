-- Rozana stored payment info in a separate Payment table joined onto
-- Order via a relation. Deda is cash-on-delivery only, so the schema
-- was simplified to carry paymentMethod / paymentStatus inline on
-- Order itself. The schema prune cleared out the old Payment-table
-- machinery, but the new inline columns on Order were never actually
-- added to the database — Prisma's current client expects them, so
-- every order submission 500s with
-- "The column `paymentMethod` does not exist in the current database".
--
-- Add the enums + columns in an idempotent, data-preserving way so
-- the migration is safe to re-run or apply over a partially-migrated
-- database (e.g. one where an earlier Rozana init already created
-- "PaymentMethod"/"PaymentStatus" enum types with different values).

-- ---------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') THEN
        CREATE TYPE "PaymentMethod" AS ENUM ('COD');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
        CREATE TYPE "PaymentStatus" AS ENUM ('CAPTURED', 'REFUNDED');
    END IF;
END$$;

-- ---------------------------------------------------------------------
-- 2. Columns on Order
-- ---------------------------------------------------------------------
ALTER TABLE "Order"
    ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'COD',
    ADD COLUMN IF NOT EXISTS "paymentStatus" "PaymentStatus";
