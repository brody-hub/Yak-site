import { Link } from "react-router-dom"

import {
  asChartStyle,
  WidgetChart,
} from "@/components/dashboard/widget-chart"
import {
  WidgetLoading,
  WidgetMessage,
  WidgetRows,
  WidgetStat,
} from "@/components/dashboard/widget-shell"
import { Badge } from "@/components/ui/badge"
import type { ChartConfig } from "@/components/ui/chart"
import { formatEventCount, formatEventPercent } from "@/lib/analytics"
import type { WidgetOptionValues } from "@/lib/dashboard"
import {
  readSource,
  type AnalyticsSummarySource,
  type AnalyticsTopEventsSource,
  type AnalyticsTrendSource,
  type AppUserStatsSource,
  type KpiOverviewSource,
  type KpiTrendSource,
  type ReportCountsSource,
  type ReportsRecentSource,
  type SourceStates,
  type TicketsSource,
} from "@/lib/dashboard-sources"
import {
  describePeriod,
  formatCurrency,
  formatDateTime,
  formatMetricValue,
  formatNumber,
  formatRawMetric,
  getKpiSummaryMetric,
  isCurrencyChart,
  KPI_CHART_LABELS,
  type KpiChartName,
  type KpiSummaryKey,
} from "@/lib/kpis"
import { REPORT_TYPES, type ReportType } from "@/lib/reports"
import { TICKET_STATUSES, type Ticket, type TicketStatus } from "@/lib/tasks"

/**
 * Widget bodies.
 *
 * Each function receives the resolved options plus the shared source cache and
 * renders only the content area; the surrounding card, menu, and title live in
 * `WidgetShell`.
 */

export type WidgetBodyProps = {
  options: WidgetOptionValues
  sources: SourceStates
  currentUserId: string
}

export function WidgetBody({
  type,
  ...props
}: WidgetBodyProps & { type: string }) {
  switch (type) {
    case "kpi-stat":
      return <KpiStat {...props} />
    case "kpi-stat-group":
      return <KpiStatGroup {...props} />
    case "kpi-trend":
      return <KpiTrendBody {...props} />
    case "kpi-metrics-table":
      return <KpiMetricsTable {...props} />
    case "analytics-stat":
      return <AnalyticsStat {...props} />
    case "analytics-trend":
      return <AnalyticsTrend {...props} />
    case "analytics-top-events":
      return <AnalyticsTopEvents {...props} />
    case "reports-stat":
      return <ReportsStat {...props} />
    case "reports-breakdown":
      return <ReportsBreakdown {...props} />
    case "reports-recent":
      return <ReportsRecent {...props} />
    case "tasks-stat":
      return <TasksStat {...props} />
    case "tasks-board":
      return <TasksBoard {...props} />
    case "tasks-recent":
      return <TasksRecent {...props} />
    case "app-users-stat":
      return <AppUsersStat {...props} />
    case "app-users-breakdown":
      return <AppUsersBreakdown {...props} />
    default:
      return <WidgetMessage message="This widget is no longer available" />
  }
}

/** Subtitle shown under a tile's title, describing its current configuration. */
export function widgetSubtitle(
  type: string,
  options: WidgetOptionValues
): string | null {
  const days = Number(options.days ?? 0)
  const window = days ? `Last ${days} days` : null

  switch (type) {
    case "kpi-stat":
      return options.showHint === false
        ? null
        : (getKpiSummaryMetric(String(options.metric))?.hint ?? null)
    case "kpi-trend":
      return [KPI_CHART_LABELS[options.chart as KpiChartName], window]
        .filter(Boolean)
        .join(" · ")
    case "analytics-stat":
    case "analytics-trend":
    case "analytics-top-events":
    case "app-users-stat":
    case "app-users-breakdown":
      return window
    default:
      return null
  }
}

/* -------------------------------------------------------------------------- */
/* RevenueCat                                                                  */
/* -------------------------------------------------------------------------- */

function KpiStat({ options, sources }: WidgetBodyProps) {
  const state = readSource<KpiOverviewSource>(sources, "kpi.overview")

  if (state.status === "loading") {
    return <WidgetLoading lines={1} />
  }

  if (state.status === "error") {
    return <WidgetMessage message={state.message} tone="error" />
  }

  if (!state.data.connected) {
    return <WidgetMessage message="RevenueCat is not connected" />
  }

  const metric = getKpiSummaryMetric(String(options.metric))

  if (!metric) {
    return <WidgetMessage message="Pick a metric in this widget's settings" />
  }

  const value = state.data.summary[metric.key]

  return (
    <WidgetStat
      value={formatMetricValue(value, metric.format, state.data.currency)}
      hint={
        value === null ? "RevenueCat has no value for this metric yet" : null
      }
    />
  )
}

const KPI_GROUPS: Record<string, KpiSummaryKey[]> = {
  revenue: ["mrr", "arr", "revenue", "arpu"],
  subscriptions: [
    "activeSubscriptions",
    "activeTrials",
    "newCustomers",
    "activeUsers",
  ],
}

function KpiStatGroup({ options, sources }: WidgetBodyProps) {
  const state = readSource<KpiOverviewSource>(sources, "kpi.overview")

  if (state.status === "loading") {
    return <WidgetLoading lines={2} />
  }

  if (state.status === "error") {
    return <WidgetMessage message={state.message} tone="error" />
  }

  if (!state.data.connected) {
    return <WidgetMessage message="RevenueCat is not connected" />
  }

  const keys = KPI_GROUPS[String(options.group)] ?? KPI_GROUPS.revenue!

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {keys.map((key) => {
        const metric = getKpiSummaryMetric(key)

        if (!metric) {
          return null
        }

        return (
          <div key={key} className="space-y-1">
            <p className="text-muted-foreground text-xs">{metric.label}</p>
            <p className="text-xl font-semibold tabular-nums">
              {formatMetricValue(
                state.data.summary[key],
                metric.format,
                state.data.currency
              )}
            </p>
            <p className="text-muted-foreground text-xs">{metric.hint}</p>
          </div>
        )
      })}
    </div>
  )
}

function KpiTrendBody({ options, sources }: WidgetBodyProps) {
  const chart = (options.chart ?? "revenue") as KpiChartName
  const days = Number(options.days ?? 30)
  const state = readSource<KpiTrendSource>(sources, `kpi.trend:${chart}:${days}`)

  if (state.status === "loading") {
    return <WidgetLoading lines={4} />
  }

  if (state.status === "error") {
    return <WidgetMessage message={state.message} tone="error" />
  }

  if (!state.data.connected) {
    return <WidgetMessage message="RevenueCat is not connected" />
  }

  if (!state.data.available) {
    return (
      <WidgetMessage
        message={
          state.data.message ??
          "RevenueCat did not return this chart. Snapshot metrics still work."
        }
      />
    )
  }

  if (state.data.points.length === 0) {
    return <WidgetMessage message="No data in this window yet" />
  }

  const currency = isCurrencyChart(chart)
  const config = {
    value: { label: KPI_CHART_LABELS[chart], color: "var(--primary)" },
  } satisfies ChartConfig

  return (
    <WidgetChart
      fill
      data={state.data.points}
      config={config}
      series={[{ key: "value", style: asChartStyle(options.style) }]}
      formatValue={(value) =>
        currency ? formatCurrency(value) : formatNumber(value)
      }
    />
  )
}

function KpiMetricsTable({ sources }: WidgetBodyProps) {
  const state = readSource<KpiOverviewSource>(sources, "kpi.overview")

  if (state.status === "loading") {
    return <WidgetLoading lines={4} />
  }

  if (state.status === "error") {
    return <WidgetMessage message={state.message} tone="error" />
  }

  if (!state.data.connected) {
    return <WidgetMessage message="RevenueCat is not connected" />
  }

  if (state.data.metrics.length === 0) {
    return <WidgetMessage message="RevenueCat returned no metrics" />
  }

  return (
    <WidgetRows
      rows={state.data.metrics.map((metric) => ({
        label: metric.name,
        hint: describePeriod(metric.period),
        value: formatRawMetric(metric, state.data.currency),
      }))}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Analytic Events                                                             */
/* -------------------------------------------------------------------------- */

const ANALYTICS_STAT_LABELS: Record<string, string> = {
  totalEvents: "events in window",
  uniqueUsers: "users in window",
  eventsToday: "events since midnight UTC",
}

function AnalyticsStat({ options, sources }: WidgetBodyProps) {
  const days = Number(options.days ?? 7)
  const state = readSource<AnalyticsSummarySource>(
    sources,
    `analytics.summary:${days}`
  )

  if (state.status === "loading") {
    return <WidgetLoading lines={1} />
  }

  if (state.status === "error") {
    return <WidgetMessage message={state.message} tone="error" />
  }

  const metric = String(options.metric ?? "totalEvents")
  const value =
    metric === "uniqueUsers"
      ? state.data.uniqueUsers
      : metric === "eventsToday"
        ? state.data.eventsToday
        : state.data.totalEvents

  return (
    <WidgetStat
      value={formatEventCount(value)}
      hint={
        metric === "totalEvents"
          ? `${formatEventPercent(state.data.eventsChange)} vs prior window`
          : ANALYTICS_STAT_LABELS[metric]
      }
    />
  )
}

function AnalyticsTrend({ options, sources }: WidgetBodyProps) {
  const days = Number(options.days ?? 30)
  const state = readSource<AnalyticsTrendSource>(
    sources,
    `analytics.trend:${days}`
  )

  if (state.status === "loading") {
    return <WidgetLoading lines={4} />
  }

  if (state.status === "error") {
    return <WidgetMessage message={state.message} tone="error" />
  }

  if (state.data.length === 0) {
    return <WidgetMessage message="No events in this window yet" />
  }

  const style = asChartStyle(options.style)
  const selection = String(options.series ?? "both")
  const config = {
    events: { label: "Events", color: "var(--primary)" },
    users: { label: "Users", color: "var(--chart-2)" },
  } satisfies ChartConfig

  const series = (
    selection === "events"
      ? ["events"]
      : selection === "users"
        ? ["users"]
        : ["events", "users"]
  ).map((key) => ({ key, style }))

  return (
    <WidgetChart
      fill
      data={state.data}
      config={config}
      series={series}
      showLegend={series.length > 1}
      formatValue={(value) => formatEventCount(value)}
    />
  )
}

function AnalyticsTopEvents({ options, sources }: WidgetBodyProps) {
  const days = Number(options.days ?? 7)
  const limit = Number(options.limit ?? 8)
  const state = readSource<AnalyticsTopEventsSource>(
    sources,
    `analytics.topEvents:${days}:${limit}`
  )

  if (state.status === "loading") {
    return <WidgetLoading lines={4} />
  }

  if (state.status === "error") {
    return <WidgetMessage message={state.message} tone="error" />
  }

  if (state.data.length === 0) {
    return <WidgetMessage message="No events in this window yet" />
  }

  return (
    <WidgetRows
      rows={state.data.map((event) => ({
        label: event.name,
        hint: `${formatEventCount(event.uniqueUsers)} users`,
        value: `${formatEventCount(event.count)} · ${formatEventPercent(event.change)}`,
      }))}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Support                                                                     */
/* -------------------------------------------------------------------------- */

function ReportsStat({ options, sources }: WidgetBodyProps) {
  const state = readSource<ReportCountsSource>(sources, "reports.counts")

  if (state.status === "loading") {
    return <WidgetLoading lines={1} />
  }

  if (state.status === "error") {
    return <WidgetMessage message={state.message} tone="error" />
  }

  const type = String(options.type ?? "all") as ReportType | "all"
  const label =
    REPORT_TYPES.find((entry) => entry.id === type)?.label ?? "All inbox"

  return (
    <WidgetStat
      value={formatNumber(state.data[type] ?? 0)}
      hint={`Unresolved · ${label}`}
    />
  )
}

function ReportsBreakdown({ sources }: WidgetBodyProps) {
  const state = readSource<ReportCountsSource>(sources, "reports.counts")

  if (state.status === "loading") {
    return <WidgetLoading lines={4} />
  }

  if (state.status === "error") {
    return <WidgetMessage message={state.message} tone="error" />
  }

  return (
    <WidgetRows
      rows={REPORT_TYPES.filter((entry) => entry.id !== "all").map((entry) => ({
        label: entry.label,
        value: formatNumber(state.data[entry.id] ?? 0),
      }))}
    />
  )
}

function ReportsRecent({ options, sources }: WidgetBodyProps) {
  const limit = Number(options.limit ?? 6)
  const state = readSource<ReportsRecentSource>(
    sources,
    `reports.recent:${limit}`
  )

  if (state.status === "loading") {
    return <WidgetLoading lines={4} />
  }

  if (state.status === "error") {
    return <WidgetMessage message={state.message} tone="error" />
  }

  if (state.data.length === 0) {
    return <WidgetMessage message="Nothing open in the inbox" />
  }

  return (
    <ul className="divide-y">
      {state.data.map((report) => (
        <li key={report.id} className="py-2 first:pt-0 last:pb-0">
          <Link
            to="/reports"
            className="flex items-baseline justify-between gap-3 hover:underline"
          >
            <span className="min-w-0">
              <span className="line-clamp-1 text-sm font-medium">
                {report.subject}
              </span>
              <span className="text-muted-foreground text-xs">
                #{report.number} · {report.userName}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {report.priority}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {formatDateTime(report.updatedAt)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/* -------------------------------------------------------------------------- */
/* Tasks                                                                       */
/* -------------------------------------------------------------------------- */

function visibleTickets(
  tickets: Ticket[],
  options: WidgetOptionValues,
  currentUserId: string
) {
  return options.mineOnly === true
    ? tickets.filter((ticket) => ticket.assigneeId === currentUserId)
    : tickets
}

function TasksStat({ options, sources, currentUserId }: WidgetBodyProps) {
  const state = readSource<TicketsSource>(sources, "tasks.tickets")

  if (state.status === "loading") {
    return <WidgetLoading lines={1} />
  }

  if (state.status === "error") {
    return <WidgetMessage message={state.message} tone="error" />
  }

  const tickets = visibleTickets(state.data, options, currentUserId)
  const status = String(options.status ?? "in_progress")
  const matching =
    status === "all"
      ? tickets
      : tickets.filter((ticket) => ticket.status === status)

  const label =
    status === "all"
      ? "All tickets"
      : (TICKET_STATUSES.find((entry) => entry.id === status)?.label ?? status)

  return (
    <WidgetStat
      value={formatNumber(matching.length)}
      hint={options.mineOnly === true ? `${label} · assigned to me` : label}
    />
  )
}

function TasksBoard({ options, sources, currentUserId }: WidgetBodyProps) {
  const state = readSource<TicketsSource>(sources, "tasks.tickets")

  if (state.status === "loading") {
    return <WidgetLoading lines={4} />
  }

  if (state.status === "error") {
    return <WidgetMessage message={state.message} tone="error" />
  }

  const tickets = visibleTickets(state.data, options, currentUserId)

  return (
    <WidgetRows
      rows={TICKET_STATUSES.map((status) => {
        const matching = tickets.filter(
          (ticket) => ticket.status === status.id
        )
        const urgent = matching.filter(
          (ticket) => ticket.priority === "urgent"
        ).length

        return {
          label: status.label,
          hint: urgent > 0 ? `${urgent} urgent` : undefined,
          value: formatNumber(matching.length),
        }
      })}
    />
  )
}

const TICKET_STATUS_LABELS = Object.fromEntries(
  TICKET_STATUSES.map((status) => [status.id, status.label])
) as Record<TicketStatus, string>

function TasksRecent({ options, sources, currentUserId }: WidgetBodyProps) {
  const state = readSource<TicketsSource>(sources, "tasks.tickets")

  if (state.status === "loading") {
    return <WidgetLoading lines={4} />
  }

  if (state.status === "error") {
    return <WidgetMessage message={state.message} tone="error" />
  }

  const tickets = visibleTickets(state.data, options, currentUserId)
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, Number(options.limit ?? 6))

  if (tickets.length === 0) {
    return <WidgetMessage message="No tickets on the board yet" />
  }

  return (
    <ul className="divide-y">
      {tickets.map((ticket) => (
        <li key={ticket.id} className="py-2 first:pt-0 last:pb-0">
          <Link
            to="/tasks"
            className="flex items-baseline justify-between gap-3 hover:underline"
          >
            <span className="min-w-0">
              <span className="line-clamp-1 text-sm font-medium">
                {ticket.title}
              </span>
              <span className="text-muted-foreground text-xs">
                STAND-{ticket.number} · {TICKET_STATUS_LABELS[ticket.status]}
              </span>
            </span>
            <Badge variant="outline" className="shrink-0 capitalize">
              {ticket.priority}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/* -------------------------------------------------------------------------- */
/* App users                                                                   */
/* -------------------------------------------------------------------------- */

const APP_USER_HINTS: Record<string, string> = {
  total: "Users synced from your app",
  active: "Currently active",
  trialing: "In a trial",
  churned: "Lapsed",
  paid: "On plus or pro",
  newInWindow: "Created in window",
}

function AppUsersStat({ options, sources }: WidgetBodyProps) {
  const days = Number(options.days ?? 7)
  const state = readSource<AppUserStatsSource>(
    sources,
    `appUsers.stats:${days}`
  )

  if (state.status === "loading") {
    return <WidgetLoading lines={1} />
  }

  if (state.status === "error") {
    return <WidgetMessage message={state.message} tone="error" />
  }

  const metric = String(options.metric ?? "total")
  const value =
    metric === "active"
      ? state.data.active
      : metric === "trialing"
        ? state.data.trialing
        : metric === "churned"
          ? state.data.churned
          : metric === "paid"
            ? state.data.paid
            : metric === "newInWindow"
              ? state.data.newInWindow
              : state.data.total

  return (
    <WidgetStat value={formatNumber(value)} hint={APP_USER_HINTS[metric]} />
  )
}

function AppUsersBreakdown({ options, sources }: WidgetBodyProps) {
  const days = Number(options.days ?? 7)
  const state = readSource<AppUserStatsSource>(
    sources,
    `appUsers.stats:${days}`
  )

  if (state.status === "loading") {
    return <WidgetLoading lines={4} />
  }

  if (state.status === "error") {
    return <WidgetMessage message={state.message} tone="error" />
  }

  if (state.data.total === 0) {
    return (
      <WidgetMessage message="No users have been synced yet. Use the user sync endpoint from your app." />
    )
  }

  return (
    <WidgetRows
      rows={[
        { label: "Free", value: formatNumber(state.data.plans.free) },
        { label: "Plus", value: formatNumber(state.data.plans.plus) },
        { label: "Pro", value: formatNumber(state.data.plans.pro) },
        { label: "Trialing", value: formatNumber(state.data.trialing) },
        { label: "Churned", value: formatNumber(state.data.churned) },
        {
          label: "New",
          hint: `last ${state.data.windowDays} days`,
          value: formatNumber(state.data.newInWindow),
        },
      ]}
    />
  )
}
