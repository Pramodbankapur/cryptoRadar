import type { TokenRecord } from "../types";
import {
  formatCurrency,
  formatDateTime,
  formatPercent,
  formatPrice,
  formatRelativeAge
} from "../utils/format";
import { ScoreBadge } from "./ScoreBadge";

const formatSignal = (value: string) => value.split("_").join(" ");

interface TokenCardProps {
  onSelectToken: (token: TokenRecord) => void;
  onToggleFavorite: (token: TokenRecord) => void;
  pendingFavoriteKey: string | null;
  selectedTokenKey: string | null;
  token: TokenRecord;
}

export function TokenCard({
  onSelectToken,
  onToggleFavorite,
  pendingFavoriteKey,
  selectedTokenKey,
  token
}: TokenCardProps) {
  const tokenKey = `${token.chainId}:${token.tokenAddress}`;

  return (
    <article
      className={`token-card mobile-only ${selectedTokenKey === tokenKey ? "token-card--selected" : ""}`}
      onClick={() => onSelectToken(token)}
    >
      <div className="token-card__header">
        <div>
          <div className="token-symbol">{token.symbol}</div>
          <div className="token-name">{token.name}</div>
        </div>
        <div className="token-card__actions">
          <button
            className={`favorite-button ${token.isFavorite ? "favorite-button--active" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(token);
            }}
            type="button"
          >
            {pendingFavoriteKey === tokenKey ? "Saving..." : token.isFavorite ? "Saved" : "Save"}
          </button>
          <ScoreBadge score={token.score} />
        </div>
      </div>

      <div className="token-card__grid">
        <div>
          <span className="eyebrow">Setup</span>
          <strong>{token.riskLevel}</strong>
          <span className="muted-copy">{formatSignal(token.entryBias)}</span>
        </div>
        <div>
          <span className="eyebrow">Flow</span>
          <strong>{formatSignal(token.flowState)}</strong>
          <span className="muted-copy">
            {token.txns5mBuys + token.txns5mSells > 0
              ? `${Math.round((token.txns5mBuys / (token.txns5mBuys + token.txns5mSells)) * 100)}% buys in 5m`
              : "No recent flow"}
          </span>
        </div>
        <div>
          <span className="eyebrow">Chain</span>
          <strong>{token.chainId}</strong>
        </div>
        <div>
          <span className="eyebrow">Price</span>
          <strong>{formatPrice(token.priceUsd)}</strong>
        </div>
        <div>
          <span className="eyebrow">Liquidity</span>
          <strong>{formatCurrency(token.liquidityUsd)}</strong>
        </div>
        <div>
          <span className="eyebrow">24h Volume</span>
          <strong>{formatCurrency(token.volume24h)}</strong>
        </div>
        <div>
          <span className="eyebrow">24h Change</span>
          <strong className={token.priceChange24h >= 0 ? "positive" : "negative"}>
            {formatPercent(token.priceChange24h)}
          </strong>
        </div>
        <div>
          <span className="eyebrow">5m / 1h</span>
          <strong className={token.priceChange5m >= 0 ? "positive" : "negative"}>
            {formatPercent(token.priceChange5m)}
          </strong>
          <span className={`muted-copy ${token.priceChange1h >= 0 ? "positive" : "negative"}`}>
            {formatPercent(token.priceChange1h)}
          </span>
        </div>
        <div>
          <span className="eyebrow">Age</span>
          <strong>{formatRelativeAge(token.pairCreatedAt)}</strong>
        </div>
      </div>

      {token.watchlistNote ? <p className="token-note">{token.watchlistNote}</p> : null}

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
          <span className="muted-copy">No active risk flags</span>
        )}
      </div>

      <div className="token-card__footer">
        <span className="muted-copy">Scanned {formatDateTime(token.lastScannedAt)}</span>
        <a
          className="dex-link"
          href={token.dexscreenerUrl}
          onClick={(event) => event.stopPropagation()}
          rel="noreferrer"
          target="_blank"
        >
          View on DexScreener
        </a>
      </div>
    </article>
  );
}
