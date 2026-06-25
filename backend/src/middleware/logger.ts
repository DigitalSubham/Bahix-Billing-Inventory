// logger.ts
import { Request, Response, NextFunction } from "express";

export function logger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  const requestLog = {
    type: "request",
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    query: req.query,
    params: req.params,
    body: req.body,
  };

  console.log(JSON.stringify(requestLog));

  const originalSend = res.send.bind(res);

  res.send = (body?: any): Response => {
    const durationMs = Date.now() - startTime;

    const responseLog = {
      type: "response",
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      headers: res.getHeaders(),
      body,
    };

    console.log("LOGGER", JSON.stringify(responseLog));

    return originalSend(body);
  };

  next();
}
