import type { TokenHistoryPoint, TokenTrendSummary, TokenRecord } from "../types";
import { formatCurrency, formatDateTime, formatPercent, formatPrice } from "../utils/format";
import { ScoreBadge } from "./ScoreBadge";

type HistoryMetric = "priceUsd" | "score" | "volume24h";

interface HistoryChartProps {
  history: TokenHistoryPoint[];
  loading: boolean;
  metric: HistoryMetric;
  onMetricChange: (metric: HistoryMetric) => void;
  token: TokenRecord | null;
  trendSummary: TokenTrendSummary | null;
}

const METRIC_META: Record<
  HistoryMetric,
  {
    formatter: (value: number) => string;
    label: string;
  }
> = {
  priceUsd: {
    formatter: formatPrice,
    label: "Price"
  },
  score: {
    formatter: (value) => `${Math.round(value)}`,
    label: "Score"
  },
  volume24h: {
    formatter: formatCurrency,
    label: "24h volume"
  }
};

const MOMENTUM_META: Record<
  TokenTrendSummary["momentumLabel"],
  {
    copy: string;
    tone: "cooling" | "flat" | "positive" | "warning";
  }
> = {
  COOLING: {
    copy: "Cooling after a stronger earlier move.",
    tone: "cooling"
  },
  MIXED: {
    copy: "Mixed momentum across recent windows.",
    tone: "flat"
  },
  NO_DATA: {
    copy: "Not enough history yet.",
    tone: "flat"
  },
  REVERSING: {
    copy: "Recent windows are rolling over.",
    tone: "warning"
  },
  STILL_MOVING: {
    copy: "Short and medium windows are still positive.",
    tone: "positive"
  }
};

const buildCoordinates = (values: number[]) => {
  if (values.length === 0) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;

    return { x, y };
  });
};

const buildLinePath = (values: number[]) => {
  const coordinates = buildCoordinates(values);

  if (coordinates.length === 0) {
    return "";
  }

  return coordinates
    .map((coordinate, index) =>
      `${index === 0 ? "M" : "L"} ${coordinate.x.toFixed(2)} ${coordinate.y.toFixed(2)}`
    )
    .join(" ");
};

const buildAreaPath = (values: number[]) => {
  const coordinates = buildCoordinates(values);

  if (coordinates.length === 0) {
    return "";
  }

  const firstPoint = coordinates[0];
  const lastPoint = coordinates[coordinates.length - 1];
  const linePath = coordinates
    .map((coordinate, index) =>
      `${index === 0 ? "M" : "L"} ${coordinate.x.toFixed(2)} ${coordinate.y.toFixed(2)}`
    )
    .join(" ");

  return `${linePath} L ${lastPoint.x.toFixed(2)} 100 L ${firstPoint.x.toFixed(2)} 100 Z`;
};

const formatNullablePercent = (value: number | null) => (value === null ? "N/A" : formatPercent(value));
const formatNullablePriceDelta = (value: number | null) =>
  value === null ? "N/A" : `${value >= 0 ? "+" : "-"}${formatPrice(Math.abs(value))}`;

export function HistoryChart({
  history,
  loading,
  metric,
  onMetricChange,
  token,
  trendSummary
}: HistoryChartProps) {
  const values = history.map((point) => point[metric]);
  const meta = METRIC_META[metric];
  const latestPoint = history.length > 0 ? history[history.length - 1] : null;
  const latestValue = values.length > 0 ? values[values.length - 1] : 0;
  const highestValue = values.length > 0 ? Math.max(...values) : 0;
  const lowestValue = values.length > 0 ? Math.min(...values) : 0;
  const linePath = buildLinePath(values);
  const areaPath = buildAreaPath(values);
  const momentumMeta = trendSummary ? MOMENTUM_META[trendSummary.momentumLabel] : MOMENTUM_META.NO_DATA;

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Scan history</p>
          <h2>{token ? `${token.name} (${token.symbol})` : "Select a token"}</h2>
        </div>
        {token ? <ScoreBadge score={token.score} /> : null}
      </div>

      <div className="segmented-control">
        {(["score", "priceUsd", "volume24h"] as HistoryMetric[]).map((option) => (
          <button
            className={`segment-button ${metric === option ? "segment-button--active" : ""}`}
            key={option}
            onClick={() => onMetricChange(option)}
            type="button"
          >
            {METRIC_META[option].label}
          </button>
        ))}
      </div>

      {!token ? (
        <div className="empty-state">
          <p>Select a token from the table or watchlist to see scan history.</p>
        </div>
      ) : loading ? (
        <div className="empty-state">
          <p>Loading history...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="empty-state">
          <p>No history captured yet.</p>
          <span className="muted-copy">
            Wait for another scanner run and the chart will begin filling in.
          </span>
        </div>
      ) : (
        <>
          <div className={`momentum-banner momentum-banner--${momentumMeta.tone}`}>
            <strong>{momentumMeta.copy}</strong>
            <span className="muted-copy">Updated {formatDateTime(trendSummary?.generatedAt ?? null)}</span>
          </div>

          <div className="trend-grid">
            {trendSummary?.windows.map((window) => (
              <article
                className="trend-card"
                key={window.label}
              >
                <div className="trend-card__top">
                  <span className="eyebrow">{window.label}</span>
                  <span
                    className={`trend-pill ${
                      (window.priceChangePercent ?? 0) > 0
                        ? "trend-pill--up"
                        : (window.priceChangePercent ?? 0) < 0
                          ? "trend-pill--down"
                          : ""
                    }`}
                  >
                    {formatNullablePercent(window.priceChangePercent)}
                  </span>
                </div>
                <strong>{formatNullablePriceDelta(window.priceChangeUsd)}</strong>
                <div className="trend-card__meta">
                  <span>1h vol {formatNullablePercent(window.volume1hChangePercent)}</span>
                  <span>Score {window.scoreChange === null ? "N/A" : `${window.scoreChange >= 0 ? "+" : ""}${window.scoreChange}`}</span>
                </div>
              </article>
            ))}
          </div>

          <div className="history-chart">
            <svg
              className="history-chart__svg"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              <defs>
                <linearGradient
                  id="historyAreaGradient"
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="rgba(255, 214, 110, 0.42)"
                  />
                  <stop
                    offset="100%"
                    stopColor="rgba(255, 214, 110, 0.04)"
                  />
                </linearGradient>
              </defs>

              {[20, 40, 60, 80].map((line) => (
                <line
                  className="history-chart__grid"
                  key={line}
                  x1="0"
                  x2="100"
                  y1={line}
                  y2={line}
                />
              ))}

              <path
                className="history-chart__area"
                d={areaPath}
              />
              <path
                className="history-chart__line"
                d={linePath}
              />
            </svg>
          </div>

          <div className="history-stats">
            <div>
              <span className="eyebrow">Latest</span>
              <strong>{meta.formatter(latestValue)}</strong>
            </div>
            <div>
              <span className="eyebrow">High</span>
              <strong>{meta.formatter(highestValue)}</strong>
            </div>
            <div>
              <span className="eyebrow">Low</span>
              <strong>{meta.formatter(lowestValue)}</strong>
            </div>
          </div>

          <p className="muted-copy">Newest snapshot {formatDateTime(latestPoint?.snapshotAt ?? null)}</p>
        </>
      )}
    </section>
  );
}
