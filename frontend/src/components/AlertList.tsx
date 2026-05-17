import type { AlertRecord } from "../types";
import { formatCurrency, formatDateTime, formatPercent, formatPrice } from "../utils/format";
import { Pagination } from "./Pagination";
import { ScoreBadge } from "./ScoreBadge";

interface AlertListProps {
  alerts: AlertRecord[];
  onPageChange: (page: number) => void;
  page: number;
  totalPages: number;
}

export function AlertList({ alerts, onPageChange, page, totalPages }: AlertListProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Latest alerts</p>
          <h2>Telegram-worthy tokens</h2>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="empty-state">
          <p>No alerts have been sent yet.</p>
          <span className="muted-copy">
            A token needs to pass the score, liquidity, and 24h volume thresholds before it lands here.
          </span>
        </div>
      ) : (
        <>
          <div className="alert-list">
            {alerts.map((alert) => (
              <article
                className="alert-item"
                key={alert._id}
              >
                <div className="alert-item__top">
                  <div>
                    <strong>
                      {alert.tokenName} ({alert.symbol})
                    </strong>
                    <div className="muted-copy">
                      {alert.chainId} • {formatDateTime(alert.sentAt)}
                    </div>
                  </div>
                  <ScoreBadge score={alert.score} />
                </div>

                <div className="alert-item__stats">
                  <span>Price {formatPrice(alert.priceUsd)}</span>
                  <span>Liquidity {formatCurrency(alert.liquidityUsd)}</span>
                  <span>24h Volume {formatCurrency(alert.volume24h)}</span>
                  <span className={alert.priceChange24h >= 0 ? "positive" : "negative"}>
                    {formatPercent(alert.priceChange24h)}
                  </span>
                </div>

                <div className="flag-list">
                  {alert.riskFlags.length > 0 ? (
                    alert.riskFlags.map((flag) => (
                      <span
                        className="flag-chip"
                        key={`${alert._id}-${flag}`}
                      >
                        {flag}
                      </span>
                    ))
                  ) : (
                    <span className="muted-copy">No risk flags in alert snapshot</span>
                  )}
                </div>

                <a
                  className="dex-link"
                  href={alert.dexscreenerUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open DexScreener
                </a>
              </article>
            ))}
          </div>

          <Pagination
            onPageChange={onPageChange}
            page={page}
            totalPages={totalPages}
          />
        </>
      )}
    </section>
  );
}
