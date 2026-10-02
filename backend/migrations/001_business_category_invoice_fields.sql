-- 001_business_category_invoice_fields.sql
--
-- Adds business-category support plus the optional invoice fields that the
-- PHARMA category needs (batch / expiry / manufacturer / free qty).
-- Every column is nullable or defaulted, so GENERAL businesses are unaffected.
--
-- Idempotent: safe to run more than once.
--
-- Run with:  psql "$DATABASE_URL" -f backend/migrations/001_business_category_invoice_fields.sql

BEGIN;

-- -------------------- users (the supplier / business profile) --------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS business_category VARCHAR(30) DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS fssai_no          VARCHAR(50),
  ADD COLUMN IF NOT EXISTS dl_no             VARCHAR(100),
  ADD COLUMN IF NOT EXISTS jurisdiction      VARCHAR(100);

UPDATE users
   SET business_category = 'GENERAL'
 WHERE business_category IS NULL;

-- -------------------- invoices --------------------
-- The category an invoice was ISSUED under. An invoice is a historical
-- document: it must reprint in the layout the customer originally received,
-- not whatever the business has switched to since.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS business_category VARCHAR(30);

-- Every invoice that exists today was printed with the general template,
-- because that was the only template there was.
UPDATE invoices
   SET business_category = 'GENERAL'
 WHERE business_category IS NULL;

-- -------------------- customers (the consignee / buyer) --------------------
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS dl_no      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS fssai_no   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS uid        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS state_code VARCHAR(5),
  ADD COLUMN IF NOT EXISTS beat       VARCHAR(100);

-- -------------------- products --------------------
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS batch_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS exp_date VARCHAR(20),
  ADD COLUMN IF NOT EXISTS mfg_by   VARCHAR(150);

-- -------------------- invoice_items --------------------
-- hsn / unit already exist in the table definition but were never written to;
-- the IF NOT EXISTS guards cover databases where they are missing.
ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS hsn             VARCHAR(20),
  ADD COLUMN IF NOT EXISTS unit            VARCHAR(20),
  ADD COLUMN IF NOT EXISTS mrp             DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS batch_no        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS exp_date        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS mfg_by          VARCHAR(150),
  ADD COLUMN IF NOT EXISTS free_qty         DECIMAL(12,2) DEFAULT 0,
  -- The negotiated scheme rate. This is the stored term; the rupee figure
  -- printed in the "Dis Amt" column is derived from it per unit.
  ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(6,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount  DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_amount   DECIMAL(12,2);

-- quantity was INT, which silently truncates fractional quantities coming from
-- COMPOUND-unit products. Widen it to match free_qty.
ALTER TABLE invoice_items
  ALTER COLUMN quantity TYPE DECIMAL(12,2);

UPDATE invoice_items
   SET free_qty = 0
 WHERE free_qty IS NULL;

UPDATE invoice_items
   SET discount_amount = 0
 WHERE discount_amount IS NULL;

UPDATE invoice_items
   SET discount_percent = 0
 WHERE discount_percent IS NULL;

COMMIT;
