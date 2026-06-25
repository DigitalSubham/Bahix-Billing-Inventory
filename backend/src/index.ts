import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db.js";

import ServerlessHttp from "serverless-http";
import { handleError, logger } from "./middleware/index.js";
import { v1 } from "./routes/index.js";

dotenv.config();

const app = express();

app
  .use(express.json({ limit: "10mb" }))
  .use(cors())
  .use(logger)
  .use("/api", v1);

app.get("/", (req, res) => {
  res.json({ message: "Hello, BillBook Backend is running! v1.0.3" });
});

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        count(*) AS total_connections,
        sum(CASE WHEN state = 'active' THEN 1 ELSE 0 END) AS active_connections,
        sum(CASE WHEN state = 'idle' THEN 1 ELSE 0 END) AS idle_connections
      FROM pg_stat_activity;
    `);
    res.json({ status: "connected", time: result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  handleError(err, res);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export const handler = ServerlessHttp(app);
