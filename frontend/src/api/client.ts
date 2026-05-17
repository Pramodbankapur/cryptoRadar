import type {
  AlertRecord,
  PaginatedResponse,
  TokenHistoryResponse,
  TokenHistoryPoint,
  TokenListResponse,
  TokenQueryParams,
  WatchlistEntry
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

const createQueryString = (params: object) => {
  const searchParams = new URLSearchParams();

  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === "" || Number.isNaN(value)) {
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
};

export const apiClient = {
  addToWatchlist: (payload: {
    chainId: string;
    note?: string;
    tags?: string[];
    tokenAddress: string;
  }) =>
    request<WatchlistEntry>("/watchlist", {
      body: JSON.stringify(payload),
      method: "POST"
    }),
  getAlerts: (page = 1, limit = 8) =>
    request<PaginatedResponse<AlertRecord>>(
      `/alerts${createQueryString({
        limit,
        page
      })}`
    ),
  getTokenHistory: (chainId: string, tokenAddress: string, limit = 24) =>
    request<TokenHistoryResponse>(
      `/tokens/${encodeURIComponent(chainId)}/${encodeURIComponent(tokenAddress)}/history${createQueryString(
        {
          limit
        }
      )}`
    ),
  getTokens: (params: TokenQueryParams) =>
    request<TokenListResponse>(`/tokens${createQueryString(params)}`),
  getWatchlist: () => request<WatchlistEntry[]>("/watchlist"),
  removeFromWatchlist: (watchlistId: string) =>
    request<void>(`/watchlist/${encodeURIComponent(watchlistId)}`, {
      method: "DELETE"
    }),
  updateWatchlist: (watchlistId: string, payload: { note?: string; tags?: string[] }) =>
    request<WatchlistEntry>(`/watchlist/${encodeURIComponent(watchlistId)}`, {
      body: JSON.stringify(payload),
      method: "PATCH"
    })
};
