import axios, { type AxiosError, type AxiosInstance } from "axios";

import { logger } from "../utils/logger.js";

const BOOSTED_FEED_MIN_INTERVAL_MS = 1100;
const PAIRS_MIN_INTERVAL_MS = 250;
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_RETRIES = 3;

type RequestBucket = "boosted-feed" | "pairs";

export interface DexLink {
  label?: string;
  type?: string;
  url: string;
}

export interface DexTokenProfile {
  chainId?: string;
  description?: string | null;
  header?: string | null;
  icon?: string | null;
  links?: DexLink[] | null;
  tokenAddress?: string;
  updatedAt?: string;
  url?: string;
}

export interface DexBoostToken extends DexTokenProfile {
  amount?: number;
  totalAmount?: number;
}

interface DexTokenRef {
  address?: string;
  name?: string;
  symbol?: string;
}

interface DexTxnWindow {
  buys?: number;
  sells?: number;
}

interface DexVolumeWindow {
  h1?: number;
  h24?: number;
  h6?: number;
  m5?: number;
}

interface DexPriceChangeWindow {
  h1?: number;
  h24?: number;
  h6?: number;
  m5?: number;
}

interface DexLiquidityWindow {
  base?: number;
  quote?: number;
  usd?: number;
}

interface DexPairInfoWebsite {
  label?: string;
  url: string;
}

interface DexPairInfoSocial {
  type?: string;
  url: string;
}

interface DexBoostStats {
  active?: number;
}

export interface DexPair {
  baseToken?: DexTokenRef;
  boosts?: DexBoostStats;
  chainId?: string;
  dexId?: string;
  fdv?: number | null;
  info?: {
    header?: string;
    imageUrl?: string;
    openGraph?: string;
    socials?: DexPairInfoSocial[];
    websites?: DexPairInfoWebsite[];
  };
  liquidity?: DexLiquidityWindow | null;
  marketCap?: number | null;
  pairAddress?: string;
  pairCreatedAt?: number;
  priceChange?: DexPriceChangeWindow | null;
  priceNative?: string;
  priceUsd?: string | null;
  quoteToken?: DexTokenRef;
  txns?: {
    h1?: DexTxnWindow;
    h24?: DexTxnWindow;
    h6?: DexTxnWindow;
    m5?: DexTxnWindow;
  };
  url?: string;
  volume?: DexVolumeWindow;
}

class DexScreenerService {
  private readonly bucketIntervals: Record<RequestBucket, number> = {
    "boosted-feed": BOOSTED_FEED_MIN_INTERVAL_MS,
    pairs: PAIRS_MIN_INTERVAL_MS
  };

  private readonly bucketLastRunAt = new Map<RequestBucket, number>();

  private readonly bucketQueue = new Map<RequestBucket, Promise<unknown>>();

  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: "https://api.dexscreener.com",
      timeout: DEFAULT_TIMEOUT_MS,
      headers: {
        Accept: "application/json"
      }
    });
  }

  async getLatestTokenProfiles(): Promise<DexTokenProfile[]> {
    return this.requestArray<DexTokenProfile>(
      "boosted-feed",
      "/token-profiles/latest/v1",
      "latest token profiles"
    );
  }

  async getLatestBoostedTokens(): Promise<DexBoostToken[]> {
    return this.requestArray<DexBoostToken>(
      "boosted-feed",
      "/token-boosts/latest/v1",
      "latest boosted tokens"
    );
  }

  async getTopBoostedTokens(): Promise<DexBoostToken[]> {
    return this.requestArray<DexBoostToken>(
      "boosted-feed",
      "/token-boosts/top/v1",
      "top boosted tokens"
    );
  }

  async getTokenPairs(chainId: string, tokenAddress: string): Promise<DexPair[]> {
    const safeChainId = encodeURIComponent(chainId);
    const safeTokenAddress = encodeURIComponent(tokenAddress);

    return this.requestArray<DexPair>(
      "pairs",
      `/token-pairs/v1/${safeChainId}/${safeTokenAddress}`,
      `token pairs for ${chainId}:${tokenAddress}`
    );
  }

  private async requestArray<T>(
    bucket: RequestBucket,
    path: string,
    contextLabel: string
  ): Promise<T[]> {
    const data = await this.schedule(bucket, () =>
      this.withRetry(async () => {
        const response = await this.http.get<T[]>(path);
        return response.data;
      }, contextLabel)
    );

    if (!Array.isArray(data)) {
      logger.warn(`DexScreener returned a non-array payload for ${contextLabel}.`);
      return [];
    }

    return data;
  }

  private async schedule<T>(bucket: RequestBucket, task: () => Promise<T>): Promise<T> {
    const previous = this.bucketQueue.get(bucket) ?? Promise.resolve();

    const execution = previous
      .catch(() => undefined)
      .then(async () => {
        const waitMs = this.getBucketDelay(bucket);

        if (waitMs > 0) {
          await sleep(waitMs);
        }

        this.bucketLastRunAt.set(bucket, Date.now());
        return task();
      });

    this.bucketQueue.set(
      bucket,
      execution.then(
        () => undefined,
        () => undefined
      )
    );

    return execution;
  }

  private getBucketDelay(bucket: RequestBucket): number {
    const interval = this.bucketIntervals[bucket];
    const lastRunAt = this.bucketLastRunAt.get(bucket) ?? 0;
    const elapsed = Date.now() - lastRunAt;
    return Math.max(interval - elapsed, 0);
  }

  private async withRetry<T>(request: () => Promise<T>, contextLabel: string): Promise<T> {
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
      try {
        return await request();
      } catch (error) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;
        const shouldRetry = this.shouldRetry(status, axiosError);

        if (!shouldRetry || attempt === MAX_RETRIES) {
          logger.error(`DexScreener request failed for ${contextLabel}.`, {
            message: axiosError.message,
            status
          });
          throw error;
        }

        const delayMs = this.getRetryDelayMs(axiosError, attempt);

        logger.warn(`Retrying DexScreener request for ${contextLabel}.`, {
          attempt: attempt + 1,
          delayMs,
          status
        });

        await sleep(delayMs);
      }

      attempt += 1;
    }

    throw new Error(`DexScreener request exhausted retries for ${contextLabel}.`);
  }

  private getRetryDelayMs(error: AxiosError, attempt: number): number {
    const retryAfterHeader = error.response?.headers["retry-after"];
    const retryAfterValue = Array.isArray(retryAfterHeader)
      ? retryAfterHeader[0]
      : retryAfterHeader;
    const retryAfterSeconds = retryAfterValue ? Number(retryAfterValue) : Number.NaN;

    if (!Number.isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
      return retryAfterSeconds * 1000;
    }

    return 1000 * (attempt + 1) + Math.floor(Math.random() * 250);
  }

  private shouldRetry(status: number | undefined, error: AxiosError): boolean {
    if (status === 429) {
      return true;
    }

    if (status !== undefined && status >= 500) {
      return true;
    }

    return !error.response;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const dexscreenerService = new DexScreenerService();
