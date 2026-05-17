import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import mongoose from "mongoose";

import { env } from "./config/env.js";
import { runTokenScan, startTokenScanner } from "./jobs/scanTokens.job.js";
import { alertsRouter } from "./routes/alerts.routes.js";
import { tokensRouter } from "./routes/tokens.routes.js";
import { watchlistRouter } from "./routes/watchlist.routes.js";
import { logger } from "./utils/logger.js";

const MONGO_RETRY_DELAY_MS = 10000;

const app = express();
let scannerStarted = false;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`);
  });

  next();
});

app.get("/api/health", (_req, res) => {
  res.json({
    mongoConnected: mongoose.connection.readyState === 1,
    mongoState: getMongoStateLabel(mongoose.connection.readyState),
    scanIntervalMinutes: env.SCAN_INTERVAL_MINUTES,
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime())
  });
});

app.use("/api/tokens", tokensRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/watchlist", watchlistRouter);

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error("Unhandled application error.", error);
  res.status(500).json({
    message: "Internal server error"
  });
});

const bootstrap = async () => {
  app.listen(env.PORT, () => {
    logger.info(`Crypto Radar backend listening on port ${env.PORT}.`);
  });

  mongoose.connection.on("connected", () => {
    logger.info("Connected to MongoDB.");

    if (!scannerStarted) {
      startTokenScanner();
      scannerStarted = true;
      void runTokenScan("startup");
    }
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected.");
  });

  mongoose.connection.on("error", (error) => {
    logger.error("MongoDB connection error.", error);
  });

  void connectToMongoWithRetry();
};

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Closing MongoDB connection.`);
  await mongoose.connection.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

bootstrap().catch((error) => {
  logger.error("Backend failed to start.", error);
  process.exit(1);
});

async function connectToMongoWithRetry() {
  while (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(env.MONGO_URI, {
        serverSelectionTimeoutMS: 15000
      });
      return;
    } catch (error) {
      logger.error("Initial MongoDB connection failed. Retrying shortly.", error);
      await sleep(MONGO_RETRY_DELAY_MS);
    }
  }
}

function getMongoStateLabel(state: number) {
  switch (state) {
    case 0:
      return "disconnected";
    case 1:
      return "connected";
    case 2:
      return "connecting";
    case 3:
      return "disconnecting";
    default:
      return "unknown";
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
