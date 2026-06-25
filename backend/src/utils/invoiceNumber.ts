import pool from "../config/db.js";

export async function generateInvoiceNumber(userId: number) {
  const now = new Date();
  const fyStart =
    now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

  const fy = `${fyStart}-${String(fyStart + 1).slice(-2)}`;

  const result = await pool.query(
    `
    SELECT invoice_number
    FROM invoices
    WHERE user_id = $1
      AND invoice_number LIKE $2
    ORDER BY id DESC
    LIMIT 1
    `,
    [userId, `INV-${fy}-%`]
  );

  let next = 1;

  if (result.rows.length > 0) {
    const last = result.rows[0].invoice_number;
    next = parseInt(last.split("-").pop()!) + 1;
  }

  return `INV-${fy}-${String(next).padStart(4, "0")}`;
}
