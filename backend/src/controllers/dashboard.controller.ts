import { Request, Response } from "express";
import pool from "../config/db.js";
import ErrorHandler from "../helper/error-handler.js";

interface AuthRequest extends Request {
  user?: any;
}

const toNumber = (value: unknown) => Number(value ?? 0) || 0;

export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user.id;

    // 1️⃣ Dashboard statistics (ONE DB CALL)
    const statsRes = await pool.query(
      `
      SELECT
        (SELECT COUNT(*) FROM customers WHERE user_id = $1) AS "totalCustomers",
        (SELECT COUNT(*) FROM products  WHERE user_id = $1) AS "totalProducts",
        (SELECT COUNT(*) FROM invoices  WHERE user_id = $1) AS "totalInvoices",
        (SELECT COUNT(*) FROM invoices  WHERE user_id = $1 AND payment_status = 'paid')
          AS "totalPaidInvoices",
        (SELECT COUNT(*) FROM invoices  WHERE user_id = $1 AND payment_status = 'unpaid')
          AS "totalUnpaidInvoices",
        (SELECT COUNT(*) FROM invoices  WHERE user_id = $1 AND invoice_date = CURRENT_DATE)
          AS "invoicesToday",
        (SELECT COALESCE(SUM(total_amount), 0)
         FROM invoices
         WHERE user_id = $1)
          AS "totalRevenue",
        (SELECT COALESCE(SUM(total_amount), 0)
          FROM invoices
          WHERE user_id = $1 AND invoice_date = CURRENT_DATE)
          AS "revenueToday",
        (SELECT COALESCE(SUM(total_amount), 0)
          FROM invoices
          WHERE user_id = $1 AND invoice_date >= CURRENT_DATE - INTERVAL '7 days')
          AS "revenueLast7Days",
          (SELECT COALESCE(SUM(total_amount), 0)
          FROM invoices
          WHERE user_id = $1 AND invoice_date >= CURRENT_DATE - INTERVAL '30 days')
          AS "revenueLast30Days"
      `,
      [user_id],
    );

    const stats = statsRes.rows[0] ?? {};

    res.status(200).json({
      ...stats,
      totalRevenue: toNumber(stats.totalRevenue),
      revenueToday: toNumber(stats.revenueToday),
      revenueLast7Days: toNumber(stats.revenueLast7Days),
      revenueLast30Days: toNumber(stats.revenueLast30Days),
      totalInvoices: toNumber(stats.totalInvoices),
      invoicesToday: toNumber(stats.invoicesToday),
      totalProducts: toNumber(stats.totalProducts),
      totalCustomers: toNumber(stats.totalCustomers),
    });
  } catch (err: any) {
    console.error("Dashboard error:", err);
    throw new ErrorHandler(
      err.statusCode ?? 500,
      err.message ?? "Internal Server Error",
    );
  }
};

export const dropDown = async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    const user_id = req.user.id;
    if (code === "ROLE") {
      const data = await pool.query(
        "SELECT id,name FROM role WHERE is_active IS TRUE",
      );
      res.status(200).json({ message: "Success", data: data.rows });
    }
    if (code === "PRODUCTS") {
      const data = await pool.query(
        "SELECT * FROM products WHERE user_id = $1 AND is_active IS NOT FALSE",
        [user_id],
      );
      res.status(200).json({ message: "Success", data: data.rows });
    }
    if (code === "CUSTOMERS") {
      const data = await pool.query(
        "SELECT * FROM customers WHERE user_id = $1 AND is_active IS NOT FALSE",
        [user_id],
      );
      res.status(200).json({ message: "Success", data: data.rows });
    }
  } catch (err: any) {
    console.error(err);
    throw new ErrorHandler(
      err.statusCode ?? 500,
      err.message ?? "Internal Server Error",
    );
  }
};
