-- Tap Payments integration. Adds the payment-related enums, a Payment
-- table that owns the Tap charge, and two columns on Order so we can
-- branch the post-checkout flow on payment method + filter the admin
-- list by status.

-- 1. Enums
CREATE TYPE "PaymentProvider" AS ENUM ('TAP');

CREATE TYPE "PaymentMethod" AS ENUM (
  'COD', 'CARD', 'KNET', 'APPLE_PAY', 'GOOGLE_PAY', 'MADA', 'BENEFIT'
);

CREATE TYPE "PaymentStatus" AS ENUM (
  'INITIATED', 'CAPTURED', 'FAILED', 'CANCELLED', 'REFUNDED'
);

-- 2. Order columns. Existing rows default to COD so historical orders
--    don't suddenly look like they need an online payment.
ALTER TABLE "Order"
  ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'COD',
  ADD COLUMN "paymentStatus" "PaymentStatus";

CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- 3. Payment table. One row per order; refunds + retries update in place.
CREATE TABLE "Payment" (
  "id"             SERIAL            PRIMARY KEY,
  "orderId"        INTEGER           NOT NULL,
  "provider"       "PaymentProvider" NOT NULL DEFAULT 'TAP',
  "tapChargeId"    TEXT              NOT NULL,
  "status"         "PaymentStatus"   NOT NULL DEFAULT 'INITIATED',
  "method"         "PaymentMethod",
  "amount"         INTEGER           NOT NULL,
  "redirectUrl"    TEXT,
  "refundedAmount" INTEGER           NOT NULL DEFAULT 0,
  "rawPayload"     JSONB,
  "createdAt"      TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)      NOT NULL,
  CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId")
    REFERENCES "Order"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "Payment_orderId_key"     ON "Payment"("orderId");
CREATE UNIQUE INDEX "Payment_tapChargeId_key" ON "Payment"("tapChargeId");
CREATE INDEX        "Payment_status_idx"      ON "Payment"("status");
