import * as React from "react"
import { ActivityIcon, MousePointerClickIcon, UsersIcon } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { analyticsApi, type AnalyticsSummary } from "@/lib/api"
import {
  formatEventCount,
  formatEventPercent,
  formatEventTime,
  formatProperties,
  type AnalyticsEvent,
  type DailyEventPoint,
  type EventNameStat,
} from "@/lib/analytics"
import { cn } from "@/lib/utils"

const trendConfig = {
  events: {
    label: "Events",
    color: "var(--primary)",
  },
  users: {
    label: "Users",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const WINDOW_DAYS = 7

export function AnalyticsPage() {
  const [query, setQuery] = React.useState("")
  const [eventFilter, setEventFilter] = React.useState<string>("all")
  const [platformFilter, setPlatformFilter] = React.useState<
    AnalyticsEvent["platform"] | "all"
  >("all")

  const [summary, setSummary] = React.useState<AnalyticsSummary | null>(null)
  const [trend, setTrend] = React.useState<DailyEventPoint[]>([])
  const [stats, setStats] = React.useState<EventNameStat[]>([])
  const [eventNames, setEventNames] = React.useState<string[]>([])
  const [events, setEvents] = React.useState<AnalyticsEvent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Headline numbers and the chart cover a fixed window, so they load once.
  React.useEffect(() => {
    let cancelled = false

    Promise.all([
      analyticsApi.summary(WINDOW_DAYS),
      analyticsApi.trend(WINDOW_DAYS),
      analyticsApi.topEvents(WINDOW_DAYS),
      analyticsApi.names(),
    ])
      .then(([nextSummary, nextTrend, nextStats, names]) => {
        if (!cancelled) {
          setSummary(nextSummary)
          setTrend(nextTrend)
          setStats(nextStats)
          setEventNames(names)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load analytics.")
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const trimmedQuery = query.trim()

  // The live stream re-queries whenever a filter changes.
  React.useEffect(() => {
    let cancelled = false

    const timer = setTimeout(
      () => {
        analyticsApi
          .events({
            limit: 50,
            name: eventFilter === "all" ? undefined : eventFilter,
            platform: platformFilter === "all" ? undefined : platformFilter,
            search: trimmedQuery || undefined,
          })
          .then((next) => {
            if (!cancelled) {
              setEvents(next)
            }
          })
          .catch(() => undefined)
      },
      trimmedQuery ? 250 : 0
    )

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [eventFilter, platformFilter, trimmedQuery])

  const filteredStats = stats.filter((item) => {
    if (eventFilter !== "all" && item.name !== eventFilter) {
      return false
    }

    if (!trimmedQuery) {
      return true
    }

    return item.name.toLowerCase().includes(trimmedQuery.toLowerCase())
  })

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground text-sm">
            Product analytics stream — inspect volume, top events, and live
            activity from your application.
          </p>
        </div>

        {error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading || !summary ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32 rounded-xl" />
            ))
          ) : (
            <>
              <StatCard
                label={`Events (${summary.windowDays}d)`}
                value={formatEventCount(summary.totalEvents)}
                hint={`${formatEventPercent(summary.eventsChange)} vs prior period`}
                trend={summary.eventsChange >= 0 ? "up" : "down"}
                icon={<ActivityIcon className="size-4" />}
              />
              <StatCard
                label={`Unique users (${summary.windowDays}d)`}
                value={formatEventCount(summary.uniqueUsers)}
                hint="Distinct user IDs"
                icon={<UsersIcon className="size-4" />}
              />
              <StatCard
                label="Events today"
                value={formatEventCount(summary.eventsToday)}
                hint="Across all platforms"
                icon={<MousePointerClickIcon className="size-4" />}
              />
              <StatCard
                label="Top event"
                value={summary.topEvent ?? "—"}
                hint="Most fired this period"
              />
            </>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Event volume</CardTitle>
            <CardDescription>
              Daily events and unique users over the last {WINDOW_DAYS} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendConfig} className="h-[260px] w-full">
              <AreaChart data={trend} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis tickLine={false} axisLine={false} width={48} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey="users"
                  type="natural"
                  fill="var(--color-users)"
                  fillOpacity={0.12}
                  stroke="var(--color-users)"
                  strokeWidth={2}
                />
                <Area
                  dataKey="events"
                  type="natural"
                  fill="var(--color-events)"
                  fillOpacity={0.2}
                  stroke="var(--color-events)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Top events</CardTitle>
              <CardDescription>
                Ranked by volume over the last {WINDOW_DAYS} days
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredStats.length > 0 ? (
                filteredStats.map((item, index) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() =>
                      setEventFilter((current) =>
                        current === item.name ? "all" : item.name
                      )
                    }
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                      eventFilter === item.name &&
                        "border-primary/40 bg-primary/5"
                    )}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {index + 1}
                        </span>
                        <span className="truncate font-mono text-sm font-medium">
                          {item.name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatEventCount(item.uniqueUsers)} users
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium tabular-nums">
                        {formatEventCount(item.count)}
                      </div>
                      <div
                        className={cn(
                          "text-xs tabular-nums",
                          item.change >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {formatEventPercent(item.change)}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No events match this filter.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-4">
              <div className="space-y-1.5">
                <CardTitle>Live event stream</CardTitle>
                <CardDescription>
                  The most recent events received from your application
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search events, users, properties…"
                  className="sm:max-w-xs"
                />
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All events</SelectItem>
                    {eventNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={platformFilter}
                  onValueChange={(value) =>
                    setPlatformFilter(
                      value as AnalyticsEvent["platform"] | "all"
                    )
                  }
                >
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All platforms</SelectItem>
                    <SelectItem value="ios">iOS</SelectItem>
                    <SelectItem value="android">Android</SelectItem>
                    <SelectItem value="web">Web</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Properties</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.length > 0 ? (
                      events.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <span className="font-mono text-sm font-medium">
                              {event.name}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{event.userName}</div>
                            <div className="text-xs text-muted-foreground">
                              {event.userId}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {event.platform}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[240px] truncate text-muted-foreground">
                            {formatProperties(event.properties)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                            {formatEventTime(event.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-28 text-center text-muted-foreground"
                        >
                          No events match these filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
  trend,
  icon,
}: {
  label: string
  value: string
  hint: string
  trend?: "up" | "down"
  icon?: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardDescription>{label}</CardDescription>
          {icon ? (
            <span className="text-muted-foreground">{icon}</span>
          ) : null}
        </div>
        <CardTitle className="truncate text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "text-xs",
            trend === "up" && "text-emerald-600 dark:text-emerald-400",
            trend === "down" && "text-rose-600 dark:text-rose-400",
            !trend && "text-muted-foreground"
          )}
        >
          {hint}
        </p>
      </CardContent>
    </Card>
  )
}
