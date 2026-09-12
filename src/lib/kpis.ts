/**
 * Subscription KPIs, sourced from the RevenueCat integration.
 *
 * Every value here comes from `/api/kpis/*`. When RevenueCat is not connected
 * the server reports `connected: false` with empty metrics rather than failing,
 * so the UI shows a connect prompt instead of an error.
 */

export type KpiSectionId =
  | "overview"
  | "subscriptions"
  | "trials"
  | "customers"
  | "revenue"

export const KPI_SECTIONS: {
  id: KpiSectionId
  label: string
  description: string
}[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Snapshot of subscription health",
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    description: "Active paying customers",
  },
  {
    id: "trials",
    label: "Trials",
    description: "Trials in flight right now",
  },
  {
    id: "customers",
    label: "Customers",
    description: "Acquisition and active users",
  },
  {
    id: "revenue",
    label: "Revenue",
    description: "MRR, ARR, and trailing proceeds",
  },
]

/** Time series RevenueCat can chart. Mirrors `REVENUECAT_CHARTS` on the server. */
export const KPI_CHARTS = [
  "revenue",
  "mrr",
  "active_subscriptions",
  "new_customers",
  "active_trials",
  "trials_conversion",
  "churned_subscriptions",
] as const

export type KpiChartName = (typeof KPI_CHARTS)[number]

export const KPI_CHART_LABELS: Record<KpiChartName, string> = {
  revenue: "Revenue",
  mrr: "MRR",
  active_subscriptions: "Active subscriptions",
  new_customers: "New customers",
  active_trials: "Active trials",
  trials_conversion: "Trial conversion",
  churned_subscriptions: "Churned subscriptions",
}

/** Charts whose values are money, so they format as currency. */
const CURRENCY_CHARTS: KpiChartName[] = ["revenue", "mrr"]

export function isCurrencyChart(chart: KpiChartName) {
  return CURRENCY_CHARTS.includes(chart)
}

export type KpiMetric = {
  id: string
  name: string
  description: string | null
  /** `$` for money, `#` for counts, `%` for rates. */
  unit: string
  /** ISO 8601 duration the value covers. `P0D` means "as of now". */
  period: string
  value: number | null
  lastUpdatedAt: string | null
}

export type KpiSummary = {
  mrr: number | null
  arr: number | null
  revenue: number | null
  activeSubscriptions: number | null
  activeTrials: number | null
  newCustomers: number | null
  activeUsers: number | null
  arpu: number | null
}

export type KpiOverview = {
  connected: boolean
  currency: string
  fetchedAt: string | null
  summary: KpiSummary
  metrics: KpiMetric[]
}

export type KpiTrendPoint = { date: string; value: number }

export type KpiTrendFailureReason =
  | "permission"
  | "rate_limited"
  | "unavailable"
  | "unreachable"

export type KpiTrend = {
  connected: boolean
  /** False when RevenueCat could not supply the series; see `reason`. */
  available: boolean
  /** Why the series is missing. Null when it is available or not connected. */
  reason: KpiTrendFailureReason | null
  /** Server supplied explanation, safe to show verbatim. */
  message: string | null
  chart: KpiChartName
  resolution: "day" | "week" | "month" | null
  points: KpiTrendPoint[]
}

export type KpiSummaryKey = keyof KpiSummary

/** Stat tiles a dashboard widget or KPI section can render from the summary. */
export const KPI_SUMMARY_METRICS: {
  key: KpiSummaryKey
  label: string
  hint: string
  format: "currency" | "number"
}[] = [
  {
    key: "mrr",
    label: "MRR",
    hint: "Monthly recurring revenue",
    format: "currency",
  },
  {
    key: "arr",
    label: "ARR",
    hint: "MRR annualised",
    format: "currency",
  },
  {
    key: "revenue",
    label: "Revenue",
    hint: "Trailing 28 days",
    format: "currency",
  },
  {
    key: "arpu",
    label: "ARPU",
    hint: "MRR per active subscription",
    format: "currency",
  },
  {
    key: "activeSubscriptions",
    label: "Active subscriptions",
    hint: "Paying customers right now",
    format: "number",
  },
  {
    key: "activeTrials",
    label: "Active trials",
    hint: "Trials in flight",
    format: "number",
  },
  {
    key: "newCustomers",
    label: "New customers",
    hint: "Trailing 28 days",
    format: "number",
  },
  {
    key: "activeUsers",
    label: "Active users",
    hint: "Trailing 28 days",
    format: "number",
  },
]

export function getKpiSummaryMetric(key: string) {
  return KPI_SUMMARY_METRICS.find((metric) => metric.key === key)
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                  */
/* -------------------------------------------------------------------------- */

export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
  }).format(value)
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined).format(value)
}

export function formatPercent(value: number) {
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

/** Em dash for a metric RevenueCat has no value for, rather than a bare zero. */
export function formatMetricValue(
  value: number | null,
  format: "currency" | "number" | "percent",
  currency = "USD"
) {
  if (value === null) {
    return "—"
  }

  if (format === "currency") {
    return formatCurrency(value, currency)
  }

  if (format === "percent") {
    return `${value.toFixed(1)}%`
  }

  return formatNumber(value)
}

/**
 * Formats a raw RevenueCat metric using the unit the provider reported, so
 * metrics we do not model explicitly still render sensibly.
 */
export function formatRawMetric(metric: KpiMetric, currency: string) {
  if (metric.value === null) {
    return "—"
  }

  if (metric.unit === "$") {
    return formatCurrency(metric.value, currency)
  }

  if (metric.unit === "%") {
    return `${metric.value.toFixed(1)}%`
  }

  return formatNumber(metric.value)
}

/** Turns `P28D` into "Last 28 days" for a metric caption. */
export function describePeriod(period: string) {
  if (period === "P0D") {
    return "As of now"
  }

  const match = /^P(\d+)([DWMY])$/.exec(period)

  if (!match) {
    return period
  }

  const amount = Number(match[1])
  const unit = { D: "day", W: "week", M: "month", Y: "year" }[match[2] ?? "D"]

  return `Last ${amount} ${unit}${amount === 1 ? "" : "s"}`
}
