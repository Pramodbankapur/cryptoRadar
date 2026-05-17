import { model, Schema, type InferSchemaType } from "mongoose";

const watchlistSchema = new Schema(
  {
    chainId: { type: String, required: true, trim: true, index: true },
    tokenAddress: { type: String, required: true, trim: true, index: true },
    note: { type: String, default: "", trim: true },
    tags: { type: [String], default: [] }
  },
  {
    timestamps: true
  }
);

watchlistSchema.index({ chainId: 1, tokenAddress: 1 }, { unique: true });

export type WatchlistDocument = InferSchemaType<typeof watchlistSchema>;
export const WatchlistModel = model<WatchlistDocument>("Watchlist", watchlistSchema);
