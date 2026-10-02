import { NextFunction, Request, Response } from "express";
import pool from "../config/db.js";
import { generateInvoiceNumber } from "../utils/invoiceNumber.js";
import ErrorHandler from "../helper/error-handler.js";
import camelize from "camelize";
import { buildPaginationMeta, getPagination } from "../utils/pagination.js";
import { getSearchTerm } from "../utils/search.js";

interface AuthRequest extends Request {
  user?: any;
}

const getInvoiceStatusFilter = (value: unknown): string | undefined => {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (typeof normalized !== "string") {
    return undefined;
  }

  const status = normalized.trim().toLowerCase();
  return ["paid", "pending", "partial", "overdue"].includes(status)
    ? status
    : undefined;
};

const getStringQuery = (value: unknown): string | undefined => {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (typeof normalized !== "string") {
    return undefined;
  }

  const trimmed = normalized.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getNumberQuery = (value: unknown): number | undefined => {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (
    normalized === undefined ||
    normalized === null ||
    normalized === "" ||
    (typeof normalized !== "string" && typeof normalized !== "number")
  ) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getBooleanQuery = (value: unknown): boolean | undefined => {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (typeof normalized === "boolean") {
    return normalized;
  }

  if (typeof normalized !== "string") {
    return undefined;
  }

  if (normalized.toLowerCase() === "true") {
    return true;
  }

  if (normalized.toLowerCase() === "false") {
    return false;
  }

  return undefined;
};

const invoiceStatusSql = `
  CASE
    WHEN inv.payment_status <> 'paid' AND inv.due_date < CURRENT_DATE THEN 'overdue'
    WHEN inv.payment_status = 'unpaid' THEN 'pending'
    ELSE inv.payment_status
  END
`;

const buildInvoiceFilters = (
  query: AuthRequest["query"],
  params: Array<string | number | boolean>,
) => {
  const clauses: string[] = ["inv.user_id = $1"];
  const search = getSearchTerm(query.search);
  const status = getInvoiceStatusFilter(query.status);
  const fromDate = getStringQuery(query.fromDate);
  const toDate = getStringQuery(query.toDate);
  const minAmount = getNumberQuery(query.minAmount);
  const maxAmount = getNumberQuery(query.maxAmount);
  const hasGstin = getBooleanQuery(query.hasGstin);
  const overdue = getBooleanQuery(query.overdue);

  if (status) {
    params.push(status);
    clauses.push(`${invoiceStatusSql} = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    const index = params.length;
    clauses.push(`
      (
        inv.invoice_number ILIKE $${index} OR
        c.name ILIKE $${index} OR
        c.mobile ILIKE $${index} OR
        c.gst_number ILIKE $${index}
      )
    `);
  }

  if (fromDate) {
    params.push(fromDate);
    clauses.push(`inv.invoice_date >= $${params.length}`);
  }

  if (toDate) {
    params.push(toDate);
    clauses.push(`inv.invoice_date <= $${params.length}`);
  }

  if (minAmount !== undefined) {
    params.push(minAmount);
    clauses.push(`inv.total_amount >= $${params.length}`);
  }

  if (maxAmount !== undefined) {
    params.push(maxAmount);
    clauses.push(`inv.total_amount <= $${params.length}`);
  }

  if (hasGstin !== undefined) {
    clauses.push(hasGstin
      ? "c.gst_number IS NOT NULL AND c.gst_number <> ''"
      : "(c.gst_number IS NULL OR c.gst_number = '')");
  }

  if (overdue !== undefined) {
    clauses.push(overdue
      ? "inv.due_date < CURRENT_DATE AND inv.payment_status <> 'paid'"
      : "(inv.due_date IS NULL OR inv.due_date >= CURRENT_DATE OR inv.payment_status = 'paid')");
  }

  return clauses.join(" AND ");
};

export const createInvoice = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      customer_id,
      invoice_type,
      invoice_date,
      due_date,
      payment_status,
      total_amount,
      total_tax,
      cgst_total,
      sgst_total,
      igst_total,
      notes,
      items,
      discount_amnt,
      discount_type,
      received_amount,
      subtotal,
    } = req.body;

    const user_id = req.user.id;

    if (invoice_date && due_date && due_date < invoice_date) {
      throw new ErrorHandler(400, "Due date must be greater than or equal to invoice date");
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new ErrorHandler(400, "Invoice must include at least one item");
    }

    const invoice_number = await generateInvoiceNumber(user_id);

    // 1️⃣ Create invoice
    const invoiceRes = await client.query(
      `
      INSERT INTO invoices 
      (user_id, customer_id, invoice_number, invoice_type, invoice_date, due_date, 
        payment_status, total_amount, total_tax, notes,cgst_total,sgst_total,igst_total,discount_amnt,discount_type,received_amount,subtotal,
        business_category)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
        -- Stamped from the user record rather than the request body: the
        -- category an invoice was issued under is not the client's to choose,
        -- and it must stay fixed if the business switches category later.
        (SELECT COALESCE(business_category, 'GENERAL') FROM users WHERE id = $1))
      RETURNING *;
      `,
      [
        user_id,
        customer_id,
        invoice_number,
        invoice_type,
        invoice_date,
        due_date,
        payment_status,
        total_amount,
        total_tax,
        notes,
        cgst_total,
        sgst_total,
        igst_total,
        discount_amnt ?? null,
        discount_type ?? null,
        received_amount ?? null,
        subtotal,
      ],
    );

    const invoice = invoiceRes.rows[0];

    await client.query(
      "INSERT INTO payments (amount,invoice_id,user_id) VALUES ($1,$2,$3)",
      [received_amount, invoice.id, user_id],
    );

    // 2️⃣ Insert invoice items + Update product stock
    for (const item of items) {
      const {
        product_id,
        product_name,
        quantity,
        selling_rate,
        line_total,
        tax_percent,
        tax_amount,
        cgst,
        sgst,
        igst,
        hsn,
        unit,
        mrp,
        batch_no,
        exp_date,
        mfg_by,
        free_qty,
        discount_percent,
        discount_amount,
        taxable_amount,
      } = item;

      // Insert invoice item
      await client.query(
        `
        INSERT INTO invoice_items 
        (invoice_id,product_id, product_name, quantity, selling_rate, line_total, tax_percent, tax_amount,cgst,sgst,igst,
         hsn, unit, mrp, batch_no, exp_date, mfg_by, free_qty, discount_percent, discount_amount, taxable_amount)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
        `,
        [
          invoice.id,
          product_id,
          product_name,
          quantity,
          selling_rate,
          line_total,
          tax_percent,
          tax_amount,
          cgst,
          sgst,
          igst,
          hsn ?? null,
          unit ?? null,
          mrp ?? null,
          batch_no ?? null,
          exp_date ?? null,
          mfg_by ?? null,
          free_qty ?? 0,
          discount_percent ?? 0,
          discount_amount ?? 0,
          taxable_amount ?? null,
        ],
      );

      // 3️⃣ Update product stock.
      // Free goods leave inventory too, so both quantities are deducted.
      const stockToDeduct = (Number(quantity) || 0) + (Number(free_qty) || 0);

      const updateRes = await client.query(
        `
        UPDATE products
        SET stock = stock - $1
        WHERE id = $2
          AND user_id = $3
          AND COALESCE(stock, 0) >= $1
        RETURNING stock;
        `,
        [stockToDeduct, product_id, user_id],
      );

      if (updateRes.rowCount === 0) {
        const productRes = await client.query(
          "SELECT COALESCE(stock, 0) AS stock FROM products WHERE id = $1 AND user_id = $2",
          [product_id, user_id],
        );

        if (!productRes.rows[0]) {
          throw new ErrorHandler(400, `Product ${product_name} was not found`);
        }

        throw new ErrorHandler(
          400,
          `Insufficient stock for ${product_name}. Required: ${stockToDeduct}, available: ${productRes.rows[0].stock}`,
        );
      }
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Invoice created successfully",
      data: invoice,
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error(err);
    throw new ErrorHandler(
      err.statusCode ?? 500,
      err.message ?? "Internal Server Error",
    );
  } finally {
    client.release();
  }
};

export const getInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user.id;
    const pagination = getPagination(req.query.page, req.query.limit);
    const countParams: Array<string | number | boolean> = [user_id];
    const countWhere = buildInvoiceFilters(req.query, countParams);
    let countQuery = `
      SELECT COUNT(DISTINCT inv.id)::int AS total
      FROM invoices inv
      LEFT JOIN customers c ON inv.customer_id = c.id
      WHERE ${countWhere}
    `;

    const countResult = await pool.query(
      countQuery,
      countParams,
    );
    const total = countResult.rows[0]?.total ?? 0;
    const params: Array<string | number | boolean> = [user_id];
    const where = buildInvoiceFilters(req.query, params);

    let query = `
      SELECT 
        inv.id,
        inv.invoice_number,
        inv.invoice_type,
        inv.invoice_date,
        inv.due_date,
        inv.payment_status,
        ${invoiceStatusSql} AS status,
        inv.total_amount,
        inv.received_amount,
        inv.total_tax,
        inv.notes,
        inv.created_at,
        inv.cgst_total,
        inv.sgst_total,
        inv.igst_total,
        inv.subtotal,
        inv.discount_amnt AS discount_Amount,
        inv.discount_type AS discount_Type,
        inv.business_category,

        -- Customer full details
        json_build_object(
          'id', c.id,
          'name', c.name,
          'email', c.email,
          'mobile', c.mobile,
          'address', c.address,
          'state', c.state,
          'gst_number', c.gst_number,
          'notes', c.notes
        ) AS customer,

        -- Invoice items as JSON array
        COALESCE(
          json_agg(
            json_build_object(
              'id', ii.id,
              'product_id', ii.product_id,
              'mrp', COALESCE(ii.mrp, p.mrp),
              'productName', ii.product_name,
              'quantity', ii.quantity,
              'selling_rate', ii.selling_rate,
              'amount', ii.line_total,
              'taxRate', ii.tax_percent,
              'tax_amount', ii.tax_amount,
              'hsn_code', COALESCE(ii.hsn, p.hsn_code),
              'unit', COALESCE(ii.unit, p.unit),
              'batch_no', ii.batch_no,
              'exp_date', ii.exp_date,
              'mfg_by', ii.mfg_by,
              'free_qty', COALESCE(ii.free_qty, 0),
              'discount_percent', COALESCE(ii.discount_percent, 0),
              'discount_amount', COALESCE(ii.discount_amount, 0),
              'taxable_amount', ii.taxable_amount
            )
          ) FILTER (WHERE ii.id IS NOT NULL),
          '[]'
        ) AS items

      FROM invoices inv
      LEFT JOIN customers c ON inv.customer_id = c.id
      LEFT JOIN invoice_items ii ON inv.id = ii.invoice_id
      LEFT JOIN products p 
        ON ii.product_id = p.id 
      WHERE ${where}
    `;

    query += `
      GROUP BY inv.id, c.id
      ORDER BY inv.invoice_date DESC, inv.created_at DESC, inv.id DESC
    `;

    params.push(pagination.limit, pagination.offset);
    const limitIndex = params.length - 1;
    const offsetIndex = params.length;
    query += ` LIMIT $${limitIndex} OFFSET $${offsetIndex}`;

    const result = await pool.query(query, params);
    const items = camelize(result.rows);

    res.json({
      items,
      meta: buildPaginationMeta(total, pagination.page, pagination.limit),
    });
  } catch (err: any) {
    console.error(err);
    throw new ErrorHandler(
      err.statusCode ?? 500,
      err.message ?? "Internal Server Error",
    );
  }
};

export const getInvoiceById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const invoiceRes = await pool.query(
      "SELECT * FROM invoices WHERE id=$1 AND user_id=$2",
      [id, user_id],
    );
    if (!invoiceRes.rows[0])
      return res.status(404).json({ message: "Not found" });

    const itemsRes = await pool.query(
      "SELECT * FROM invoice_items WHERE invoice_id=$1",
      [id],
    );

    res.json(
      camelize({ ...invoiceRes.rows[0], items: itemsRes.rows }),
    );
  } catch (err: any) {
    console.error(err);
    throw new ErrorHandler(
      err.statusCode ?? 500,
      err.message ?? "Internal Server Error",
    );
  }
};

export const deleteInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const result = await pool.query(
      "DELETE FROM invoices WHERE id=$1 AND user_id=$2 RETURNING *",
      [id, user_id],
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Not found" });

    res.json({ message: "Deleted successfully" });
  } catch (err: any) {
    console.error(err);
    throw new ErrorHandler(
      err.statusCode ?? 500,
      err.message ?? "Internal Server Error",
    );
  }
};

export const addPaymentsForInvoice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { amount, invoiceId, salesmanId } = req.body;
    const user_id = req.user.id;
    await pool.query(
      "INSERT INTO payments (amount,invoice_id,user_id,added_by) VALUES ($1,$2,$3,$4)",
      [amount, invoiceId, user_id, salesmanId],
    );

    res.status(200).json({ message: "Payment Added Successfully" });
  } catch (err: any) {
    console.error(err);
    throw new ErrorHandler(
      err.statusCode ?? 500,
      err.message ?? "Internal Server Error",
    );
  }
};
