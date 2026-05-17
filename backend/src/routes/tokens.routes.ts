import { Router } from "express";
import type { FilterQuery } from "mongoose";

import { env } from "../config/env.js";
import { TokenScanHistoryModel } from "../models/TokenScanHistory.js";
import { TokenModel } from "../models/Token.js";
import { WatchlistModel } from "../models/Watchlist.js";

export const tokensRouter = Router();
const HISTORY_WINDOW_MINUTES = [5, 30, 60, 24 * 60] as const;

const VALID_SORT_FIELDS = new Set([
  "lastScannedAt",
  "liquidityUsd",
  "pairCreatedAt",
  "priceChange24h",
  "score",
  "volume24h"
]);

const parseBooleanQuery = (value: unknown) => {
  if (typeof value !== "string") {
    return false;
  }

  return value === "true" || value === "1";
};

const parseNumberQuery = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parsePositiveInteger = (value: unknown, fallback: number, max: number) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
};

const buildTokenResponse = async <
  T extends {
    _id: { toString(): string } | string;
    chainId: string;
    tokenAddress: string;
  }
>(tokens: T[]) => {
  if (tokens.length === 0) {
    return [];
  }

  const watchlistEntries = await WatchlistModel.find({
    $or: tokens.map((token) => ({
      chainId: token.chainId,
      tokenAddress: token.tokenAddress
    }))
  }).lean();

  const watchlistMap = new Map(
    watchlistEntries.map((entry) => [
      `${entry.chainId}:${entry.tokenAddress}`,
      {
        watchlistId: entry._id.toString(),
        watchlistNote: entry.note,
        watchlistTags: entry.tags
      }
    ])
  );

  return tokens.map((token) => ({
    ...token,
    ...(watchlistMap.get(`${token.chainId}:${token.tokenAddress}`) ?? {
      watchlistId: null,
      watchlistNote: "",
      watchlistTags: []
    })
  }));
};

tokensRouter.get("/high-score", async (req, res, next) => {
  try {
    const limit = parsePositiveInteger(req.query.limit, 25, 100);
    const tokens = await TokenModel.find({ score: { $gte: env.MIN_ALERT_SCORE } })
      .sort({ score: -1, lastScannedAt: -1 })
      .limit(limit)
      .lean();

    res.json(await buildTokenResponse(tokens));
  } catch (error) {
    next(error);
  }
});

tokensRouter.get("/:chainId/:tokenAddress/history", async (req, res, next) => {
  try {
    const limit = parsePositiveInteger(req.query.limit, 288, 288);
    const items = await TokenScanHistoryModel.find({
      chainId: req.params.chainId,
      tokenAddress: req.params.tokenAddress
    })
      .sort({ snapshotAt: -1 })
      .limit(limit)
      .lean();

    const ascendingItems = items.reverse();

    res.json({
      items: ascendingItems,
      trendSummary: buildTrendSummary(ascendingItems)
    });
  } catch (error) {
    next(error);
  }
});

tokensRouter.get("/:chainId/:tokenAddress", async (req, res, next) => {
  try {
    const token = await TokenModel.findOne({
      chainId: req.params.chainId,
      tokenAddress: req.params.tokenAddress
    }).lean();

    if (!token) {
      return res.status(404).json({
        message: "Token not found."
      });
    }

    const [enrichedToken] = await buildTokenResponse([token]);
    return res.json(enrichedToken);
  } catch (error) {
    next(error);
  }
});

function buildTrendSummary(
  history: Array<{
    priceUsd: number;
    score: number;
    snapshotAt: Date | string;
    volume1h: number;
    volume24h: number;
  }>
) {
  if (history.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      momentumLabel: "NO_DATA",
      windows: []
    };
  }

  const latest = history[history.length - 1];
  const latestTimestamp = new Date(latest.snapshotAt).getTime();
  const windows = HISTORY_WINDOW_MINUTES.map((windowMinutes) => {
    const targetTimestamp = latestTimestamp - windowMinutes * 60 * 1000;
    const referencePoint = findReferencePoint(history, targetTimestamp);

    if (!referencePoint) {
      return {
        actualLookbackMinutes: 0,
        available: false,
        label: formatWindowLabel(windowMinutes),
        priceChangePercent: null,
        priceChangeUsd: null,
        scoreChange: null,
        volume1hChangePercent: null,
        volume24hChangePercent: null,
        windowMinutes
      };
    }

    const referenceTimestamp = new Date(referencePoint.snapshotAt).getTime();
    const actualLookbackMinutes = Math.max(
      Math.round((latestTimestamp - referenceTimestamp) / (60 * 1000)),
      0
    );

    return {
      actualLookbackMinutes,
      available: actualLookbackMinutes > 0,
      label: formatWindowLabel(windowMinutes),
      priceChangePercent: getPercentChange(referencePoint.priceUsd, latest.priceUsd),
      priceChangeUsd: latest.priceUsd - referencePoint.priceUsd,
      scoreChange: latest.score - referencePoint.score,
      volume1hChangePercent: getPercentChange(referencePoint.volume1h, latest.volume1h),
      volume24hChangePercent: getPercentChange(referencePoint.volume24h, latest.volume24h),
      windowMinutes
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    momentumLabel: deriveMomentumLabel(windows),
    windows
  };
}

function findReferencePoint<
  T extends {
    snapshotAt: Date | string;
  }
>(history: T[], targetTimestamp: number) {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const pointTimestamp = new Date(history[index].snapshotAt).getTime();

    if (pointTimestamp <= targetTimestamp) {
      return history[index];
    }
  }

  return history[0] ?? null;
}

function getPercentChange(previousValue: number, currentValue: number) {
  if (!Number.isFinite(previousValue) || previousValue === 0) {
    return null;
  }

  return ((currentValue - previousValue) / previousValue) * 100;
}

function formatWindowLabel(windowMinutes: number) {
  if (windowMinutes < 60) {
    return `${windowMinutes}m`;
  }

  if (windowMinutes < 24 * 60) {
    return `${windowMinutes / 60}h`;
  }

  return "24h";
}

function deriveMomentumLabel(
  windows: Array<{
    available: boolean;
    priceChangePercent: number | null;
    windowMinutes: number;
  }>
) {
  const window5m = windows.find((window) => window.windowMinutes === 5);
  const window30m = windows.find((window) => window.windowMinutes === 30);
  const window60m = windows.find((window) => window.windowMinutes === 60);

  const change5m = window5m?.priceChangePercent ?? null;
  const change30m = window30m?.priceChangePercent ?? null;
  const change60m = window60m?.priceChangePercent ?? null;

  if ([change5m, change30m, change60m].every((value) => value === null)) {
    return "NO_DATA";
  }

  if ((change5m ?? 0) > 0 && (change30m ?? 0) > 0 && (change60m ?? 0) > 0) {
    return "STILL_MOVING";
  }

  if ((change5m ?? 0) < 0 && (change30m ?? 0) > 0) {
    return "COOLING";
  }

  if ((change5m ?? 0) < 0 && (change30m ?? 0) < 0) {
    return "REVERSING";
  }

  return "MIXED";
}

tokensRouter.get("/", async (req, res, next) => {
  try {
    const page = parsePositiveInteger(req.query.page, 1, 10_000);
    const limit = parsePositiveInteger(req.query.limit, 20, 100);
    const sortBy =
      typeof req.query.sortBy === "string" && VALID_SORT_FIELDS.has(req.query.sortBy)
        ? req.query.sortBy
        : "score";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    const chainId =
      typeof req.query.chainId === "string" && req.query.chainId !== "all"
        ? req.query.chainId
        : undefined;
    const searchQuery =
      typeof req.query.q === "string" && req.query.q.trim().length > 0
        ? req.query.q.trim()
        : undefined;
    const riskFlag =
      typeof req.query.riskFlag === "string" && req.query.riskFlag !== "all"
        ? req.query.riskFlag
        : undefined;
    const minScore = parseNumberQuery(req.query.minScore);
    const minLiquidityUsd = parseNumberQuery(req.query.minLiquidityUsd);
    const minVolume24h = parseNumberQuery(req.query.minVolume24h);
    const maxPairAgeHours = parseNumberQuery(req.query.maxPairAgeHours);
    const filters: FilterQuery<Record<string, unknown>> = {};

    if (chainId) {
      filters.chainId = chainId;
    }

    if (parseBooleanQuery(req.query.highScoreOnly)) {
      filters.score = {
        ...(filters.score ?? {}),
        $gte: env.MIN_ALERT_SCORE
      };
    }

    if (parseBooleanQuery(req.query.favoritesOnly)) {
      filters.isFavorite = true;
    }

    if (parseBooleanQuery(req.query.boostedOnly)) {
      filters.boosted = true;
    }

    if (riskFlag) {
      filters.riskFlags = riskFlag;
    }

    if (minScore !== undefined) {
      filters.score = {
        ...(filters.score ?? {}),
        $gte: Math.max((filters.score as { $gte?: number } | undefined)?.$gte ?? 0, minScore)
      };
    }

    if (minLiquidityUsd !== undefined) {
      filters.liquidityUsd = {
        $gte: minLiquidityUsd
      };
    }

    if (minVolume24h !== undefined) {
      filters.volume24h = {
        $gte: minVolume24h
      };
    }

    if (maxPairAgeHours !== undefined) {
      const cutoffDate = new Date(Date.now() - maxPairAgeHours * 60 * 60 * 1000);
      filters.pairCreatedAt = {
        $gte: cutoffDate
      };
    }

    if (searchQuery) {
      const pattern = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filters.$or = [
        { name: pattern },
        { symbol: pattern },
        { tokenAddress: pattern }
      ];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder
    };

    if (sortBy === "lastScannedAt") {
      sort.score = -1;
    } else {
      sort.lastScannedAt = -1;
    }
    const [tokens, total, availableChains] = await Promise.all([
      TokenModel.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      TokenModel.countDocuments(filters),
      TokenModel.distinct("chainId")
    ]);

    res.json({
      availableChains: availableChains.sort(),
      items: await buildTokenResponse(tokens),
      pagination: {
        limit,
        page,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1)
      }
    });
  } catch (error) {
    next(error);
  }
});
