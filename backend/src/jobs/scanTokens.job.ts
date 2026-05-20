import cron from "node-cron";

import { env } from "../config/env.js";
import { AlertModel } from "../models/Alert.js";
import { TokenScanHistoryModel } from "../models/TokenScanHistory.js";
import { TokenModel } from "../models/Token.js";
import {
  dexscreenerService,
  type DexBoostToken,
  type DexLink,
  type DexPair,
  type DexTokenProfile
} from "../services/dexscreener.service.js";
import { telegramService } from "../services/telegram.service.js";
import { logger } from "../utils/logger.js";
import { scoreToken } from "../utils/scoreToken.js";

const MAX_TOKENS_PER_SCAN = 40;
const ALERT_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const SOCIAL_DOMAINS = [
  "discord.gg",
  "discord.com",
  "github.com",
  "instagram.com",
  "medium.com",
  "reddit.com",
  "t.me",
  "telegram.me",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "youtube.com"
];

interface CandidateToken {
  boostAmount: number;
  chainId: string;
  description: string;
  imageUrl: string;
  links: DexLink[];
  profileUrl: string;
  tokenAddress: string;
  totalBoostAmount: number;
}

let isScanRunning = false;

const toCandidateKey = (chainId: string, tokenAddress: string) => `${chainId}:${tokenAddress}`;

const parseNumberish = (value: number | string | null | undefined): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const isSocialLink = (link: DexLink): boolean => {
  const lowerType = link.type?.toLowerCase();
  const lowerUrl = link.url.toLowerCase();

  if (lowerType && lowerType !== "website") {
    return true;
  }

  return SOCIAL_DOMAINS.some((domain) => lowerUrl.includes(domain));
};

const mergeWebsites = (
  candidateLinks: DexLink[],
  pairWebsites: Array<{ label?: string; url: string }> = []
) => {
  const websiteMap = new Map<string, { label?: string; url: string }>();

  for (const website of pairWebsites) {
    if (website.url) {
      websiteMap.set(website.url, website);
    }
  }

  for (const link of candidateLinks) {
    if (!link.url || isSocialLink(link)) {
      continue;
    }

    websiteMap.set(link.url, {
      label: link.label ?? link.type ?? "Website",
      url: link.url
    });
  }

  return Array.from(websiteMap.values());
};

const mergeSocials = (
  candidateLinks: DexLink[],
  pairSocials: Array<{ type?: string; url: string }> = []
) => {
  const socialMap = new Map<string, { type?: string; url: string }>();

  for (const social of pairSocials) {
    if (social.url) {
      socialMap.set(social.url, social);
    }
  }

  for (const link of candidateLinks) {
    if (!link.url || !isSocialLink(link)) {
      continue;
    }

    socialMap.set(link.url, {
      type: link.type ?? "social",
      url: link.url
    });
  }

  return Array.from(socialMap.values());
};

const pickBestPair = (pairs: DexPair[], tokenAddress: string): DexPair | null => {
  const normalizedTokenAddress = tokenAddress.toLowerCase();
  const relevantPairs = pairs.filter((pair) => {
    const baseAddress = pair.baseToken?.address?.toLowerCase();
    const quoteAddress = pair.quoteToken?.address?.toLowerCase();
    return baseAddress === normalizedTokenAddress || quoteAddress === normalizedTokenAddress;
  });

  const sortedPairs = (relevantPairs.length > 0 ? relevantPairs : pairs).sort((left, right) => {
    const liquidityDelta =
      parseNumberish(right.liquidity?.usd) - parseNumberish(left.liquidity?.usd);

    if (liquidityDelta !== 0) {
      return liquidityDelta;
    }

    return parseNumberish(right.volume?.h24) - parseNumberish(left.volume?.h24);
  });

  return sortedPairs[0] ?? null;
};

const ensureCandidate = (
  candidateMap: Map<string, CandidateToken>,
  source: DexTokenProfile | DexBoostToken
) => {
  const chainId = source.chainId?.trim();
  const tokenAddress = source.tokenAddress?.trim();

  if (!chainId || !tokenAddress) {
    return;
  }

  const key = toCandidateKey(chainId, tokenAddress);
  const current = candidateMap.get(key);

  candidateMap.set(key, {
    boostAmount: Math.max(current?.boostAmount ?? 0, "amount" in source ? source.amount ?? 0 : 0),
    chainId,
    description: source.description ?? current?.description ?? "",
    imageUrl: source.icon ?? current?.imageUrl ?? "",
    links: dedupeLinks([...(current?.links ?? []), ...(source.links ?? [])]),
    profileUrl: source.url ?? current?.profileUrl ?? "",
    tokenAddress,
    totalBoostAmount: Math.max(
      current?.totalBoostAmount ?? 0,
      "totalAmount" in source ? source.totalAmount ?? 0 : 0
    )
  });
};

const dedupeLinks = (links: DexLink[]) => {
  const linkMap = new Map<string, DexLink>();

  for (const link of links) {
    if (!link.url) {
      continue;
    }

    linkMap.set(link.url, {
      label: link.label,
      type: link.type,
      url: link.url
    });
  }

  return Array.from(linkMap.values());
};

const shouldAlertToken = (score: number, liquidityUsd: number, volume24h: number) =>
  score >= env.MIN_ALERT_SCORE &&
  liquidityUsd >= env.MIN_LIQUIDITY_USD &&
  volume24h >= env.MIN_VOLUME_24H_USD;

const wasAlertSentRecently = async (chainId: string, tokenAddress: string) => {
  const cooldownCutoff = new Date(Date.now() - ALERT_COOLDOWN_MS);

  const recentAlert = await AlertModel.findOne({
    chainId,
    sentAt: { $gte: cooldownCutoff },
    tokenAddress
  }).lean();

  return Boolean(recentAlert);
};

const persistAlert = async (payload: {
  chainId: string;
  dexscreenerUrl: string;
  liquidityUsd: number;
  message: string;
  pairAddress: string;
  priceChange24h: number;
  priceUsd: number;
  riskFlags: string[];
  score: number;
  symbol: string;
  tokenAddress: string;
  tokenName: string;
  volume24h: number;
}) =>
  AlertModel.create({
    chainId: payload.chainId,
    dexscreenerUrl: payload.dexscreenerUrl,
    liquidityUsd: payload.liquidityUsd,
    message: payload.message,
    pairAddress: payload.pairAddress,
    priceChange24h: payload.priceChange24h,
    priceUsd: payload.priceUsd,
    riskFlags: payload.riskFlags,
    score: payload.score,
    sentAt: new Date(),
    symbol: payload.symbol,
    tokenAddress: payload.tokenAddress,
    tokenName: payload.tokenName,
    volume24h: payload.volume24h
  });

const processCandidate = async (candidate: CandidateToken, snapshotAt: Date) => {
  const pairs = await dexscreenerService.getTokenPairs(candidate.chainId, candidate.tokenAddress);
  const pair = pickBestPair(pairs, candidate.tokenAddress);

  if (!pair) {
    logger.warn(`No pair data found for ${candidate.chainId}:${candidate.tokenAddress}.`);
    return;
  }

  const websites = mergeWebsites(candidate.links, pair.info?.websites ?? []);
  const socials = mergeSocials(candidate.links, pair.info?.socials ?? []);
  const boosted =
    candidate.totalBoostAmount > 0 ||
    candidate.boostAmount > 0 ||
    parseNumberish(pair.boosts?.active) > 0;
  const priceUsd = parseNumberish(pair.priceUsd);
  const liquidityUsd = parseNumberish(pair.liquidity?.usd);
  const volume24h = parseNumberish(pair.volume?.h24);
  const volume6h = parseNumberish(pair.volume?.h6);
  const volume1h = parseNumberish(pair.volume?.h1);
  const volume5m = parseNumberish(pair.volume?.m5);
  const priceChange24h = parseNumberish(pair.priceChange?.h24);
  const priceChange6h = parseNumberish(pair.priceChange?.h6);
  const priceChange1h = parseNumberish(pair.priceChange?.h1);
  const priceChange5m = parseNumberish(pair.priceChange?.m5);
  const txns5mBuys = parseNumberish(pair.txns?.m5?.buys);
  const txns5mSells = parseNumberish(pair.txns?.m5?.sells);
  const txns1hBuys = parseNumberish(pair.txns?.h1?.buys);
  const txns1hSells = parseNumberish(pair.txns?.h1?.sells);
  const pairCreatedAt = pair.pairCreatedAt ? new Date(pair.pairCreatedAt) : null;
  const { entryBias, flowState, riskFlags, riskLevel, score, volumeToLiquidityRatio } = scoreToken({
    boosted,
    liquidityUsd,
    pairCreatedAt,
    priceChange1h,
    priceChange5m,
    priceChange24h,
    socials,
    txns1hBuys,
    txns1hSells,
    txns5mBuys,
    txns5mSells,
    volume5m,
    volume1h,
    volume24h,
    volume6h,
    websites
  });

  const tokenName = pair.baseToken?.name?.trim() || "Unknown Token";
  const symbol = pair.baseToken?.symbol?.trim() || "UNKNOWN";
  const dexscreenerUrl = pair.url ?? candidate.profileUrl;
  const upsertPayload = {
    boostAmount: candidate.boostAmount,
    boosted,
    chainId: candidate.chainId,
    description: candidate.description,
    dexscreenerUrl,
    dexId: pair.dexId ?? "",
    entryBias,
    fdv: pair.fdv ?? null,
    flowState,
    imageUrl: pair.info?.imageUrl ?? candidate.imageUrl,
    lastScannedAt: new Date(),
    liquidityUsd,
    marketCap: pair.marketCap ?? null,
    name: tokenName,
    pairAddress: pair.pairAddress ?? "",
    pairCreatedAt,
    priceChange24h,
    priceChange6h,
    priceChange1h,
    priceChange5m,
    priceUsd,
    riskFlags,
    riskLevel,
    score,
    socials,
    symbol,
    tokenAddress: candidate.tokenAddress,
    totalBoostAmount: Math.max(candidate.totalBoostAmount, parseNumberish(pair.boosts?.active)),
    txns1hBuys,
    txns1hSells,
    txns5mBuys,
    txns5mSells,
    volume5m,
    volume1h,
    volume24h,
    volume6h,
    volumeToLiquidityRatio,
    websites
  };

  await TokenModel.findOneAndUpdate(
    {
      chainId: candidate.chainId,
      tokenAddress: candidate.tokenAddress
    },
    { $set: upsertPayload },
    {
      new: true,
      setDefaultsOnInsert: true,
      upsert: true
    }
  );

  await TokenScanHistoryModel.create({
    boosted,
    chainId: candidate.chainId,
    liquidityUsd,
    name: tokenName,
    pairAddress: pair.pairAddress ?? "",
    priceChange24h,
    priceChange1h,
    priceChange5m,
    priceUsd,
    riskFlags,
    score,
    snapshotAt,
    symbol,
    tokenAddress: candidate.tokenAddress,
    txns1hBuys,
    txns1hSells,
    txns5mBuys,
    txns5mSells,
    volume5m,
    volume1h,
    volume24h,
    volume6h
  });

  if (!shouldAlertToken(score, liquidityUsd, volume24h)) {
    return;
  }

  if (await wasAlertSentRecently(candidate.chainId, candidate.tokenAddress)) {
    logger.info(`Skipping duplicate alert for ${candidate.chainId}:${candidate.tokenAddress}.`);
    return;
  }

  const message = await telegramService.sendTokenAlert({
    chainId: candidate.chainId,
    dexscreenerUrl,
    liquidityUsd,
    name: tokenName,
    priceChange24h,
    priceUsd,
    riskFlags,
    score,
    symbol,
    volume24h
  });

  if (!message) {
    return;
  }

  await persistAlert({
    chainId: candidate.chainId,
    dexscreenerUrl,
    liquidityUsd,
    message,
    pairAddress: pair.pairAddress ?? "",
    priceChange24h,
    priceUsd,
    riskFlags,
    score,
    symbol,
    tokenAddress: candidate.tokenAddress,
    tokenName,
    volume24h
  });
};

export const runTokenScan = async (trigger: "startup" | "cron" = "cron") => {
  if (isScanRunning) {
    logger.warn(`Token scan skipped because a previous run is still active. Trigger: ${trigger}`);
    return;
  }

  isScanRunning = true;
  const startedAt = Date.now();
  const snapshotAt = new Date();

  try {
    logger.info(`Token scan started. Trigger: ${trigger}`);

    const [latestProfiles, latestBoostedTokens, topBoostedTokens] = await Promise.all([
      dexscreenerService.getLatestTokenProfiles(),
      dexscreenerService.getLatestBoostedTokens(),
      dexscreenerService.getTopBoostedTokens()
    ]);

    const candidateMap = new Map<string, CandidateToken>();

    latestProfiles.forEach((profile) => ensureCandidate(candidateMap, profile));
    latestBoostedTokens.forEach((token) => ensureCandidate(candidateMap, token));
    topBoostedTokens.forEach((token) => ensureCandidate(candidateMap, token));

    const candidates = Array.from(candidateMap.values())
      .sort((left, right) => {
        if (right.totalBoostAmount !== left.totalBoostAmount) {
          return right.totalBoostAmount - left.totalBoostAmount;
        }

        return right.boostAmount - left.boostAmount;
      })
      .slice(0, MAX_TOKENS_PER_SCAN);

    for (const candidate of candidates) {
      try {
        await processCandidate(candidate, snapshotAt);
      } catch (error) {
        logger.error(`Failed to process candidate ${candidate.chainId}:${candidate.tokenAddress}.`, error);
      }
    }

    logger.info("Token scan completed.", {
      candidateCount: candidates.length,
      durationMs: Date.now() - startedAt
    });
  } catch (error) {
    logger.error("Token scan failed.", error);
  } finally {
    isScanRunning = false;
  }
};

export const startTokenScanner = () => {
  const expression = `*/${env.SCAN_INTERVAL_MINUTES} * * * *`;

  cron.schedule(expression, () => {
    void runTokenScan("cron");
  });

  logger.info(`Token scanner scheduled with cron expression "${expression}".`);
};
