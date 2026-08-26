import * as React from "react"
import { Link } from "react-router-dom"
import {
  ActivityIcon,
  CircleDollarSignIcon,
  LineChartIcon,
  RefreshCwIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import {
  asChartStyle,
  WidgetChart,
} from "@/components/dashboard/widget-chart"
import { useIntegrations } from "@/components/integrations-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ChartConfig } from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError, kpisApi } from "@/lib/api"
import {
  describePeriod,
  formatCurrency,
  formatDateTime,
  formatMetricValue,
  formatNumber,
  formatRawMetric,
  isCurrencyChart,
  KPI_CHARTS,
  KPI_CHART_LABELS,
  KPI_SECTIONS,
  KPI_SUMMARY_METRICS,
  type KpiChartName,
  type KpiOverview,
  type KpiSectionId,
  type KpiSummaryKey,
  type KpiTrend,
} from "@/lib/kpis"
import { cn } from "@/lib/utils"

/**
 * Subscription KPIs, read straight from the connected RevenueCat project.
 *
 * The credential lives in Settings → Integrations rather than here, so this page
 * only ever reads. When nothing is connected it explains what to do instead of
 * showing placeholder numbers.
 */

const sectionIcons: Record<KpiSectionId, React.ReactNode> = {
  overview: <LineChartIcon className="size-4" />,
  subscriptions: <UsersIcon className="size-4" />,
  trials: <ActivityIcon className="size-4" />,
  customers: <UserPlusIcon className="size-4" />,
  revenue: <CircleDollarSignIcon className="size-4" />,
}

const SECTION_METRICS: Record<KpiSectionId, KpiSummaryKey[]> = {
  overview: ["mrr", "activeSubscriptions", "activeTrials", "revenue"],
  subscriptions: ["activeSubscriptions", "arpu", "mrr"],
  trials: ["activeTrials", "newCustomers", "activeUsers"],
  customers: ["newCustomers", "activeUsers", "activeSubscriptions"],
  revenue: ["mrr", "arr", "revenue", "arpu"],
}

const SECTION_CHART: Record<KpiSectionId, KpiChartName> = {
  overview: "revenue",
  subscriptions: "active_subscriptions",
  trials: "active_trials",
  customers: "new_customers",
  revenue: "mrr",
}

export function KpisPage() {
  const { canManageUsers } = useAuth()
  const { isConnected, status: integrationsStatus } = useIntegrations()
  const revenueCatConnected = isConnected("revenuecat")

  const [section, setSection] = React.useState<KpiSectionId>("overview")
  const [overview, setOverview] = React.useState<KpiOverview | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(async () => {
    setLoading(true)

    try {
      setOverview(await kpisApi.overview())
      setError(null)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load KPI data"
      )
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const activeSection = KPI_SECTIONS.find((entry) => entry.id === section)

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="w-full shrink-0 border-b md:w-56 md:border-r md:border-b-0">
        <div className="flex flex-col gap-1 p-3 md:sticky md:top-0 md:py-4">
          <div className="px-2 pb-2">
            <p className="text-sm font-medium">KPIs</p>
            <p className="text-muted-foreground text-xs">
              {overview?.connected
                ? `RevenueCat · ${overview.currency}`
                : "RevenueCat not connected"}
            </p>
          </div>
          <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {KPI_SECTIONS.map((item) => {
              const active = section === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm whitespace-nowrap transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {sectionIcons[item.id]}
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
        {integrationsStatus === "loading" || loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-64" />
          </div>
        ) : error ? (
          <Card>
            <CardHeader>
              <CardTitle>Could not load KPIs</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" variant="outline" onClick={() => void load()}>
                <RefreshCwIcon />
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : !revenueCatConnected || !overview?.connected ? (
          <ConnectPrompt canManageIntegrations={canManageUsers} />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight">
                  {activeSection?.label}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {activeSection?.description}
                  {overview.fetchedAt
                    ? ` · updated ${formatDateTime(overview.fetchedAt)}`
                    : null}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void load()}
              >
                <RefreshCwIcon />
                Refresh
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {SECTION_METRICS[section].map((key) => {
                const metric = KPI_SUMMARY_METRICS.find(
                  (entry) => entry.key === key
                )

                if (!metric) {
                  return null
                }

                return (
                  <StatCard
                    key={key}
                    label={metric.label}
                    value={formatMetricValue(
                      overview.summary[key],
                      metric.format,
                      overview.currency
                    )}
                    hint={
                      overview.summary[key] === null
                        ? "Not reported by RevenueCat"
                        : metric.hint
                    }
                  />
                )
              })}
            </div>

            <TrendCard
              defaultChart={SECTION_CHART[section]}
              currency={overview.currency}
            />

            {section === "overview" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Everything RevenueCat reports</CardTitle>
                  <CardDescription>
                    Raw metrics from the connected project, with the period each
                    one covers.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="divide-y">
                    {overview.metrics.map((metric) => (
                      <div
                        key={metric.id}
                        className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0"
                      >
                        <dt className="text-sm">
                          {metric.name}
                          <span className="text-muted-foreground ml-2 text-xs">
                            {describePeriod(metric.period)}
                          </span>
                        </dt>
                        <dd className="text-sm font-medium tabular-nums">
                          {formatRawMetric(metric, overview.currency)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

/** Trend chart with its own chart, window, and style controls. */
function TrendCard({
  defaultChart,
  currency,
}: {
  defaultChart: KpiChartName
  currency: string
}) {
  const [chart, setChart] = React.useState<KpiChartName>(defaultChart)
  const [days, setDays] = React.useState("30")
  const [style, setStyle] = React.useState("area")
  const [trend, setTrend] = React.useState<KpiTrend | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setChart(defaultChart)
  }, [defaultChart])

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)

    const load = async () => {
      try {
        const result = await kpisApi.trend(chart, Number(days))

        if (!cancelled) {
          setTrend(result)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Could not load trend data"
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [chart, days])

  const config = {
    value: { label: KPI_CHART_LABELS[chart], color: "var(--primary)" },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 @md/card:flex-row @md/card:items-start @md/card:justify-between">
        <div className="space-y-1.5">
          <CardTitle>{KPI_CHART_LABELS[chart]} over time</CardTitle>
          <CardDescription>
            {trend?.resolution
              ? `Grouped by ${trend.resolution}`
              : "Time series from RevenueCat"}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={chart}
            onValueChange={(value) => setChart(value as KpiChartName)}
          >
            <SelectTrigger className="w-44" aria-label="Chart">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KPI_CHARTS.map((name) => (
                <SelectItem key={name} value={name}>
                  {KPI_CHART_LABELS[name]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-32" aria-label="Time range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="365">12 months</SelectItem>
            </SelectContent>
          </Select>
          <Select value={style} onValueChange={setStyle}>
            <SelectTrigger className="w-28" aria-label="Chart style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="area">Area</SelectItem>
              <SelectItem value="line">Line</SelectItem>
              <SelectItem value="bar">Bar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[240px] w-full" />
        ) : error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : !trend?.available ? (
          <p className="text-muted-foreground text-sm">
            RevenueCat did not return chart data for this project. Chart access
            depends on your RevenueCat plan; the snapshot metrics above are
            unaffected.
          </p>
        ) : trend.points.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No data in this window yet.
          </p>
        ) : (
          <WidgetChart
            data={trend.points}
            config={config}
            series={[{ key: "value", style: asChartStyle(style) }]}
            formatValue={(value) =>
              isCurrencyChart(chart)
                ? formatCurrency(value, currency)
                : formatNumber(value)
            }
          />
        )}
      </CardContent>
    </Card>
  )
}

function ConnectPrompt({
  canManageIntegrations,
}: {
  canManageIntegrations: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect RevenueCat</CardTitle>
        <CardDescription>
          KPIs on this page are read from your RevenueCat project. Nothing is
          shown until a key is connected — there is no sample data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManageIntegrations ? (
          <Button type="button" asChild>
            <Link to="/settings/integrations">Open Integrations</Link>
          </Button>
        ) : (
          <p className="text-muted-foreground text-sm">
            Ask an owner or admin to connect RevenueCat in Settings →
            Integrations.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {KPI_SUMMARY_METRICS.slice(0, 4).map((metric) => (
            <Badge key={metric.key} variant="secondary">
              {metric.label}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </CardContent>
    </Card>
  )
}
