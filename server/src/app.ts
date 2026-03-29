import express, { NextFunction, Request, Response } from "express";
import cors from "cors";

import authRoutes from "./routes/auth";
import seedRoutes from "./routes/seed";
import trustRoutes from "./routes/trust";
import paymentRoutes from "./routes/payments";
import podRoutes from "./routes/pods";
import statsRoutes from "./routes/stats";
import cronRoutes from "./routes/cron";

/**
 * Creates and returns a configured Express app without connecting to MongoDB
 * or starting a listener. Keeping this separate from index.ts lets test files
 * import the app, bind it to an ephemeral port, and run HTTP-level assertions
 * against an in-memory database.
 */
export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      credentials: true, // required for HttpOnly refresh token cookie
    }),
  );

  // Request logger — logs every request with method, path, status, and duration
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const ms = Date.now() - start;
      const line = `[${req.method}] ${req.originalUrl} -> ${res.statusCode} ${res.statusMessage ?? ""} (${ms}ms)`;
      if (res.statusCode >= 500) console.error(line);
      else if (res.statusCode >= 400) console.warn(line);
      else console.info(line);
    });
    next();
  });

  app.use(express.json());

  app.use("/auth", authRoutes);
  app.use("/api/pods", podRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/seed", seedRoutes);
  app.use("/api/trust", trustRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/cron", cronRoutes);

  app.get("/", (_req, res) =>
    res.json({
      name: "AjoFlow API",
      description:
        "AI-powered digital ROSCA platform — trustless wallets and AI-based trust scoring",
      version: "1.0.0",
      health: "/health",
      docs: "https://github.com/amjedidiah/enyata_interswitch_hackathon",
      endpoints: {
        auth: "/auth",
        pods: "/api/pods",
        payments: "/api/payments",
        stats: "/api/stats",
        trust: "/api/trust",
      },
    }),
  );

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Global error handler
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error(
      `[${req.method} ${req.originalUrl}] Unhandled error: ${err.message}`,
    );
    if (process.env.NODE_ENV !== "production") console.error(err.stack);
    res.status(500).json({ error: err.message || "Internal server error" });
  });

  return app;
}
