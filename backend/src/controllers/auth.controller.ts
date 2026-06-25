import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import dotenv from "dotenv";
import pool from "../config/db.js";
import { updateProfileSchema } from "../validators/user.schema.js";
import { updateProfileService } from "../services/user.service.js";
import ErrorHandler from "../helper/error-handler.js";
dotenv.config();

interface AuthRequest extends Request {
  user?: any;
}
// Type for request body
interface RegisterBody {
  name: string;
  email: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

// REGISTER
export const register = async (
  req: Request<{}, {}, RegisterBody>,
  res: Response,
) => {
  try {
    const { email, password } = req.body;

    // check if user exists
    const checkUser = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkUser.rows.length > 0) {
      throw new ErrorHandler(500, "User Already Exists, Try logging In");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users ( email, password) VALUES ($1, $2) RETURNING id, email",
      [email, hashedPassword],
    );

    res.status(201).json({
      message: "User registered successfully",
      user: result.rows[0],
    });
  } catch (error: any) {
    console.error(error);

    if (error instanceof ErrorHandler) {
      throw error;
    }

    throw new ErrorHandler(
      error.statusCode ?? 500,
      error.message ?? "Internal Server Error",
    );
  }
};

// LOGIN
export const login = async (req: Request<{}, {}, LoginBody>, res: Response) => {
  try {
    const { email, password } = req.body;

    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );
    if (userResult.rows.length === 0) {
      throw new ErrorHandler(500, "No Account Found, Try Singup");
    }

    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new ErrorHandler(500, "Invalid Credentials");
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" },
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error(error);

    if (error instanceof ErrorHandler) {
      throw error;
    }

    throw new ErrorHandler(
      error.statusCode ?? 500,
      error.message ?? "Internal Server Error",
    );
  }
};

// GET /api/users/profile
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user.id;

    // Fetch user basic info
    const userRes = await pool.query(
      `SELECT id, name, email, mobile, address, gst_number, pan_number, role, is_active, created_at
       FROM users WHERE id=$1`,
      [user_id],
    );

    if (!userRes.rows[0]) throw new ErrorHandler(400, "User not found");
    const user = userRes.rows[0];

    // Optional: fetch primary payment info
    const paymentRes = await pool.query(
      `SELECT id, ifsc, account_no, bank, payment_type, upi_id, is_primary, currency, created_at
       FROM user_payments WHERE user_id=$1`,
      [user_id],
    );

    const profile = {
      ...user,
      ...paymentRes.rows[0],
    };

    res.json(profile);
  } catch (error: any) {
    console.error(error);

    if (error instanceof ErrorHandler) {
      throw error;
    }

    throw new ErrorHandler(
      error.statusCode ?? 500,
      error.message ?? "Internal Server Error",
    );
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    const payload = updateProfileSchema.parse(req.body);

    const user = await updateProfileService(userId, payload);

    res.json({ success: true, user });
  } catch (err: any) {
    console.error(err);
    if (err.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: err.errors[0].message,
      });
    }

    throw new ErrorHandler(
      err.statusCode ?? 500,
      err.message ?? "Internal Server Error",
    );
  }
};
