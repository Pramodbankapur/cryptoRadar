export type RiskFlag =
  | "HIGH_RISK"
  | "POSSIBLE_PUMP"
  | "LOW_INFO"
  | "VERY_NEW"
  | "EXIT_LIQUIDITY_RISK"
  | "CHASE_RISK"
  | "DUMP_RISK"
  | "SELL_PRESSURE";

export type FlowState = "BALANCED" | "BUYERS_IN_CONTROL" | "SELLERS_IN_CONTROL";
export type EntryBias =
  | "AVOID"
  | "NO_CHASE"
  | "WAIT_CONFIRMATION"
  | "WAIT_RETEST"
  | "CONTROLLED_BREAKOUT";
export type RiskLevel = "CONTROLLED" | "WATCH" | "CAUTION" | "AVOID";

export interface ScoreableTokenInput {
  boosted?: boolean;
  liquidityUsd?: number | null;
  pairCreatedAt?: Date | number | null;
  priceChange1h?: number | null;
  priceChange5m?: number | null;
  priceChange24h?: number | null;
  socials?: Array<{ type?: string; url: string }>;
  txns1hBuys?: number | null;
  txns1hSells?: number | null;
  txns5mBuys?: number | null;
  txns5mSells?: number | null;
  volume5m?: number | null;
  volume1h?: number | null;
  volume24h?: number | null;
  volume6h?: number | null;
  websites?: Array<{ label?: string; url: string }>;
}

export interface ScoreTokenResult {
  entryBias: EntryBias;
  flowState: FlowState;
  riskFlags: RiskFlag[];
  riskLevel: RiskLevel;
  score: number;
  volumeToLiquidityRatio: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

export const scoreToken = (token: ScoreableTokenInput): ScoreTokenResult => {
  const liquidityUsd = token.liquidityUsd ?? 0;
  const volume24h = token.volume24h ?? 0;
  const volume6h = token.volume6h ?? 0;
  const volume1h = token.volume1h ?? 0;
  const volume5m = token.volume5m ?? 0;
  const priceChange1h = token.priceChange1h ?? 0;
  const priceChange5m = token.priceChange5m ?? 0;
  const priceChange24h = token.priceChange24h ?? 0;
  const txns5mBuys = token.txns5mBuys ?? 0;
  const txns5mSells = token.txns5mSells ?? 0;
  const txns1hBuys = token.txns1hBuys ?? 0;
  const txns1hSells = token.txns1hSells ?? 0;
  const createdAtValue = token.pairCreatedAt
    ? new Date(token.pairCreatedAt).getTime()
    : Number.NaN;
  const ageMs = Number.isNaN(createdAtValue) ? Number.POSITIVE_INFINITY : Date.now() - createdAtValue;
  const hasLinks = (token.websites?.length ?? 0) > 0 || (token.socials?.length ?? 0) > 0;
  const volumeToLiquidityRatio = liquidityUsd > 0 ? volume24h / liquidityUsd : Number.POSITIVE_INFINITY;
  const totalTxns5m = txns5mBuys + txns5mSells;
  const totalTxns1h = txns1hBuys + txns1hSells;
  const buyShare5m = totalTxns5m > 0 ? txns5mBuys / totalTxns5m : 0.5;
  const buyShare1h = totalTxns1h > 0 ? txns1hBuys / totalTxns1h : 0.5;

  let score = 0;
  const riskFlags = new Set<RiskFlag>();

  if (liquidityUsd > 50000) {
    score += 20;
  }

  if (volume24h > 100000) {
    score += 20;
  }

  if (priceChange24h >= 5 && priceChange24h <= 80) {
    score += 15;
  }

  if (volume6h > 0 && volume1h > volume6h / 6) {
    score += 15;
  }

  if (ageMs < SEVEN_DAYS_MS) {
    score += 10;
  }

  if (hasLinks) {
    score += 10;
  }

  if (token.boosted) {
    score += 10;
  }

  if (liquidityUsd < 10000) {
    riskFlags.add("HIGH_RISK");
  }

  if (priceChange24h > 300) {
    riskFlags.add("POSSIBLE_PUMP");
  }

  if (priceChange24h > 120 && priceChange5m <= 1 && priceChange1h <= 4) {
    riskFlags.add("CHASE_RISK");
  }

  if (!hasLinks) {
    riskFlags.add("LOW_INFO");
  }

  if (ageMs < ONE_HOUR_MS) {
    riskFlags.add("VERY_NEW");
  }

  // High turnover with thin liquidity often signals harder exits for later entrants.
  if (volume24h >= 100000 && liquidityUsd > 0 && liquidityUsd < 20000) {
    riskFlags.add("EXIT_LIQUIDITY_RISK");
  }

  if ((priceChange5m < -5 && priceChange1h <= 0) || (buyShare5m < 0.42 && buyShare1h < 0.48)) {
    riskFlags.add("DUMP_RISK");
  }

  if (buyShare5m < 0.45 && buyShare1h < 0.5) {
    riskFlags.add("SELL_PRESSURE");
  }

  const flowState: FlowState =
    buyShare5m >= 0.58 && buyShare1h >= 0.54
      ? "BUYERS_IN_CONTROL"
      : buyShare5m <= 0.42 && buyShare1h <= 0.46
        ? "SELLERS_IN_CONTROL"
        : "BALANCED";

  const riskLevel: RiskLevel = riskFlags.has("HIGH_RISK") ||
    riskFlags.has("EXIT_LIQUIDITY_RISK") ||
    riskFlags.has("DUMP_RISK")
    ? "AVOID"
    : riskFlags.has("CHASE_RISK") ||
        riskFlags.has("POSSIBLE_PUMP") ||
        riskFlags.has("VERY_NEW") ||
        riskFlags.has("SELL_PRESSURE")
      ? "CAUTION"
      : liquidityUsd >= 75000 &&
          volumeToLiquidityRatio <= 8 &&
          flowState !== "SELLERS_IN_CONTROL" &&
          priceChange1h > 0 &&
          priceChange5m >= -2 &&
          priceChange5m <= 8 &&
          volume5m > 0
        ? "CONTROLLED"
        : "WATCH";

  const entryBias: EntryBias =
    riskLevel === "AVOID"
      ? "AVOID"
      : riskFlags.has("CHASE_RISK")
        ? "NO_CHASE"
        : flowState === "SELLERS_IN_CONTROL"
          ? "WAIT_RETEST"
          : riskLevel === "CONTROLLED"
            ? "CONTROLLED_BREAKOUT"
            : "WAIT_CONFIRMATION";

  return {
    entryBias,
    flowState,
    riskFlags: Array.from(riskFlags),
    riskLevel,
    score: Math.min(score, 100)
      ,
    volumeToLiquidityRatio
  };
};
