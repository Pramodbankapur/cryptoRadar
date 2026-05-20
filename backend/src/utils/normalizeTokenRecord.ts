type TokenLike = {
  entryBias?: string | null;
  flowState?: string | null;
  isFavorite?: boolean | null;
  priceChange1h?: number | null;
  priceChange5m?: number | null;
  riskFlags?: string[] | null;
  riskLevel?: string | null;
  txns1hBuys?: number | null;
  txns1hSells?: number | null;
  txns5mBuys?: number | null;
  txns5mSells?: number | null;
  volume5m?: number | null;
  volumeToLiquidityRatio?: number | null;
};

export const normalizeTokenRecord = <T extends TokenLike>(token: T) => ({
  ...token,
  entryBias: token.entryBias ?? "WAIT_CONFIRMATION",
  flowState: token.flowState ?? "BALANCED",
  isFavorite: token.isFavorite ?? false,
  priceChange1h: token.priceChange1h ?? 0,
  priceChange5m: token.priceChange5m ?? 0,
  riskFlags: token.riskFlags ?? [],
  riskLevel: token.riskLevel ?? "WATCH",
  txns1hBuys: token.txns1hBuys ?? 0,
  txns1hSells: token.txns1hSells ?? 0,
  txns5mBuys: token.txns5mBuys ?? 0,
  txns5mSells: token.txns5mSells ?? 0,
  volume5m: token.volume5m ?? 0,
  volumeToLiquidityRatio: token.volumeToLiquidityRatio ?? 0
});
