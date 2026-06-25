import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import dotenv from "dotenv";
import ErrorHandler from "../helper/error-handler.js";

dotenv.config();

export const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) return next(new ErrorHandler(401, "Unauthorized"));

    const token = authHeader.split(" ")[1];

    if (!token) return next(new ErrorHandler(401, "Unauthorized"));

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
