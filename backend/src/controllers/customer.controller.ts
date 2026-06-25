import { NextFunction, Request, Response } from "express";
import pool from "../config/db.js";
import { clean } from "../utils/clean.js";
import ErrorHandler from "../helper/error-handler.js";
import { buildPaginationMeta, getPagination } from "../utils/pagination.js";
import { getSearchTerm } from "../utils/search.js";

interface AuthRequest extends Request {
  user?: any;
}

export const createCustomer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, email, mobile, address, state, gst_number } = req.body;
    if (!name && !mobile) {
      return next(new ErrorHandler(500, "Name and mobile are required"));
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return next(new ErrorHandler(500, "Invalid Email Format"));
    }
    if (mobile && !/^\d{10}$/.test(mobile)) {
      return next(new ErrorHandler(500, "Invalid Mobile Number"));
    }
    const user_id = req.user.id;

    let existingCustomer;

    if (email) {
      existingCustomer = await pool.query(
        `
    SELECT 1
    FROM customers
    WHERE user_id = $1
      AND (email = $2 OR mobile = $3)
    `,
        [user_id, email, mobile],
      );
    } else {
      existingCustomer = await pool.query(
        `
    SELECT 1
    FROM customers
    WHERE user_id = $1
      AND mobile = $2
    `,
        [user_id, mobile],
      );
    }

    if (existingCustomer.rows.length > 0) {
      return next(
        new ErrorHandler(409, "Customer already exists with this mobile no."),
      );
    }

    const result = await pool.query(
      `INSERT INTO customers (user_id,name,email,mobile,address,state,gst_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [user_id, name, email, mobile, address, state, gst_number],
    );

    res
      .status(201)
      .json({ message: "Customer Added successfully", data: result.rows[0] });
  } catch (err: any) {
    console.error(err);
    throw new ErrorHandler(
      err.statusCode ?? 500,
      err.message ?? "Internal Server Error",
    );
  }
};

export const getCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user.id;
    const pagination = getPagination(req.query.page, req.query.limit);
    const search = getSearchTerm(req.query.search);
    const searchValue = search ? `%${search}%` : undefined;

    const countParams: Array<string | number> = [user_id];
    let countQuery = "SELECT COUNT(*)::int AS total FROM customers WHERE user_id = $1";

    if (searchValue) {
      countParams.push(searchValue);
      countQuery += `
        AND (
          name ILIKE $2 OR
          email ILIKE $2 OR
          mobile ILIKE $2 OR
          gst_number ILIKE $2 OR
          address ILIKE $2
        )
      `;
    }

    const countResult = await pool.query(
      countQuery,
      countParams,
    );
    const total = countResult.rows[0]?.total ?? 0;
    const params: Array<string | number> = [user_id];

    let query = `
      SELECT
        cs.*,
        SUM(invoices.total_amount) AS "totalAmount",
        SUM(invoices.received_amount) AS "receivedAmount",
        SUM(invoices.total_amount) - SUM(invoices.received_amount) AS "pendingAmount"
      FROM customers cs
      LEFT JOIN invoices ON cs.id = invoices.customer_id
      WHERE cs.user_id = $1
    `;

    if (searchValue) {
      params.push(searchValue);
      query += `
        AND (
          cs.name ILIKE $2 OR
          cs.email ILIKE $2 OR
          cs.mobile ILIKE $2 OR
          cs.gst_number ILIKE $2 OR
          cs.address ILIKE $2
        )
      `;
    }

    query += `
      GROUP BY cs.id
      ORDER BY cs.created_at DESC, cs.id DESC
    `;

    if (pagination.enabled) {
      params.push(pagination.limit, pagination.offset);
      const limitIndex = searchValue ? 3 : 2;
      const offsetIndex = searchValue ? 4 : 3;
      query += ` LIMIT $${limitIndex} OFFSET $${offsetIndex}`;
    }

    const result = await pool.query(query, params);
    const data = result.rows.map((customer) => ({
      customerType: customer.customer_type,
      ...customer,
    }));

    if (!pagination.enabled) {
      return res.json(data);
    }

    res.json({
      data,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    });
  } catch (err: any) {
    console.error(err);
    throw new ErrorHandler(
      err.statusCode ?? 500,
      err.message ?? "Internal Server Error",
    );
  }
};

export const getCustomerById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const result = await pool.query(
      "SELECT * FROM customers WHERE id=$1 AND user_id=$2",
      [id, user_id],
    );
    const data = result.rows.map((customer) => ({
      customerType: customer.customer_type,
      ...customer,
    }));
    if (!result.rows[0]) return res.status(404).json({ message: "Not found" });

    res.json(data[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const {
      name,
      email,
      mobile,
      address,
      state,
      gst_number,
      city,
      pincode,
      customerType,
    } = Object.fromEntries(
      Object.entries(req.body).map(([k, v]) => [k, clean(v)]),
    );

    const result = await pool.query(
      `UPDATE customers SET name=$1,email=$2,mobile=$3,address=$4,state=$5,gst_number=$6,city=$7,pincode=$8,customer_type=$9
       WHERE id=$10 AND user_id=$11 RETURNING *`,
      [
        name,
        email,
        mobile,
        address,
        state,
        gst_number,
        city,
        pincode,
        customerType,
        id,
        user_id,
      ],
    );

    if (!result.rows[0]) return res.status(404).json({ message: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const result = await pool.query(
      "DELETE FROM customers WHERE id=$1 AND user_id=$2 RETURNING *",
      [id, user_id],
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Not found" });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
