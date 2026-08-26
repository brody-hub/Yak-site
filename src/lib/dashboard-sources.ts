import {
  analyticsApi,
  ApiError,
  appUsersApi,
  kpisApi,
  reportsApi,
  tasksApi,
  type AnalyticsSummary,
  type AppUserStats,
  type ReportCounts,
} from "@/lib/api"
import type { AnalyticsEvent, DailyEventPoint, EventNameStat } from "@/lib/analytics"
import type { KpiChartName, KpiOverview, KpiTrend } from "@/lib/kpis"
import type { SupportReport } from "@/lib/reports"
import type { Ticket } from "@/lib/tasks"

/**
 * Dashboard data sources.
 *
 * Widgets declare source keys instead of fetching directly, which means two
 * tiles reading the same window share one request. A key encodes its arguments
 * (`analytics.trend:30`) so a change in a tile's configuration naturally
 * becomes a different key and a fresh fetch.
 */

export type SourceKey = string

export type SourceState =
  | { status: "loading" }
  | { status: "ready"; data: unknown }
  | { status: "error"; message: string }

export type SourceStates = Record<SourceKey, SourceState>

async function loadSource(key: SourceKey): Promise<unknown> {
  const [name, ...args] = key.split(":")

  switch (name) {
    case "kpi.overview":
      return kpisApi.overview()

    case "kpi.trend":
      return kpisApi.trend(args[0] as KpiChartName, Number(args[1] ?? 30))

    case "analytics.summary":
      return analyticsApi.summary(Number(args[0] ?? 7))

    case "analytics.trend":
      return analyticsApi.trend(Number(args[0] ?? 30))

    case "analytics.topEvents":
      return analyticsApi.topEvents(Number(args[0] ?? 7), Number(args[1] ?? 8))

    case "analytics.events":
      return analyticsApi.events({ limit: Number(args[0] ?? 10) })

    case "reports.counts":
      return reportsApi.counts()

    case "reports.recent": {
      const page = await reportsApi.list({
        openOnly: true,
        limit: Number(args[0] ?? 6),
      })

      return page.data
    }

    case "tasks.tickets":
      return tasksApi.tickets()

    case "appUsers.stats":
      return appUsersApi.stats(Number(args[0] ?? 7))

    default:
      throw new Error(`Unknown dashboard source: ${key}`)
  }
}

/** Fetches one source, normalising failures into a displayable message. */
export async function fetchSource(key: SourceKey): Promise<SourceState> {
  try {
    return { status: "ready", data: await loadSource(key) }
  } catch (error) {
    if (error instanceof ApiError && error.isForbidden) {
      // The user's access changed since the layout was saved. The tile says so
      // rather than disappearing, so they know why it stopped working.
      return {
        status: "error",
        message: "You no longer have access to this data",
      }
    }

    return {
      status: "error",
      message:
        error instanceof ApiError
          ? error.message
          : "Could not load this widget's data",
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Typed readers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Widgets read their source through these so the `unknown` payload is narrowed
 * in exactly one place per shape.
 */
export function readSource<T>(
  states: SourceStates,
  key: SourceKey
): { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T } {
  const state = states[key]

  if (!state) {
    return { status: "loading" }
  }

  if (state.status === "ready") {
    return { status: "ready", data: state.data as T }
  }

  return state
}

export type KpiOverviewSource = KpiOverview
export type KpiTrendSource = KpiTrend
export type AnalyticsSummarySource = AnalyticsSummary
export type AnalyticsTrendSource = DailyEventPoint[]
export type AnalyticsTopEventsSource = EventNameStat[]
export type AnalyticsEventsSource = AnalyticsEvent[]
export type ReportCountsSource = ReportCounts
export type ReportsRecentSource = SupportReport[]
export type TicketsSource = Ticket[]
export type AppUserStatsSource = AppUserStats
