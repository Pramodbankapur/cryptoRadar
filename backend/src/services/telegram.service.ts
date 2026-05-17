import axios from "axios";

import { env, telegramAlertsEnabled } from "../config/env.js";
import { logger } from "../utils/logger.js";

const TELEGRAM_TEXT_LIMIT = 4096;

export interface TelegramAlertInput {
  chainId: string;
  dexscreenerUrl: string;
  liquidityUsd: number;
  name: string;
  priceChange24h: number;
  priceUsd: number;
  riskFlags: string[];
  score: number;
  symbol: string;
  volume24h: number;
}

const formatMoney = (value: number) =>
  Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", {
        notation: value >= 100000 ? "compact" : "standard",
        maximumFractionDigits: value >= 1 ? 2 : 6,
        minimumFractionDigits: value > 0 && value < 1 ? 2 : 0
      }).format(value)
    : "0";

class TelegramService {
  private readonly http = axios.create({
    baseURL: "https://api.telegram.org",
    timeout: 10000,
    headers: {
      "Content-Type": "application/json"
    }
  });

  buildAlertMessage(payload: TelegramAlertInput): string {
    const lines = [
      "🚨 Crypto Radar Alert",
      "",
      `Token: ${payload.name} (${payload.symbol})`,
      `Chain: ${payload.chainId}`,
      `Score: ${payload.score}/100`,
      `Price: $${formatMoney(payload.priceUsd)}`,
      `Liquidity: $${formatMoney(payload.liquidityUsd)}`,
      `24h Volume: $${formatMoney(payload.volume24h)}`,
      `24h Change: ${payload.priceChange24h.toFixed(2)}%`,
      `Risk Flags: ${payload.riskFlags.length > 0 ? payload.riskFlags.join(", ") : "NONE"}`,
      `DexScreener: ${payload.dexscreenerUrl}`
    ];

    return lines.join("\n").slice(0, TELEGRAM_TEXT_LIMIT);
  }

  async sendTokenAlert(payload: TelegramAlertInput): Promise<string | null> {
    const message = this.buildAlertMessage(payload);

    if (!telegramAlertsEnabled) {
      logger.warn("Telegram alert skipped because TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing.");
      return null;
    }

    try {
      await this.http.post(`/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: env.TELEGRAM_CHAT_ID,
        link_preview_options: {
          is_disabled: true
        },
        text: message
      });

      return message;
    } catch (error) {
      logger.error("Failed to send Telegram alert.", error);
      return null;
    }
  }
}

export const telegramService = new TelegramService();
