import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";

import { apiClient } from "./api/client";
import { AlertList } from "./components/AlertList";
import { Filters, type FilterValues } from "./components/Filters";
import { HistoryChart } from "./components/HistoryChart";
import { Pagination } from "./components/Pagination";
import { TokenCard } from "./components/TokenCard";
import { TokenTable } from "./components/TokenTable";
import { WatchlistPanel } from "./components/WatchlistPanel";
import type {
  PaginatedResponse,
  TokenHistoryPoint,
  TokenListResponse,
  TokenQueryParams,
  TokenRecord,
  WatchlistEntry
} from "./types";
import { formatCompactNumber, formatDateTime } from "./utils/format";

const REFRESH_INTERVAL_MS = 60_000;
const TOKEN_PAGE_SIZE = 20;
const ALERT_PAGE_SIZE = 6;

const DEFAULT_FILTERS: FilterValues = {
  boostedOnly: false,
  favoritesOnly: false,
  highScoreOnly: false,
  maxPairAgeHours: "",
  minLiquidityUsd: "",
  minScore: "",
  minVolume24h: "",
  riskFlag: "all",
  searchQuery: "",
  selectedChain: "all",
  sortBy: "score",
  sortOrder: "desc"
};

const toNumberOrUndefined = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value.trim().length > 0 ? parsed : undefined;
};

export default function App() {
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [alertPage, setAlertPage] = useState(1);
  const [tokensResponse, setTokensResponse] = useState<TokenListResponse | null>(null);
  const [alertsResponse, setAlertsResponse] = useState<PaginatedResponse<{
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
  }> | null>(null);
  const [watchlistEntries, setWatchlistEntries] = useState<WatchlistEntry[]>([]);
  const [selectedTokenRef, setSelectedTokenRef] = useState<{
    chainId: string;
    tokenAddress: string;
  } | null>(null);
  const [history, setHistory] = useState<TokenHistoryPoint[]>([]);
  const [historyMetric, setHistoryMetric] = useState<"priceUsd" | "score" | "volume24h">("score");
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [favoriteBusyKey, setFavoriteBusyKey] = useState<string | null>(null);
  const [watchlistSavingId, setWatchlistSavingId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const deferredSearchQuery = useDeferredValue(filters.searchQuery);

  const triggerRefresh = () => {
    setRefreshing(true);
    startTransition(() => {
      setRefreshTick((current) => current + 1);
    });
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      triggerRefresh();
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadTokens = async () => {
      setLoadingTokens(true);

      try {
        const query: TokenQueryParams = {
          boostedOnly: filters.boostedOnly,
          chainId: filters.selectedChain,
          favoritesOnly: filters.favoritesOnly,
          highScoreOnly: filters.highScoreOnly,
          limit: TOKEN_PAGE_SIZE,
          maxPairAgeHours: toNumberOrUndefined(filters.maxPairAgeHours),
          minLiquidityUsd: toNumberOrUndefined(filters.minLiquidityUsd),
          minScore: toNumberOrUndefined(filters.minScore),
          minVolume24h: toNumberOrUndefined(filters.minVolume24h),
          page,
          q: deferredSearchQuery,
          riskFlag: filters.riskFlag,
          sortBy: filters.sortBy as TokenQueryParams["sortBy"],
          sortOrder: filters.sortOrder
        };
        const data = await apiClient.getTokens(query);

        if (cancelled) {
          return;
        }

        setTokensResponse(data);
        setLastUpdated(new Date().toISOString());
        setError(null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load tokens.");
        }
      } finally {
        if (!cancelled) {
          setLoadingTokens(false);
          setRefreshing(false);
        }
      }
    };

    void loadTokens();

    return () => {
      cancelled = true;
    };
  }, [
    deferredSearchQuery,
    filters.boostedOnly,
    filters.favoritesOnly,
    filters.highScoreOnly,
    filters.maxPairAgeHours,
    filters.minLiquidityUsd,
    filters.minScore,
    filters.minVolume24h,
    filters.riskFlag,
    filters.selectedChain,
    filters.sortBy,
    filters.sortOrder,
    page,
    refreshTick
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadAlerts = async () => {
      try {
        const data = await apiClient.getAlerts(alertPage, ALERT_PAGE_SIZE);

        if (!cancelled) {
          setAlertsResponse(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load alerts.");
        }
      }
    };

    void loadAlerts();

    return () => {
      cancelled = true;
    };
  }, [alertPage, refreshTick]);

  useEffect(() => {
    let cancelled = false;

    const loadWatchlist = async () => {
      try {
        const data = await apiClient.getWatchlist();

        if (!cancelled) {
          setWatchlistEntries(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load watchlist.");
        }
      }
    };

    void loadWatchlist();

    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  useEffect(() => {
    if (!selectedTokenRef && tokensResponse?.items[0]) {
      setSelectedTokenRef({
        chainId: tokensResponse.items[0].chainId,
        tokenAddress: tokensResponse.items[0].tokenAddress
      });
    }
  }, [selectedTokenRef, tokensResponse]);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      if (!selectedTokenRef) {
        setHistory([]);
        return;
      }

      setHistoryLoading(true);

      try {
        const data = await apiClient.getTokenHistory(
          selectedTokenRef.chainId,
          selectedTokenRef.tokenAddress,
          24
        );

        if (!cancelled) {
          setHistory(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load history.");
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [refreshTick, selectedTokenRef]);

  const selectedToken = useMemo(() => {
    if (!selectedTokenRef) {
      return null;
    }

    const tokenFromPage = tokensResponse?.items.find(
      (token) =>
        token.chainId === selectedTokenRef.chainId &&
        token.tokenAddress === selectedTokenRef.tokenAddress
    );

    if (tokenFromPage) {
      return tokenFromPage;
    }

    return (
      watchlistEntries.find(
        (entry) =>
          entry.token &&
          entry.chainId === selectedTokenRef.chainId &&
          entry.tokenAddress === selectedTokenRef.tokenAddress
      )?.token ?? null
    );
  }, [selectedTokenRef, tokensResponse, watchlistEntries]);

  const handleFilterChange = (field: keyof FilterValues, value: string | boolean) => {
    setFilters((current) => ({
      ...current,
      [field]: value
    }));
    startTransition(() => {
      setPage(1);
    });
  };

  const handleSelectToken = (token: TokenRecord) => {
    setSelectedTokenRef({
      chainId: token.chainId,
      tokenAddress: token.tokenAddress
    });
  };

  const handleToggleFavorite = async (token: TokenRecord) => {
    const tokenKey = `${token.chainId}:${token.tokenAddress}`;
    setFavoriteBusyKey(tokenKey);

    try {
      if (token.isFavorite && token.watchlistId) {
        await apiClient.removeFromWatchlist(token.watchlistId);
      } else {
        await apiClient.addToWatchlist({
          chainId: token.chainId,
          note: token.watchlistNote,
          tags: token.watchlistTags,
          tokenAddress: token.tokenAddress
        });
      }

      triggerRefresh();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Failed to update watchlist.");
    } finally {
      setFavoriteBusyKey(null);
    }
  };

  const handleSaveWatchlist = async (entry: WatchlistEntry, note: string, tags: string[]) => {
    setWatchlistSavingId(entry._id);

    try {
      await apiClient.updateWatchlist(entry._id, {
        note,
        tags
      });

      triggerRefresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save watchlist note.");
    } finally {
      setWatchlistSavingId(null);
    }
  };

  const handleRemoveWatchlist = async (entry: WatchlistEntry) => {
    setWatchlistSavingId(entry._id);

    try {
      await apiClient.removeFromWatchlist(entry._id);
      triggerRefresh();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Failed to remove watchlist entry.");
    } finally {
      setWatchlistSavingId(null);
    }
  };

  const tokenItems = tokensResponse?.items ?? [];
  const availableChains = tokensResponse?.availableChains ?? [];
  const tokenPagination = tokensResponse?.pagination;
  const alertItems = alertsResponse?.items ?? [];
  const alertPagination = alertsResponse?.pagination;
  const selectedTokenKey = selectedToken
    ? `${selectedToken.chainId}:${selectedToken.tokenAddress}`
    : null;

  return (
    <div className="app-shell">
      <div className="background-orb background-orb--left" />
      <div className="background-orb background-orb--right" />

      <main className="dashboard">
        <section className="hero panel">
          <div className="hero-copy">
            <p className="eyebrow">Crypto Radar Plus</p>
            <h1>Review new token momentum with fewer blind spots and a tighter workflow.</h1>
            <p className="hero-text">
              Server-side filtering, paginated discovery, scan history, and a research watchlist
              now sit on top of the same alerting engine you already wired into MongoDB and Telegram.
            </p>
          </div>

          <div className="hero-status">
            <button
              className="refresh-button"
              onClick={triggerRefresh}
              type="button"
            >
              {refreshing ? "Refreshing..." : "Refresh now"}
            </button>

            <div className="status-stack">
              <span className={`status-pill ${refreshing ? "status-pill--live" : ""}`}>
                {refreshing ? "Refreshing feed" : "Auto-refresh every 60s"}
              </span>
              <span className="muted-copy">Last sync {formatDateTime(lastUpdated)}</span>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <article className="stat-card panel">
            <span className="eyebrow">Tracked tokens</span>
            <strong>{formatCompactNumber(tokenPagination?.total ?? 0)}</strong>
          </article>
          <article className="stat-card panel">
            <span className="eyebrow">Current page</span>
            <strong>{formatCompactNumber(tokenItems.length)}</strong>
          </article>
          <article className="stat-card panel">
            <span className="eyebrow">Saved watchlist</span>
            <strong>{formatCompactNumber(watchlistEntries.length)}</strong>
          </article>
          <article className="stat-card panel">
            <span className="eyebrow">Chains</span>
            <strong>{formatCompactNumber(availableChains.length)}</strong>
          </article>
        </section>

        <section className="content-grid">
          <div className="content-grid__main">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Scanner output</p>
                  <h2>Discovery queue</h2>
                </div>
                <span className="muted-copy">
                  {tokenPagination ? `${tokenPagination.total} matched tokens` : "Loading results"}
                </span>
              </div>

              <Filters
                chains={availableChains}
                onChange={handleFilterChange}
                onReset={() => {
                  setFilters(DEFAULT_FILTERS);
                  setPage(1);
                }}
                values={filters}
              />

              {error ? <div className="error-banner">{error}</div> : null}

              {loadingTokens ? (
                <div className="empty-state">
                  <p>Loading dashboard...</p>
                  <span className="muted-copy">
                    The backend may still be warming up its latest DexScreener scan.
                  </span>
                </div>
              ) : tokenItems.length === 0 ? (
                <div className="empty-state">
                  <p>No tokens match the current filters.</p>
                  <span className="muted-copy">
                    Try clearing a filter, broadening pair age, or resetting the search.
                  </span>
                </div>
              ) : (
                <>
                  <TokenTable
                    onSelectToken={handleSelectToken}
                    onToggleFavorite={handleToggleFavorite}
                    pendingFavoriteKey={favoriteBusyKey}
                    selectedTokenKey={selectedTokenKey}
                    tokens={tokenItems}
                  />
                  <div className="card-stack">
                    {tokenItems.map((token) => (
                      <TokenCard
                        key={token._id}
                        onSelectToken={handleSelectToken}
                        onToggleFavorite={handleToggleFavorite}
                        pendingFavoriteKey={favoriteBusyKey}
                        selectedTokenKey={selectedTokenKey}
                        token={token}
                      />
                    ))}
                  </div>

                  <Pagination
                    onPageChange={(nextPage) => {
                      startTransition(() => {
                        setPage(nextPage);
                      });
                    }}
                    page={tokenPagination?.page ?? 1}
                    totalPages={tokenPagination?.totalPages ?? 1}
                  />
                </>
              )}
            </section>
          </div>

          <div className="content-grid__side">
            <HistoryChart
              history={history}
              loading={historyLoading}
              metric={historyMetric}
              onMetricChange={setHistoryMetric}
              token={selectedToken}
            />

            <WatchlistPanel
              entries={watchlistEntries}
              onRemove={handleRemoveWatchlist}
              onSave={handleSaveWatchlist}
              onSelect={handleSelectToken}
              savingId={watchlistSavingId}
              selectedTokenKey={selectedTokenKey}
            />
          </div>
        </section>

        <AlertList
          alerts={alertItems}
          onPageChange={(nextPage) => {
            startTransition(() => {
              setAlertPage(nextPage);
            });
          }}
          page={alertPagination?.page ?? 1}
          totalPages={alertPagination?.totalPages ?? 1}
        />
      </main>
    </div>
  );
}
