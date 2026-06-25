import pool from "./db.js";

// const updateInvoicesSchema = async () => {
//   try {
//     await pool.query("BEGIN");

//     // Remove global unique constraint
//     await pool.query(`
//       ALTER TABLE invoices
//       DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;
//     `);

//     // Add composite unique constraint
//     await pool.query(`
//       ALTER TABLE invoices
//       ADD CONSTRAINT invoices_user_invoice_unique
//       UNIQUE (user_id, invoice_number);
//     `);

//     await pool.query("COMMIT");
//     console.log("✅ Invoices table updated successfully!");
//   } catch (err) {
//     await pool.query("ROLLBACK");
//     console.error("❌ Error updating invoices table:", err);
//     process.exit(1);
//   } finally {
//     await pool.end();
//   }
// };

// updateInvoicesSchema();

const updateProductSchema = async () => {
  try {
    await pool.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS base_unit VARCHAR(20) DEFAULT 'PCS',
      ADD COLUMN IF NOT EXISTS conversion_factor DECIMAL(12,4) DEFAULT 1,
      ADD COLUMN IF NOT EXISTS unit_type VARCHAR(30),
      ADD COLUMN IF NOT EXISTS min_stock INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    `);

    await pool.query(`
      UPDATE products
      SET
        stock = COALESCE(stock, 0),
        unit = COALESCE(NULLIF(unit, ''), 'PCS'),
        base_unit = COALESCE(NULLIF(base_unit, ''), NULLIF(unit, ''), 'PCS')
      WHERE stock IS NULL
        OR unit IS NULL
        OR unit = ''
        OR base_unit IS NULL
        OR base_unit = '';
    `);
    console.log("✅ Products table updated successfully!");
  } catch (error) {
    console.error("❌ Error updating products table:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

updateProductSchema();
