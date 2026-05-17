import { model, Schema, type InferSchemaType } from "mongoose";

const alertSchema = new Schema(
  {
    tokenName: { type: String, required: true, trim: true },
    symbol: { type: String, required: true, trim: true },
    chainId: { type: String, required: true, trim: true, index: true },
    tokenAddress: { type: String, required: true, trim: true, index: true },
    pairAddress: { type: String, trim: true, default: "" },
    score: { type: Number, required: true },
    riskFlags: { type: [String], default: [] },
    priceUsd: { type: Number, default: 0 },
    liquidityUsd: { type: Number, default: 0 },
    volume24h: { type: Number, default: 0 },
    priceChange24h: { type: Number, default: 0 },
    dexscreenerUrl: { type: String, default: "" },
    message: { type: String, required: true },
    sentAt: { type: Date, default: Date.now, index: true }
  },
  {
    timestamps: true
  }
);

alertSchema.index({ chainId: 1, tokenAddress: 1, sentAt: -1 });

export type AlertDocument = InferSchemaType<typeof alertSchema>;
export const AlertModel = model<AlertDocument>("Alert", alertSchema);
