import type { TokenRecord } from "../types";
import { formatCurrency, formatPercent, formatPrice, formatRelativeAge } from "../utils/format";
import { ScoreBadge } from "./ScoreBadge";

const formatSignal = (value: string) => value.split("_").join(" ");

interface TokenTableProps {
  onSelectToken: (token: TokenRecord) => void;
  onToggleFavorite: (token: TokenRecord) => void;
  pendingFavoriteKey: string | null;
  selectedTokenKey: string | null;
  tokens: TokenRecord[];
}

export function TokenTable({
  onSelectToken,
  onToggleFavorite,
  pendingFavoriteKey,
  selectedTokenKey,
  tokens
}: TokenTableProps) {
  return (
    <div className="table-shell desktop-only">
      <table className="token-table">
        <thead>
          <tr>
            <th>Favorite</th>
            <th>Token</th>
            <th>Chain</th>
            <th>Price</th>
            <th>Liquidity</th>
            <th>24h Volume</th>
            <th>24h Change</th>
            <th>Score</th>
            <th>Risk Flags</th>
            <th>DexScreener</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => {
            const tokenKey = `${token.chainId}:${token.tokenAddress}`;

            return (
              <tr
                className={selectedTokenKey === tokenKey ? "token-table__row--selected" : ""}
                key={token._id}
                onClick={() => onSelectToken(token)}
              >
                <td>
                  <button
                    className={`favorite-button ${token.isFavorite ? "favorite-button--active" : ""}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleFavorite(token);
                    }}
                    type="button"
                  >
                    {pendingFavoriteKey === tokenKey
                      ? "Saving..."
                      : token.isFavorite
                        ? "Saved"
                        : "Save"}
                  </button>
                </td>
                <td>
                  <div className="token-cell">
                    <span className="token-symbol">{token.symbol}</span>
                    <span className="token-name">{token.name}</span>
                    <span className="token-meta">{formatRelativeAge(token.pairCreatedAt)}</span>
                    <div className="meta-chip-row">
                      <span className={`meta-chip meta-chip--${token.riskLevel.toLowerCase()}`}>
                        {token.riskLevel}
                      </span>
                      <span className="meta-chip">{formatSignal(token.entryBias)}</span>
                      <span className="meta-chip">{formatSignal(token.flowState)}</span>
                    </div>
                    <span className="token-meta">
                      5m {formatPercent(token.priceChange5m)} • 1h {formatPercent(token.priceChange1h)} •
                      Flow {token.txns5mBuys + token.txns5mSells > 0
                        ? `${Math.round((token.txns5mBuys / (token.txns5mBuys + token.txns5mSells)) * 100)}% buys`
                        : "No recent flow"}
                    </span>
                    {token.watchlistNote ? (
                      <span className="token-note">Note: {token.watchlistNote}</span>
                    ) : null}
                  </div>
                </td>
                <td>
                  <span className="pill">{token.chainId}</span>
                </td>
                <td>{formatPrice(token.priceUsd)}</td>
                <td>{formatCurrency(token.liquidityUsd)}</td>
                <td>{formatCurrency(token.volume24h)}</td>
                <td className={token.priceChange24h >= 0 ? "positive" : "negative"}>
                  {formatPercent(token.priceChange24h)}
                </td>
                <td>
                  <ScoreBadge score={token.score} />
                </td>
                <td>
                  <div className="flag-list">
                    {token.riskFlags.length > 0 ? (
                      token.riskFlags.map((flag) => (
                        <span
                          className="flag-chip"
                          key={`${token._id}-${flag}`}
                        >
                          {flag}
                        </span>
                      ))
                    ) : (
                      <span className="muted-copy">None</span>
                    )}
                  </div>
                </td>
                <td>
                  <a
                    className="dex-link"
                    href={token.dexscreenerUrl}
                    onClick={(event) => event.stopPropagation()}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
