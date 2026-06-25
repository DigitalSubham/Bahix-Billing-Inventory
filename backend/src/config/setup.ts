// setup.js
import pool from "./db.js"; // your pool file

async function createTables() {
  try {
    // -------------------- Users table --------------------
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(150) UNIQUE NOT NULL,
        mobile VARCHAR(20) UNIQUE,
        password VARCHAR(255) NOT NULL,
        address TEXT,
        gst_number VARCHAR(50) UNIQUE,
        pan_number VARCHAR(50) UNIQUE,
        role VARCHAR(20) DEFAULT 'user',
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // -------------------- User Payments table --------------------
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_payments (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        ifsc VARCHAR(20),
        account_no VARCHAR(50) UNIQUE,
        bank VARCHAR(100),
        payment_type VARCHAR(20) DEFAULT 'bank',
        is_primary BOOLEAN DEFAULT FALSE,
        currency VARCHAR(10) DEFAULT 'INR',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // -------------------- Customers table --------------------
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(150),
        city VARCHAR(100),
        pincode VARCHAR(6),
        customer_type VARCHAR(20) DEFAULT 'Regular',
        email VARCHAR(150),
        mobile VARCHAR(30),
        address TEXT,
        state VARCHAR(100),
        gst_number VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // -------------------- Products table --------------------
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(150),
        description TEXT,
        category VARCHAR(100),
        mrp DECIMAL(12,2),
        selling_rate DECIMAL(12,2),
        stock INT DEFAULT 0,
        sku VARCHAR(50) UNIQUE,
        unit VARCHAR(20) DEFAULT 'PCS',
        tax_percent DECIMAL(5,2) DEFAULT 0,
        base_unit VARCHAR(20) DEFAULT 'PCS',
        conversion_factor DECIMAL(12,4) DEFAULT 1,
        unit_type VARCHAR(30),
        min_stock INT DEFAULT 0,
        hsn_code VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // -------------------- Invoices table --------------------
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
        invoice_number VARCHAR(100) UNIQUE,
        invoice_type VARCHAR(30) DEFAULT 'sale',
        invoice_date DATE NOT NULL,
        due_date DATE,
        status VARCHAR(30) DEFAULT 'unpaid',
        subtotal DECIMAL(12,2) DEFAULT 0,
        payment_status VARCHAR(30) DEFAULT 'unpaid',
        total_amount DECIMAL(12,2) DEFAULT 0,
        total_tax DECIMAL(12,2) DEFAULT 0,
        cgst_total DECIMAL(12,2) DEFAULT 0,
        sgst_total DECIMAL(12,2) DEFAULT 0,
        igst_total DECIMAL(12,2) DEFAULT 0,
        notes VARCHAR(50),
        payment_method VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // -------------------- Invoice Items table --------------------
    await pool.query(`
      CREATE TABLE invoice_items (
      id SERIAL PRIMARY KEY,
      invoice_id INT REFERENCES invoices(id) ON DELETE CASCADE,
      product_id INT REFERENCES products(id) ON DELETE SET NULL,

      product_name VARCHAR(255) NOT NULL,
      hsn VARCHAR(20),
      unit VARCHAR(20),

      quantity INT NOT NULL DEFAULT 1,
      selling_rate DECIMAL(12,2) NOT NULL,

      tax_percent DECIMAL(5,2) DEFAULT 0,
      cgst DECIMAL(12,2) DEFAULT 0,
      sgst DECIMAL(12,2) DEFAULT 0,
      igst DECIMAL(12,2) DEFAULT 0,
      tax_amount DECIMAL(12,2) DEFAULT 0,

      line_total DECIMAL(12,2) NOT NULL
);

    `);

    // -------------------- Indexes for performance --------------------
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);
      CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
    `);

    console.log("All tables created successfully!");
    await pool.end();
  } catch (err) {
    console.error("Error creating tables:", err);
    process.exit(1);
  }
}

createTables();
