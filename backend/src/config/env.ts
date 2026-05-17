import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  TELEGRAM_BOT_TOKEN: z.string().default(""),
  TELEGRAM_CHAT_ID: z.string().default(""),
  SCAN_INTERVAL_MINUTES: z.coerce.number().int().positive().default(5),
  MIN_ALERT_SCORE: z.coerce.number().int().min(0).max(100).default(70),
  MIN_LIQUIDITY_USD: z.coerce.number().nonnegative().default(50000),
  MIN_VOLUME_24H_USD: z.coerce.number().nonnegative().default(100000)
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Invalid environment variables: ${parsedEnv.error.message}`);
}

export const env = parsedEnv.data;
export const telegramAlertsEnabled = Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);
