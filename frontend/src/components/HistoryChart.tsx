import type { TokenHistoryPoint, TokenRecord } from "../types";
import { formatCurrency, formatDateTime, formatPrice } from "../utils/format";
import { ScoreBadge } from "./ScoreBadge";

type HistoryMetric = "priceUsd" | "score" | "volume24h";

interface HistoryChartProps {
  history: TokenHistoryPoint[];
  loading: boolean;
  metric: HistoryMetric;
  onMetricChange: (metric: HistoryMetric) => void;
  token: TokenRecord | null;
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

const buildPolyline = (values: number[]) => {
  if (values.length === 0) {
    return "";
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");
};

export function HistoryChart({
  history,
  loading,
  metric,
  onMetricChange,
  token
}: HistoryChartProps) {
  const values = history.map((point) => point[metric]);
  const meta = METRIC_META[metric];
  const latestPoint = history.length > 0 ? history[history.length - 1] : null;
  const latestValue = values.length > 0 ? values[values.length - 1] : 0;
  const highestValue = values.length > 0 ? Math.max(...values) : 0;
  const lowestValue = values.length > 0 ? Math.min(...values) : 0;

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
          <div className="history-chart">
            <svg
              className="history-chart__svg"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              <polyline
                className="history-chart__line"
                fill="none"
                points={buildPolyline(values)}
                strokeWidth="3"
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
