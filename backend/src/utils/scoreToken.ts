export type RiskFlag =
  | "HIGH_RISK"
  | "POSSIBLE_PUMP"
  | "LOW_INFO"
  | "VERY_NEW"
  | "EXIT_LIQUIDITY_RISK";

export interface ScoreableTokenInput {
  boosted?: boolean;
  liquidityUsd?: number | null;
  pairCreatedAt?: Date | number | null;
  priceChange24h?: number | null;
  socials?: Array<{ type?: string; url: string }>;
  volume1h?: number | null;
  volume24h?: number | null;
  volume6h?: number | null;
  websites?: Array<{ label?: string; url: string }>;
}

export interface ScoreTokenResult {
  riskFlags: RiskFlag[];
  score: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

export const scoreToken = (token: ScoreableTokenInput): ScoreTokenResult => {
  const liquidityUsd = token.liquidityUsd ?? 0;
  const volume24h = token.volume24h ?? 0;
  const volume6h = token.volume6h ?? 0;
  const volume1h = token.volume1h ?? 0;
  const priceChange24h = token.priceChange24h ?? 0;
  const createdAtValue = token.pairCreatedAt
    ? new Date(token.pairCreatedAt).getTime()
    : Number.NaN;
  const ageMs = Number.isNaN(createdAtValue) ? Number.POSITIVE_INFINITY : Date.now() - createdAtValue;
  const hasLinks = (token.websites?.length ?? 0) > 0 || (token.socials?.length ?? 0) > 0;

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

  return {
    riskFlags: Array.from(riskFlags),
    score: Math.min(score, 100)
  };
};
