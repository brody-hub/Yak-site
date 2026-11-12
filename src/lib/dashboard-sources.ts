import {
  analyticsApi,
  ApiError,
  appUsersApi,
  kpisApi,
  reportsApi,
  sideshiftApi,
  tasksApi,
  type AnalyticsSummary,
  type AppUserStats,
  type ReportCounts,
} from "@/lib/api"
import type { AnalyticsEvent, DailyEventPoint, EventNameStat } from "@/lib/analytics"
import type { KpiChartName, KpiOverview, KpiTrend } from "@/lib/kpis"
import type { SideshiftAnalytics, SideshiftSeries } from "@/lib/sideshift"
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

/** Sources that read one app's data, as opposed to the whole workspace's. */
const APP_SCOPED_SOURCES = new Set([
  "kpi.overview",
  "kpi.trend",
  "analytics.summary",
  "analytics.trend",
  "analytics.topEvents",
  "analytics.events",
  "reports.counts",
  "reports.recent",
  "appUsers.stats",
])

export class NoAppSelectedError extends Error {
  constructor() {
    super("Pick an app to show this data")
    this.name = "NoAppSelectedError"
  }
}

/**
 * `appId` is the app the dashboard is looking at. Workspace-wide sources
 * (tasks, Sideshift) ignore it; app-scoped ones fail without it.
 */
async function loadSource(
  key: SourceKey,
  appId: string | null
): Promise<unknown> {
  const [name = "", ...args] = key.split(":")

  if (APP_SCOPED_SOURCES.has(name) && !appId) {
    throw new NoAppSelectedError()
  }

  // Narrowed above for the keys that need it; the cast keeps the cases short.
  const app = appId as string

  switch (name) {
    case "kpi.overview":
      return kpisApi.overview(app)

    case "kpi.trend":
      return kpisApi.trend(app, args[0] as KpiChartName, Number(args[1] ?? 30))

    case "analytics.summary":
      return analyticsApi.summary(app, Number(args[0] ?? 7))

    case "analytics.trend":
      return analyticsApi.trend(app, Number(args[0] ?? 30))

    case "analytics.topEvents":
      return analyticsApi.topEvents(
        app,
        Number(args[0] ?? 7),
        Number(args[1] ?? 8)
      )

    case "analytics.events":
      return analyticsApi.events(app, { limit: Number(args[0] ?? 10) })

    case "reports.counts":
      return reportsApi.counts(app)

    case "reports.recent": {
      const page = await reportsApi.list(app, {
        openOnly: true,
        limit: Number(args[0] ?? 6),
      })

      return page.data
    }

    case "tasks.tickets":
      return tasksApi.tickets()

    case "appUsers.stats":
      return appUsersApi.stats(app, Number(args[0] ?? 7))

    case "sideshift.week":
      return sideshiftApi.analytics({
        campaign: "all",
        range: "7d",
        sort: "views",
      })

    // Both ids are URI-encoded in the key so a stray ":" cannot split them.
    case "sideshift.series":
      return sideshiftApi.series({
        campaign: decodeURIComponent(args[0] ?? "all"),
        days: Number(args[1] ?? 30),
        creators: decodeURIComponent(args[2] ?? ""),
      })

    default:
      throw new Error(`Unknown dashboard source: ${key}`)
  }
}

/** Fetches one source, normalising failures into a displayable message. */
export async function fetchSource(
  key: SourceKey,
  appId: string | null
): Promise<SourceState> {
  try {
    return { status: "ready", data: await loadSource(key, appId) }
  } catch (error) {
    if (error instanceof NoAppSelectedError) {
      return { status: "error", message: error.message }
    }

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
export type SideshiftWeekSource = SideshiftAnalytics
export type SideshiftSeriesSource = SideshiftSeries
