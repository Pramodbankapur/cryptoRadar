import { Router } from "express";
import { z } from "zod";

import { TokenModel } from "../models/Token.js";
import { WatchlistModel } from "../models/Watchlist.js";

export const watchlistRouter = Router();

const createWatchlistSchema = z.object({
  chainId: z.string().min(1),
  tokenAddress: z.string().min(1),
  note: z.string().trim().max(500).optional().default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(8).optional().default([])
});

const updateWatchlistSchema = z.object({
  note: z.string().trim().max(500).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(8).optional()
});

watchlistRouter.get("/", async (_req, res, next) => {
  try {
    const entries = await WatchlistModel.find().sort({ updatedAt: -1 }).lean();
    if (entries.length === 0) {
      return res.json([]);
    }

    const tokens = await TokenModel.find({
      $or: entries.map((entry) => ({
        chainId: entry.chainId,
        tokenAddress: entry.tokenAddress
      }))
    }).lean();

    const tokenMap = new Map(
      tokens.map((token) => [`${token.chainId}:${token.tokenAddress}`, token] as const)
    );

    res.json(
      entries.map((entry) => ({
        ...entry,
        token: tokenMap.get(`${entry.chainId}:${entry.tokenAddress}`) ?? null
      }))
    );
  } catch (error) {
    next(error);
  }
});

watchlistRouter.post("/", async (req, res, next) => {
  try {
    const payload = createWatchlistSchema.parse(req.body);
    const token = await TokenModel.findOne({
      chainId: payload.chainId,
      tokenAddress: payload.tokenAddress
    }).lean();

    if (!token) {
      return res.status(404).json({
        message: "Token not found. Wait for it to be scanned before adding it to your watchlist."
      });
    }

    const entry = await WatchlistModel.findOneAndUpdate(
      {
        chainId: payload.chainId,
        tokenAddress: payload.tokenAddress
      },
      {
        $set: {
          note: payload.note,
          tags: payload.tags
        }
      },
      {
        new: true,
        setDefaultsOnInsert: true,
        upsert: true
      }
    ).lean();

    await TokenModel.updateOne(
      {
        chainId: payload.chainId,
        tokenAddress: payload.tokenAddress
      },
      {
        $set: {
          isFavorite: true
        }
      }
    );

    return res.status(201).json({
      ...entry,
      token: {
        ...token,
        isFavorite: true
      }
    });
  } catch (error) {
    next(error);
  }
});

watchlistRouter.patch("/:watchlistId", async (req, res, next) => {
  try {
    const payload = updateWatchlistSchema.parse(req.body);
    const entry = await WatchlistModel.findByIdAndUpdate(
      req.params.watchlistId,
      {
        $set: payload
      },
      {
        new: true
      }
    ).lean();

    if (!entry) {
      return res.status(404).json({
        message: "Watchlist entry not found."
      });
    }

    const token = await TokenModel.findOne({
      chainId: entry.chainId,
      tokenAddress: entry.tokenAddress
    }).lean();

    return res.json({
      ...entry,
      token
    });
  } catch (error) {
    next(error);
  }
});

watchlistRouter.delete("/:watchlistId", async (req, res, next) => {
  try {
    const entry = await WatchlistModel.findByIdAndDelete(req.params.watchlistId).lean();

    if (!entry) {
      return res.status(404).json({
        message: "Watchlist entry not found."
      });
    }

    await TokenModel.updateOne(
      {
        chainId: entry.chainId,
        tokenAddress: entry.tokenAddress
      },
      {
        $set: {
          isFavorite: false
        }
      }
    );

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});
