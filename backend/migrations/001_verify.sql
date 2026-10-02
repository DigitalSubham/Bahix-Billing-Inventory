-- Verification for 001_business_category_invoice_fields.sql
-- Run after the migration. Every row should read 'OK'.

SELECT table_name, column_name,
       CASE WHEN column_name IS NULL THEN 'MISSING' ELSE 'OK' END AS status
FROM (
  VALUES
    ('users','business_category'), ('users','fssai_no'),
    ('users','dl_no'),             ('users','jurisdiction'),
    ('customers','dl_no'),         ('customers','fssai_no'),
    ('customers','uid'),           ('customers','state_code'),
    ('customers','beat'),
    ('products','batch_no'),       ('products','exp_date'),
    ('products','mfg_by'),
    ('invoice_items','hsn'),              ('invoice_items','unit'),
    ('invoice_items','mrp'),              ('invoice_items','batch_no'),
    ('invoice_items','exp_date'),         ('invoice_items','mfg_by'),
    ('invoice_items','free_qty'),         ('invoice_items','discount_percent'),
    ('invoice_items','discount_amount'),  ('invoice_items','taxable_amount')
) AS expected(table_name, column_name)
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns c
   WHERE c.table_schema = 'public'
     AND c.table_name  = expected.table_name
     AND c.column_name = expected.column_name
);
-- Zero rows returned = every column is present.

-- quantity must no longer be an integer type:
SELECT data_type AS quantity_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'invoice_items'
  AND column_name  = 'quantity';
-- expected: numeric
