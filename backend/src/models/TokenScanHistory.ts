import { model, Schema, type InferSchemaType } from "mongoose";

const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;

const tokenScanHistorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    symbol: { type: String, required: true, trim: true },
    chainId: { type: String, required: true, trim: true, index: true },
    tokenAddress: { type: String, required: true, trim: true, index: true },
    pairAddress: { type: String, trim: true, default: "" },
    priceUsd: { type: Number, default: 0 },
    liquidityUsd: { type: Number, default: 0 },
    volume24h: { type: Number, default: 0 },
    volume6h: { type: Number, default: 0 },
    volume1h: { type: Number, default: 0 },
    priceChange24h: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    boosted: { type: Boolean, default: false },
    riskFlags: { type: [String], default: [] },
    snapshotAt: {
      type: Date,
      default: Date.now,
      expires: THIRTY_DAYS_IN_SECONDS
    }
  },
  {
    timestamps: true
  }
);

tokenScanHistorySchema.index({ chainId: 1, tokenAddress: 1, snapshotAt: -1 });

export type TokenScanHistoryDocument = InferSchemaType<typeof tokenScanHistorySchema>;
export const TokenScanHistoryModel = model<TokenScanHistoryDocument>(
  "TokenScanHistory",
  tokenScanHistorySchema
);
