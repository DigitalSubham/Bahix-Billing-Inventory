import { Response } from "express";

export const handleError = (err: any, res: Response) => {
  const { statusCode = 500, message } = err;

  if (statusCode === 401) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  res.status(statusCode).json({
    status: 500,
    statusCode,
    message,
  });
};
