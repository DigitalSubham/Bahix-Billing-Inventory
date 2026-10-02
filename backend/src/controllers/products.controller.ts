import { Request, Response } from "express";
import pool from "../config/db.js";
import ErrorHandler from "../helper/error-handler.js";
import { buildPaginationMeta, getPagination } from "../utils/pagination.js";
import { getSearchTerm } from "../utils/search.js";

interface AuthRequest extends Request {
  user?: any;
}

const PRODUCT_FIELDS = `
  id,
  name,
  description,
  mrp,
  selling_rate,
  category,
  COALESCE(stock, 0) AS stock,
  sku,
  COALESCE(NULLIF(unit, ''), 'PCS') AS unit,
  tax_percent,
  COALESCE(NULLIF(base_unit, ''), NULLIF(unit, ''), 'PCS') AS base_unit,
  conversion_factor,
  unit_type,
  min_stock,
  hsn_code,
  batch_no,
  exp_date,
  mfg_by
`;

const PRODUCT_SORT_COLUMNS = {
  name: "name",
  stock: "stock",
  selling_rate: "selling_rate",
  mrp: "mrp",
} as const;

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

const productResponse = (product: any) => ({
  id: product.id,
  name: product.name,
  description: product.description,
  mrp: product.mrp,
  selling_rate: product.selling_rate,
  category: product.category,
  stock: Number(product.stock ?? 0),
  sku: product.sku,
  unit: product.unit ?? "PCS",
  tax_percent: product.tax_percent,
  base_unit: product.base_unit ?? product.unit ?? "PCS",
  conversion_factor: product.conversion_factor,
  unit_type: product.unit_type,
  min_stock: product.min_stock,
  hsn_code: product.hsn_code,
  batch_no: product.batch_no,
  exp_date: product.exp_date,
  mfg_by: product.mfg_by,
});

const buildProductFilters = (
  query: AuthRequest["query"],
  params: Array<string | number>,
) => {
  const clauses: string[] = ["user_id = $1"];
  const search = getSearchTerm(query.search);
  const category = getStringQuery(query.category);
  const stockStatus = getStringQuery(query.stockStatus);
  const gstRate = getNumberQuery(query.gstRate);
  const minPrice = getNumberQuery(query.minPrice);
  const maxPrice = getNumberQuery(query.maxPrice);

  if (search) {
    params.push(`%${search}%`);
    const index = params.length;
    clauses.push(`
      (
        name ILIKE $${index} OR
        description ILIKE $${index} OR
        sku ILIKE $${index} OR
        hsn_code ILIKE $${index}
      )
    `);
  }

  if (category) {
    params.push(category);
    clauses.push(`category = $${params.length}`);
  }

  if (gstRate !== undefined) {
    params.push(gstRate);
    clauses.push(`tax_percent = $${params.length}`);
  }

  if (minPrice !== undefined) {
    params.push(minPrice);
    clauses.push(`selling_rate >= $${params.length}`);
  }

  if (maxPrice !== undefined) {
    params.push(maxPrice);
    clauses.push(`selling_rate <= $${params.length}`);
  }

  if (stockStatus === "out_of_stock") {
    clauses.push("COALESCE(stock, 0) <= 0");
  }

  if (stockStatus === "low_stock") {
    clauses.push("COALESCE(stock, 0) > 0 AND COALESCE(stock, 0) <= COALESCE(min_stock, 0)");
  }

  if (stockStatus === "in_stock") {
    clauses.push("(COALESCE(stock, 0) > COALESCE(min_stock, 0) OR COALESCE(min_stock, 0) = 0)");
  }

  return clauses.join(" AND ");
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      selling_rate,
      mrp,
      category,
      stock,
      sku,
      unit,
      base_Unit,
      base_unit,
      conversion_factor,
      unit_type,
      tax_percent,
      min_stock,
      hsn_code,
      batch_no,
      exp_date,
      mfg_by,
    } = req.body;
    const user_id = req.user.id;
    const normalizedUnit = unit || "PCS";
    const normalizedBaseUnit = base_unit || base_Unit || normalizedUnit;

    const result = await pool.query(
      `INSERT INTO products (user_id,name,description,selling_rate,stock,sku,unit,tax_percent,mrp,category,base_unit,conversion_factor,unit_type,min_stock,hsn_code,batch_no,exp_date,mfg_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING ${PRODUCT_FIELDS}`,
      [
        user_id,
        name,
        description,
        selling_rate,
        stock ?? 0,
        sku,
        normalizedUnit,
        tax_percent,
        mrp,
        category,
        normalizedBaseUnit,
        conversion_factor,
        unit_type,
        min_stock,
        hsn_code,
        batch_no,
        exp_date,
        mfg_by,
      ],
    );

    res.status(201).json({
      message: "Product created successfully",
      product: productResponse(result.rows[0]),
    });
  } catch (err: any) {
    console.error(err);
    throw new ErrorHandler(
      err.statusCode ?? 500,
      err.message ?? "Internal Server Error",
    );
  }
};

export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user.id;
    const pagination = getPagination(req.query.page, req.query.limit);
    const countParams: Array<string | number> = [user_id];
    const countWhere = buildProductFilters(req.query, countParams);
    const countQuery = `SELECT COUNT(*)::int AS total FROM products WHERE ${countWhere}`;

    const countResult = await pool.query(
      countQuery,
      countParams,
    );
    const total = countResult.rows[0]?.total ?? 0;
    const params: Array<string | number> = [user_id];
    const where = buildProductFilters(req.query, params);
    const requestedSortBy = getStringQuery(req.query.sortBy);
    const sortBy = requestedSortBy && requestedSortBy in PRODUCT_SORT_COLUMNS
      ? PRODUCT_SORT_COLUMNS[requestedSortBy as keyof typeof PRODUCT_SORT_COLUMNS]
      : "created_at";
    const sortOrder = getStringQuery(req.query.sortOrder)?.toLowerCase() === "asc" ? "ASC" : "DESC";

    let query = `SELECT ${PRODUCT_FIELDS} FROM products WHERE ${where}`;
    query += ` ORDER BY ${sortBy} ${sortOrder}, id DESC`;

    params.push(pagination.limit, pagination.offset);
    const limitIndex = params.length - 1;
    const offsetIndex = params.length;
    query += ` LIMIT $${limitIndex} OFFSET $${offsetIndex}`;

    const result = await pool.query(query, params);
    const items = result.rows.map(productResponse);

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

export const getProductById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const result = await pool.query(
      `SELECT ${PRODUCT_FIELDS} FROM products WHERE id=$1 AND user_id=$2`,
      [id, user_id],
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Not found" });
    res.json(productResponse(result.rows[0]));
  } catch (err: any) {
    console.error(err);
    throw new ErrorHandler(
      err.statusCode ?? 500,
      err.message ?? "Internal Server Error",
    );
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      selling_rate,
      stock,
      sku,
      unit,
      tax_percent,
      mrp,
      category,
      is_active,
      unit_type,
      base_unit,
      base_Unit,
      conversion_factor,
      min_stock,
      hsn_code,
      batch_no,
      exp_date,
      mfg_by,
    } = req.body;
    const user_id = req.user.id;
    const normalizedUnit = unit ?? null;
    const normalizedBaseUnit = base_unit ?? base_Unit ?? unit ?? null;

    const result = await pool.query(
      `
      UPDATE products
      SET
        name=COALESCE($1, name),
        description=COALESCE($2, description),
        selling_rate=COALESCE($3, selling_rate),
        stock=COALESCE($4, stock, 0),
        sku=COALESCE($5, sku),
        unit=COALESCE($6, NULLIF(unit, ''), 'PCS'),
        tax_percent=COALESCE($7, tax_percent),
        mrp=COALESCE($8, mrp),
        category=COALESCE($9, category),
        is_active=COALESCE($10, is_active, true),
        base_unit=COALESCE($11, NULLIF(base_unit, ''), $6, NULLIF(unit, ''), 'PCS'),
        conversion_factor=COALESCE($12, conversion_factor),
        unit_type=COALESCE($13, unit_type),
        min_stock=COALESCE($14, min_stock),
        hsn_code=COALESCE($15, hsn_code),
        batch_no=COALESCE($16, batch_no),
        exp_date=COALESCE($17, exp_date),
        mfg_by=COALESCE($18, mfg_by)
      WHERE id=$19 AND user_id=$20
      RETURNING ${PRODUCT_FIELDS}
      `,
      [
        name,
        description,
        selling_rate,
        stock,
        sku,
        normalizedUnit,
        tax_percent,
        mrp,
        category,
        is_active,
        normalizedBaseUnit,
        conversion_factor,
        unit_type,
        min_stock,
        hsn_code,
        batch_no,
        exp_date,
        mfg_by,
        id,
        user_id,
      ],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(productResponse(result.rows[0]));
  } catch (err: any) {
    console.error(err);
    throw new ErrorHandler(
      err.statusCode ?? 500,
      err.message ?? "Internal Server Error",
    );
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const result = await pool.query(
      "DELETE FROM products WHERE id=$1 AND user_id=$2 RETURNING *",
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
