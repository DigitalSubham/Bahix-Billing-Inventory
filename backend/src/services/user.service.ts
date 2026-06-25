import pool from "../config/db.js";
import { clean } from "../utils/clean.js";
import ErrorHandler from "../helper/error-handler.js";

export const updateUserDB = async (client: any, userId: number, data: any) => {
  return client.query(
    `
    UPDATE users
    SET
      name = COALESCE($1, name),
      address = COALESCE($2, address),
      mobile = COALESCE($3, mobile),
      email = COALESCE($4, email),
      gst_number = COALESCE($5, gst_number),
      pan_number = COALESCE($6, pan_number)
    WHERE id = $7
    RETURNING id, name, email, mobile, address, gst_number, pan_number;
    `,
    [
      data.name,
      data.address,
      data.mobile,
      data.email,
      data.gst_number,
      data.pan_number,
      userId,
    ]
  );
};

/* ---------------- PAYMENT MANUAL UPSERT ---------------- */
export const upsertUserPaymentDB = async (
  client: any,
  userId: number,
  data: any
) => {
  const existing = await client.query(
    `SELECT id FROM user_payments WHERE user_id = $1`,
    [userId]
  );

  if (existing.rowCount > 0) {
    return client.query(
      `
      UPDATE user_payments
      SET bank=$1, account_no=$2, ifsc=$3, upi_id=$4
      WHERE user_id=$5
      RETURNING bank, account_no, ifsc, upi_id;
      `,
      [data.bank, data.account_no, data.ifsc, data.upi_id, userId]
    );
  } else {
    return client.query(
      `
      INSERT INTO user_payments (user_id, bank, account_no, ifsc, upi_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING bank, account_no, ifsc, upi_id;
      `,
      [userId, data.bank, data.account_no, data.ifsc, data.upi_id]
    );
  }
};

/* ---------------- CHECK USER UNIQUE ---------------- */
export const checkUserUnique = async (
  client: any,
  data: any,
  userId: number
) => {
  const result = await client.query(
    `
    SELECT
      CASE 
        WHEN email = $1 THEN 'email'
        WHEN mobile = $2 THEN 'mobile'
        WHEN gst_number = $3 THEN 'gst_number'
        WHEN pan_number = $4 THEN 'pan_number'
      END AS field
    FROM users
    WHERE (email=$1 OR mobile=$2 OR gst_number=$3 OR pan_number=$4)
      AND id <> $5
    `,
    [data.email, data.mobile, data.gst_number, data.pan_number, userId]
  );
  return result.rows.map((r: any) => r.field).filter(Boolean);
};

/* ---------------- CHECK PAYMENT UNIQUE ---------------- */
export const checkPaymentUnique = async (
  client: any,
  accountNo: string,
  userId: number
) => {
  if (!accountNo) return [];
  const result = await client.query(
    `SELECT id FROM user_payments WHERE account_no=$1 AND user_id<>$2 LIMIT 1`,
    [accountNo, userId]
  );
  return result.rowCount > 0 ? ["account_no"] : [];
};

export const updateProfileService = async (userId: number, payload: any) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const data = Object.fromEntries(
      Object.entries(payload).map(([k, v]) => [k, clean(v)])
    );

    console.log("null", data);

    // --- check user uniqueness ---
    const conflicts = await checkUserUnique(client, data, userId);
    if (conflicts.length > 0)
      throw new ErrorHandler(409, `${conflicts.join(", ")} already exists`);
    // --- check payment uniqueness ---
    const paymentConflict = await checkPaymentUnique(
      client,
      data.account_no,
      userId
    );
    if (paymentConflict.length > 0)
      throw new ErrorHandler(409, "Account number already exists");

    // --- update user ---
    const user = await updateUserDB(client, userId, data);
    if (user.rowCount === 0)
      throw new ErrorHandler(409, "No Account Found Try signup");

    // --- upsert payment ---
    let payment = null;
    if (data.bank || data.account_no || data.ifsc || data.upi_id) {
      payment = await upsertUserPaymentDB(client, userId, data);
    }

    await client.query("COMMIT");

    return {
      user: user.rows[0],
      finance: payment ? payment.rows[0] : null,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
