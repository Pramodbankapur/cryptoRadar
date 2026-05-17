const currencyFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  notation: "compact"
});

const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
  notation: "compact"
});

export const formatPrice = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return "$0.00";
  }

  if (value >= 1) {
    return `$${value.toLocaleString("en-US", {
      maximumFractionDigits: 4
    })}`;
  }

  return `$${value.toLocaleString("en-US", {
    maximumFractionDigits: 8
  })}`;
};

export const formatCurrency = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return "$0";
  }

  if (value < 1000) {
    return `$${value.toLocaleString("en-US", {
      maximumFractionDigits: 2
    })}`;
  }

  return `$${currencyFormatter.format(value)}`;
};

export const formatCompactNumber = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }

  return integerFormatter.format(value);
};

export const formatPercent = (value: number) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${safeValue >= 0 ? "+" : ""}${safeValue.toFixed(2)}%`;
};

export const formatDateTime = (value: string | null) => {
  if (!value) {
    return "Unknown";
  }

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

export const formatRelativeAge = (value: string | null) => {
  if (!value) {
    return "Unknown";
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "Unknown";
  }

  const deltaMs = Date.now() - timestamp;
  const minutes = Math.floor(deltaMs / (1000 * 60));

  if (minutes < 60) {
    return `${Math.max(minutes, 0)}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};
