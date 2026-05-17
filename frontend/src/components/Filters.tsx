export interface FilterValues {
  boostedOnly: boolean;
  favoritesOnly: boolean;
  highScoreOnly: boolean;
  maxPairAgeHours: string;
  minLiquidityUsd: string;
  minScore: string;
  minVolume24h: string;
  riskFlag: string;
  searchQuery: string;
  selectedChain: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

interface FiltersProps {
  chains: string[];
  onChange: (field: keyof FilterValues, value: string | boolean) => void;
  onReset: () => void;
  values: FilterValues;
}

const RISK_FLAG_OPTIONS = [
  "all",
  "HIGH_RISK",
  "POSSIBLE_PUMP",
  "LOW_INFO",
  "VERY_NEW",
  "EXIT_LIQUIDITY_RISK"
] as const;

export function Filters({ chains, onChange, onReset, values }: FiltersProps) {
  return (
    <div className="filters-panel">
      <div className="filters-grid">
        <label className="field field--wide">
          <span className="field-label">Search</span>
          <input
            className="field-input"
            onChange={(event) => onChange("searchQuery", event.target.value)}
            placeholder="Search name, symbol, or token address"
            type="search"
            value={values.searchQuery}
          />
        </label>

        <label className="field">
          <span className="field-label">Chain</span>
          <select
            className="field-input"
            onChange={(event) => onChange("selectedChain", event.target.value)}
            value={values.selectedChain}
          >
            <option value="all">All chains</option>
            {chains.map((chain) => (
              <option
                key={chain}
                value={chain}
              >
                {chain}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Risk flag</span>
          <select
            className="field-input"
            onChange={(event) => onChange("riskFlag", event.target.value)}
            value={values.riskFlag}
          >
            {RISK_FLAG_OPTIONS.map((flag) => (
              <option
                key={flag}
                value={flag}
              >
                {flag === "all" ? "All risk flags" : flag}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Sort by</span>
          <select
            className="field-input"
            onChange={(event) => onChange("sortBy", event.target.value)}
            value={values.sortBy}
          >
            <option value="score">Score</option>
            <option value="lastScannedAt">Last scanned</option>
            <option value="volume24h">24h volume</option>
            <option value="liquidityUsd">Liquidity</option>
            <option value="priceChange24h">24h change</option>
            <option value="pairCreatedAt">Pair age</option>
          </select>
        </label>

        <label className="field">
          <span className="field-label">Order</span>
          <select
            className="field-input"
            onChange={(event) => onChange("sortOrder", event.target.value as "asc" | "desc")}
            value={values.sortOrder}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>

        <label className="field">
          <span className="field-label">Min score</span>
          <input
            className="field-input"
            min="0"
            onChange={(event) => onChange("minScore", event.target.value)}
            placeholder="e.g. 70"
            type="number"
            value={values.minScore}
          />
        </label>

        <label className="field">
          <span className="field-label">Min liquidity</span>
          <input
            className="field-input"
            min="0"
            onChange={(event) => onChange("minLiquidityUsd", event.target.value)}
            placeholder="e.g. 50000"
            type="number"
            value={values.minLiquidityUsd}
          />
        </label>

        <label className="field">
          <span className="field-label">Min 24h volume</span>
          <input
            className="field-input"
            min="0"
            onChange={(event) => onChange("minVolume24h", event.target.value)}
            placeholder="e.g. 100000"
            type="number"
            value={values.minVolume24h}
          />
        </label>

        <label className="field">
          <span className="field-label">Max pair age (hours)</span>
          <input
            className="field-input"
            min="1"
            onChange={(event) => onChange("maxPairAgeHours", event.target.value)}
            placeholder="e.g. 168"
            type="number"
            value={values.maxPairAgeHours}
          />
        </label>
      </div>

      <div className="filter-bar">
        <label className="toggle-field">
          <input
            checked={values.highScoreOnly}
            onChange={(event) => onChange("highScoreOnly", event.target.checked)}
            type="checkbox"
          />
          <span>High score only</span>
        </label>

        <label className="toggle-field">
          <input
            checked={values.favoritesOnly}
            onChange={(event) => onChange("favoritesOnly", event.target.checked)}
            type="checkbox"
          />
          <span>Favorites only</span>
        </label>

        <label className="toggle-field">
          <input
            checked={values.boostedOnly}
            onChange={(event) => onChange("boostedOnly", event.target.checked)}
            type="checkbox"
          />
          <span>Boosted only</span>
        </label>

        <button
          className="ghost-button"
          onClick={onReset}
          type="button"
        >
          Reset filters
        </button>
      </div>
    </div>
  );
}
