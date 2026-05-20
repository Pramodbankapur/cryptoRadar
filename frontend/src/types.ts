export interface LinkItem {
  label?: string;
  type?: string;
  url: string;
}

export interface TokenRecord {
  _id: string;
  boosted: boolean;
  boostAmount: number;
  chainId: string;
  createdAt: string;
  description: string;
  dexscreenerUrl: string;
  dexId: string;
  fdv: number | null;
  imageUrl: string;
  isFavorite: boolean;
  lastScannedAt: string;
  liquidityUsd: number;
  marketCap: number | null;
  name: string;
  pairAddress: string;
  pairCreatedAt: string | null;
  priceChange24h: number;
  priceChange6h: number;
  priceChange1h: number;
  priceChange5m: number;
  priceUsd: number;
  flowState: "BALANCED" | "BUYERS_IN_CONTROL" | "SELLERS_IN_CONTROL";
  entryBias:
    | "AVOID"
    | "NO_CHASE"
    | "WAIT_CONFIRMATION"
    | "WAIT_RETEST"
    | "CONTROLLED_BREAKOUT";
  riskLevel: "CONTROLLED" | "WATCH" | "CAUTION" | "AVOID";
  riskFlags: string[];
  score: number;
  socials: LinkItem[];
  symbol: string;
  tokenAddress: string;
  totalBoostAmount: number;
  txns1hBuys: number;
  txns1hSells: number;
  txns5mBuys: number;
  txns5mSells: number;
  updatedAt: string;
  volume5m: number;
  volume1h: number;
  volume24h: number;
  volume6h: number;
  volumeToLiquidityRatio: number;
  watchlistId: string | null;
  watchlistNote: string;
  watchlistTags: string[];
  websites: LinkItem[];
}

export interface AlertRecord {
  _id: string;
  chainId: string;
  createdAt: string;
  dexscreenerUrl: string;
  liquidityUsd: number;
  message: string;
  pairAddress: string;
  priceChange24h: number;
  priceUsd: number;
  riskFlags: string[];
  score: number;
  sentAt: string;
  symbol: string;
  tokenAddress: string;
  tokenName: string;
  updatedAt: string;
  volume24h: number;
}

export interface PaginationMeta {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface TokenListResponse extends PaginatedResponse<TokenRecord> {
  availableChains: string[];
}

export interface TokenHistoryPoint {
  _id: string;
  boosted: boolean;
  chainId: string;
  createdAt: string;
  liquidityUsd: number;
  name: string;
  pairAddress: string;
  priceChange24h: number;
  priceChange1h: number;
  priceChange5m: number;
  priceUsd: number;
  riskFlags: string[];
  score: number;
  snapshotAt: string;
  symbol: string;
  tokenAddress: string;
  txns1hBuys: number;
  txns1hSells: number;
  txns5mBuys: number;
  txns5mSells: number;
  updatedAt: string;
  volume5m: number;
  volume1h: number;
  volume24h: number;
  volume6h: number;
}

export interface TokenHistoryWindow {
  actualLookbackMinutes: number;
  available: boolean;
  label: string;
  priceChangePercent: number | null;
  priceChangeUsd: number | null;
  scoreChange: number | null;
  volume1hChangePercent: number | null;
  volume24hChangePercent: number | null;
  windowMinutes: number;
}

export interface TokenTrendSummary {
  control: {
    buyShare1h: number | null;
    buyShare5m: number | null;
    controlTier: "CONTROLLED" | "WATCH" | "CAUTION" | "AVOID";
    entrySignal:
      | "AVOID"
      | "NO_CHASE"
      | "WAIT_CONFIRMATION"
      | "WAIT_RETEST"
      | "CONTROLLED_BREAKOUT";
    flowState: "BALANCED" | "BUYERS_IN_CONTROL" | "SELLERS_IN_CONTROL";
    priceDrawdownFrom24hHighPercent: number | null;
    volumeToLiquidityRatio: number | null;
    warnings: string[];
  } | null;
  generatedAt: string;
  momentumLabel: "STILL_MOVING" | "COOLING" | "REVERSING" | "MIXED" | "NO_DATA";
  windows: TokenHistoryWindow[];
}

export interface TokenHistoryResponse {
  items: TokenHistoryPoint[];
  trendSummary: TokenTrendSummary;
}

export interface WatchlistEntry {
  _id: string;
  chainId: string;
  createdAt: string;
  note: string;
  tags: string[];
  token: TokenRecord | null;
  tokenAddress: string;
  updatedAt: string;
}

export interface TokenQueryParams {
  boostedOnly?: boolean;
  chainId?: string;
  favoritesOnly?: boolean;
  highScoreOnly?: boolean;
  limit?: number;
  maxPairAgeHours?: number;
  minLiquidityUsd?: number;
  minScore?: number;
  minVolume24h?: number;
  page?: number;
  q?: string;
  riskFlag?: string;
  sortBy?: "score" | "lastScannedAt" | "volume24h" | "liquidityUsd" | "priceChange24h" | "pairCreatedAt";
  sortOrder?: "asc" | "desc";
}
