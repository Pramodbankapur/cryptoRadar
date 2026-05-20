import { model, Schema, type InferSchemaType } from "mongoose";

const websiteSchema = new Schema(
  {
    label: { type: String },
    url: { type: String, required: true }
  },
  { _id: false }
);

const socialSchema = new Schema(
  {
    type: { type: String },
    url: { type: String, required: true }
  },
  { _id: false }
);

const tokenSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    symbol: { type: String, required: true, trim: true },
    chainId: { type: String, required: true, trim: true, index: true },
    tokenAddress: { type: String, required: true, trim: true },
    pairAddress: { type: String, trim: true, default: "" },
    dexId: { type: String, trim: true, default: "" },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    priceUsd: { type: Number, default: 0 },
    liquidityUsd: { type: Number, default: 0 },
    volume24h: { type: Number, default: 0 },
    volume6h: { type: Number, default: 0 },
    volume1h: { type: Number, default: 0 },
    volume5m: { type: Number, default: 0 },
    priceChange24h: { type: Number, default: 0 },
    priceChange6h: { type: Number, default: 0 },
    priceChange1h: { type: Number, default: 0 },
    priceChange5m: { type: Number, default: 0 },
    txns5mBuys: { type: Number, default: 0 },
    txns5mSells: { type: Number, default: 0 },
    txns1hBuys: { type: Number, default: 0 },
    txns1hSells: { type: Number, default: 0 },
    volumeToLiquidityRatio: { type: Number, default: 0 },
    flowState: { type: String, default: "BALANCED" },
    entryBias: { type: String, default: "WAIT_CONFIRMATION" },
    riskLevel: { type: String, default: "WATCH" },
    marketCap: { type: Number, default: null },
    fdv: { type: Number, default: null },
    pairCreatedAt: { type: Date, default: null },
    dexscreenerUrl: { type: String, default: "" },
    websites: { type: [websiteSchema], default: [] },
    socials: { type: [socialSchema], default: [] },
    boosted: { type: Boolean, default: false },
    boostAmount: { type: Number, default: 0 },
    totalBoostAmount: { type: Number, default: 0 },
    score: { type: Number, default: 0, index: true },
    riskFlags: { type: [String], default: [] },
    isFavorite: { type: Boolean, default: false, index: true },
    lastScannedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

tokenSchema.index({ chainId: 1, tokenAddress: 1 }, { unique: true });
tokenSchema.index({ score: -1, lastScannedAt: -1 });
tokenSchema.index({ isFavorite: 1, score: -1 });

export type TokenDocument = InferSchemaType<typeof tokenSchema>;
export const TokenModel = model<TokenDocument>("Token", tokenSchema);
