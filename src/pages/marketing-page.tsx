import * as React from "react"
import { useSearchParams } from "react-router-dom"
import {
  AlertTriangleIcon,
  ArrowDownIcon,
  ExternalLinkIcon,
  EyeIcon,
  HeartIcon,
  ListChecksIcon,
  Loader2Icon,
  MegaphoneIcon,
  MessageCircleIcon,
  RefreshCwIcon,
  Share2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { WidgetChart } from "@/components/dashboard/widget-chart"
import { SideshiftCampaignsDialog } from "@/components/sideshift-campaigns-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ApiError, sideshiftApi } from "@/lib/api"
import { formatNumber } from "@/lib/kpis"
import { getInitials } from "@/lib/panel-permissions"
import {
  CALLBACK_MESSAGES,
  describeRange,
  formatCompact,
  formatRate,
  formatRelative,
  platformLabel,
  RANGE_OPTIONS,
  type SideshiftAnalytics,
  type SideshiftCreatorRow,
  type SideshiftPostSort,
  type SideshiftRange,
  type SideshiftStatus,
} from "@/lib/sideshift"
import { cn } from "@/lib/utils"

/**
 * Sideshift campaign analytics: pick a campaign, see how it is doing, see who
 * is in it.
 *
 * Everything is read from the server's synced copy. Opening this page starts a
 * background sync when the last one is over an hour old, so the page polls the
 * connection status while that runs and reloads once it lands.
 */

const STALE_AFTER_MS = 60 * 60_000
const POLL_MS = 3_000
/** Status checks to spend waiting for a background sync to show up. */
const POLL_BUDGET = 5

export function MarketingPage() {
  const { canManageUsers } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [status, setStatus] = React.useState<SideshiftStatus | null>(null)
  const [statusError, setStatusError] = React.useState<string | null>(null)
  const [campaign, setCampaign] = React.useState("all")
  const [range, setRange] = React.useState<SideshiftRange>("30d")
  const [postSort, setPostSort] = React.useState<SideshiftPostSort>("views")
  const [analytics, setAnalytics] = React.useState<SideshiftAnalytics | null>(
    null
  )
  const [analyticsError, setAnalyticsError] = React.useState<string | null>(
    null
  )
  const [analyticsLoading, setAnalyticsLoading] = React.useState(false)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [connecting, setConnecting] = React.useState(false)
  const [refreshing, setRefreshing] = React.useState(false)

  const pollBudget = React.useRef(POLL_BUDGET)
  const wasSyncing = React.useRef(false)

  const loadStatus = React.useCallback(async () => {
    try {
      setStatus(await sideshiftApi.status())
      setStatusError(null)
    } catch (err) {
      setStatusError(
        err instanceof ApiError ? err.message : "Could not load Sideshift status"
      )
    }
  }, [])

  React.useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  // Sideshift redirects back here with the outcome of a Connect click.
  React.useEffect(() => {
    const outcome = searchParams.get("sideshift")

    if (!outcome) {
      return
    }

    // `hasOwn`, since the value comes from the URL and "constructor" is a key
    // on every object.
    const entry = Object.hasOwn(CALLBACK_MESSAGES, outcome)
      ? CALLBACK_MESSAGES[outcome]!
      : CALLBACK_MESSAGES.error!

    if (entry.tone === "success") {
      toast.success(entry.message)
      pollBudget.current = POLL_BUDGET
    } else {
      toast.error(entry.message)
    }

    const next = new URLSearchParams(searchParams)
    next.delete("sideshift")
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  // Poll while a sync runs, and briefly after load when one is probably about
  // to start. When it finishes, reload the numbers.
  React.useEffect(() => {
    if (!status || status.status === "disconnected") {
      return
    }

    if (wasSyncing.current && !status.syncing) {
      setReloadKey((key) => key + 1)
    }
    wasSyncing.current = status.syncing

    const stale =
      !status.lastSyncedAt ||
      Date.now() - new Date(status.lastSyncedAt).getTime() > STALE_AFTER_MS

    if (!status.syncing) {
      if (!stale || pollBudget.current <= 0) {
        return
      }
      pollBudget.current -= 1
    }

    const timer = window.setTimeout(() => void loadStatus(), POLL_MS)
    return () => window.clearTimeout(timer)
  }, [status, loadStatus])

  const tracked = React.useMemo(
    () => status?.campaigns.filter((entry) => entry.tracked) ?? [],
    [status]
  )

  // A campaign that is no longer tracked falls back to the combined view.
  React.useEffect(() => {
    if (campaign !== "all" && status && !tracked.some((entry) => entry.id === campaign)) {
      setCampaign("all")
    }
  }, [campaign, status, tracked])

  const hasData = Boolean(status?.connected && tracked.length > 0)

  React.useEffect(() => {
    if (!hasData) {
      return
    }

    let cancelled = false
    setAnalyticsLoading(true)

    sideshiftApi
      .analytics({ campaign, range, sort: postSort })
      .then((result) => {
        if (!cancelled) {
          setAnalytics(result)
          setAnalyticsError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setAnalyticsError(
            err instanceof ApiError ? err.message : "Could not load campaign data"
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAnalyticsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [hasData, campaign, range, postSort, reloadKey])

  const connect = async () => {
    setConnecting(true)

    try {
      const { authorizeUrl } = await sideshiftApi.connect()
      window.location.assign(authorizeUrl)
    } catch (err) {
      setConnecting(false)
      toast.error(
        err instanceof ApiError ? err.message : "Could not start the Sideshift connection"
      )
    }
  }

  const refresh = async () => {
    setRefreshing(true)

    try {
      await sideshiftApi.refresh()
      pollBudget.current = POLL_BUDGET
      await loadStatus()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not refresh")
    } finally {
      setRefreshing(false)
    }
  }

  if (!status) {
    return (
      <PageFrame>
        {statusError ? (
          <Card>
            <CardHeader>
              <CardTitle>Could not load Marketing</CardTitle>
              <CardDescription>{statusError}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" variant="outline" onClick={() => void loadStatus()}>
                <RefreshCwIcon />
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-64" />
          </div>
        )}
      </PageFrame>
    )
  }

  if (!status.connected) {
    return (
      <PageFrame>
        <ConnectCard
          canManage={canManageUsers}
          connecting={connecting}
          onConnect={() => void connect()}
        />
      </PageFrame>
    )
  }

  return (
    <PageFrame
      subtitle={<SyncLine status={status} />}
      actions={
        <>
          {canManageUsers ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPickerOpen(true)}
            >
              <ListChecksIcon />
              Choose campaigns
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              refreshing ||
              status.syncing ||
              !status.canRefresh ||
              status.status === "needs_reconnect"
            }
            onClick={() => void refresh()}
          >
            <RefreshCwIcon className={cn(status.syncing && "animate-spin")} />
            Refresh
          </Button>
        </>
      }
    >
      <StatusBanner
        status={status}
        canManage={canManageUsers}
        connecting={connecting}
        onReconnect={() => void connect()}
      />

      {tracked.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Choose campaigns to show</CardTitle>
            <CardDescription>
              {status.campaigns.length === 0
                ? status.syncing
                  ? "Loading your Sideshift campaigns…"
                  : "No campaigns found in Sideshift yet."
                : "Nothing is tracked yet. Pick the campaigns you want to follow here."}
            </CardDescription>
          </CardHeader>
          {canManageUsers && status.campaigns.length > 0 ? (
            <CardContent>
              <Button type="button" onClick={() => setPickerOpen(true)}>
                <ListChecksIcon />
                Choose campaigns
              </Button>
            </CardContent>
          ) : null}
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Select value={campaign} onValueChange={setCampaign}>
              <SelectTrigger className="w-full sm:w-72" aria-label="Campaign">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tracked campaigns</SelectItem>
                {tracked.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={range}
              onValueChange={(value) => {
                if (value) {
                  setRange(value as SideshiftRange)
                }
              }}
              aria-label="Date range"
            >
              {RANGE_OPTIONS.map((option) => (
                <ToggleGroupItem key={option.value} value={option.value}>
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {analyticsError ? (
            <Card>
              <CardHeader>
                <CardTitle>Could not load campaign data</CardTitle>
                <CardDescription>{analyticsError}</CardDescription>
              </CardHeader>
            </Card>
          ) : !analytics ? (
            <div className="space-y-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-64" />
            </div>
          ) : (
            <div
              className={cn(
                "flex flex-col gap-4 md:gap-6 transition-opacity",
                analyticsLoading && "opacity-60"
              )}
            >
              <SummaryCards analytics={analytics} />
              <DailyChart analytics={analytics} />
              {analytics.summary.posts === 0 && analytics.posts.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>No posts yet in this campaign.</CardTitle>
                    <CardDescription>
                      {analytics.range === "all"
                        ? "Posts show up here once creators publish them."
                        : `Nothing was posted in ${describeRange(analytics.range)}.`}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <div className="grid gap-4 md:gap-6 xl:grid-cols-2">
                  <CreatorsCard creators={analytics.creators} />
                  <PostsCard
                    analytics={analytics}
                    sort={postSort}
                    onSortChange={setPostSort}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}

      <SideshiftCampaignsDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        campaigns={status.campaigns}
        onSaved={(next) => {
          setStatus(next)
          pollBudget.current = POLL_BUDGET
          setReloadKey((key) => key + 1)
        }}
      />
    </PageFrame>
  )
}

/* -------------------------------------------------------------------------- */
/* Layout and states                                                           */
/* -------------------------------------------------------------------------- */

function PageFrame({
  subtitle,
  actions,
  children,
}: {
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">Marketing</h1>
          <div className="text-muted-foreground text-sm">
            {subtitle ?? "Creator campaign analytics from Sideshift."}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  )
}

function SyncLine({ status }: { status: SideshiftStatus }) {
  const source = status.companyName
    ? `Sideshift · ${status.companyName}`
    : "Sideshift"

  if (status.syncing) {
    return (
      <span className="inline-flex items-center gap-1.5">
        {source} ·
        <Loader2Icon className="size-3.5 animate-spin" />
        Syncing…
      </span>
    )
  }

  return (
    <span>
      {source} ·{" "}
      {status.lastSyncedAt
        ? `Last synced ${formatRelative(status.lastSyncedAt)}`
        : "Not synced yet"}
    </span>
  )
}

function ConnectCard({
  canManage,
  connecting,
  onConnect,
}: {
  canManage: boolean
  connecting: boolean
  onConnect: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-lg">
          <MegaphoneIcon className="size-5" />
        </div>
        <CardTitle>Connect Sideshift</CardTitle>
        <CardDescription>
          See each campaign’s views, engagement and creators from Sideshift,
          right here. Read-only: nothing in Sideshift is ever changed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {canManage ? (
          <Button type="button" disabled={connecting} onClick={onConnect}>
            {connecting ? <Loader2Icon className="animate-spin" /> : null}
            Connect Sideshift
          </Button>
        ) : (
          <p className="text-muted-foreground text-sm">
            Ask an owner or admin to connect Sideshift.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBanner({
  status,
  canManage,
  connecting,
  onReconnect,
}: {
  status: SideshiftStatus
  canManage: boolean
  connecting: boolean
  onReconnect: () => void
}) {
  let message: string | null = null
  let action: React.ReactNode = null

  if (status.status === "needs_reconnect") {
    message = `${status.lastError ?? "Sideshift needs to be reconnected."} The numbers below are from the last sync.`
    action = canManage ? (
      <Button type="button" size="sm" disabled={connecting} onClick={onReconnect}>
        Reconnect Sideshift
      </Button>
    ) : (
      <span className="text-xs">Ask an owner or admin to reconnect.</span>
    )
  } else if (status.status === "subscription_inactive") {
    message =
      "Your Sideshift subscription is inactive, so syncing is paused. The numbers below are from the last sync."
  } else if (status.lastError && !status.syncing) {
    message = status.lastError
  }

  if (!message) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
      <div className="flex items-start gap-2">
        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <div>
          <p>{message}</p>
          {status.lastErrorRequestId ? (
            <p className="text-muted-foreground mt-0.5 text-xs">
              Sideshift request ID {status.lastErrorRequestId}
            </p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Summary and chart                                                           */
/* -------------------------------------------------------------------------- */

function SummaryCards({ analytics }: { analytics: SideshiftAnalytics }) {
  const { summary, range } = analytics
  const period = describeRange(range)
  const gained = summary.basis === "gained"

  const cards = [
    {
      label: "Views",
      value: formatCompact(summary.views),
      title: formatNumber(summary.views),
      hint: gained ? `Gained in ${period}` : "Across every post",
    },
    {
      label: "Engagement",
      value: formatCompact(summary.engagement),
      title: formatNumber(summary.engagement),
      hint: "Likes + comments + shares",
    },
    {
      label: "Engagement rate",
      value: formatRate(summary.engagementRate),
      title: undefined,
      hint: "Engagement ÷ views",
    },
    {
      label: "Posts",
      value: formatNumber(summary.posts),
      title: undefined,
      hint: gained ? `Posted in ${period}` : "All time",
    },
    {
      label: "Creators",
      value: formatNumber(summary.creators),
      title: undefined,
      hint: gained ? `Posted in ${period}` : "All time",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-2">
            <CardDescription>{card.label}</CardDescription>
            <CardTitle className="text-2xl tabular-nums" title={card.title}>
              {card.value}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">{card.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DailyChart({ analytics }: { analytics: SideshiftAnalytics }) {
  const [metric, setMetric] = React.useState<"views" | "engagement">("views")
  const label = metric === "views" ? "Views" : "Engagement"

  // Date-only strings are pinned to midday so no timezone shifts the label.
  const data = analytics.daily.map((day) => ({
    date: `${day.date}T12:00:00`,
    value: day[metric],
  }))

  const config = {
    value: { label, color: "var(--primary)" },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{label} per day</CardTitle>
          <CardDescription>
            Gained each day across the posts in{" "}
            {analytics.campaign === "all" ? "your tracked campaigns" : "this campaign"}
          </CardDescription>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={metric}
          onValueChange={(value) => {
            if (value) {
              setMetric(value as "views" | "engagement")
            }
          }}
          aria-label="Chart metric"
        >
          <ToggleGroupItem value="views">Views</ToggleGroupItem>
          <ToggleGroupItem value="engagement">Engagement</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No daily history yet. It appears after the first sync completes.
          </p>
        ) : (
          <WidgetChart
            data={data}
            config={config}
            series={[{ key: "value", style: data.length > 60 ? "area" : "bar" }]}
            formatValue={formatCompact}
          />
        )}
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Creators                                                                    */
/* -------------------------------------------------------------------------- */

type CreatorSortKey = "posts" | "views" | "engagementRate" | "averageViewsPerPost"

const CREATOR_COLUMNS: { key: CreatorSortKey; label: string }[] = [
  { key: "posts", label: "Posts" },
  { key: "views", label: "Views" },
  { key: "engagementRate", label: "Eng. rate" },
  { key: "averageViewsPerPost", label: "Avg views" },
]

function CreatorsCard({ creators }: { creators: SideshiftCreatorRow[] }) {
  const [sortKey, setSortKey] = React.useState<CreatorSortKey>("views")

  const sorted = React.useMemo(
    () =>
      [...creators].sort(
        (a, b) => (b[sortKey] ?? -1) - (a[sortKey] ?? -1)
      ),
    [creators, sortKey]
  )

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Creators in this campaign</CardTitle>
        <CardDescription>
          One row per creator account. Click a column to sort.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[560px] overflow-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creator</TableHead>
                {CREATOR_COLUMNS.map((column) => (
                  <TableHead key={column.key} className="text-right">
                    <button
                      type="button"
                      onClick={() => setSortKey(column.key)}
                      className={cn(
                        "inline-flex items-center gap-1 hover:text-foreground",
                        sortKey === column.key && "text-foreground"
                      )}
                    >
                      {column.label}
                      {sortKey === column.key ? (
                        <ArrowDownIcon className="size-3" />
                      ) : null}
                    </button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((creator) => (
                <TableRow key={creator.key}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar className="size-8">
                        {creator.avatarUrl ? (
                          <AvatarImage src={creator.avatarUrl} alt="" />
                        ) : null}
                        <AvatarFallback className="text-xs">
                          {getInitials(creator.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {creator.name}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {[creator.handle, platformLabel(creator.platform)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(creator.posts)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCompact(creator.views)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatRate(creator.engagementRate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCompact(Math.round(creator.averageViewsPerPost))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Posts                                                                       */
/* -------------------------------------------------------------------------- */

function PostsCard({
  analytics,
  sort,
  onSortChange,
}: {
  analytics: SideshiftAnalytics
  sort: SideshiftPostSort
  onSortChange: (sort: SideshiftPostSort) => void
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Posts</CardTitle>
          <CardDescription>
            {analytics.summary.posts > analytics.posts.length
              ? `Top ${analytics.posts.length} of ${formatNumber(analytics.summary.posts)}`
              : `${formatNumber(analytics.posts.length)} post${analytics.posts.length === 1 ? "" : "s"}`}
          </CardDescription>
        </div>
        <Select
          value={sort}
          onValueChange={(value) => onSortChange(value as SideshiftPostSort)}
        >
          <SelectTrigger className="w-36" aria-label="Sort posts">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="views">Most views</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="grid max-h-[560px] grid-cols-2 gap-2 overflow-auto sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4">
          {analytics.posts.map((post) => (
            <PostTile key={post.id} post={post} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function PostTile({ post }: { post: SideshiftAnalytics["posts"][number] }) {
  const [imageFailed, setImageFailed] = React.useState(false)
  const content = (
    <>
      <div className="bg-muted relative aspect-[4/5] overflow-hidden rounded-lg">
        {post.thumbnailUrl && !imageFailed ? (
          <img
            src={post.thumbnailUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="size-full object-cover"
          />
        ) : (
          <div className="text-muted-foreground flex size-full items-center justify-center text-xs">
            No thumbnail
          </div>
        )}
        <Badge variant="secondary" className="absolute top-2 left-2">
          {platformLabel(post.platform)}
        </Badge>
        {post.postUrl ? (
          <ExternalLinkIcon className="absolute top-2 right-2 size-4 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
        ) : null}
      </div>
      <div className="mt-2 space-y-1">
        <p className="truncate text-sm font-medium">
          {post.creatorName ?? post.creatorHandle ?? "Unknown creator"}
        </p>
        <p className="text-muted-foreground text-xs">
          {post.uploadedAt
            ? new Date(post.uploadedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "Date unknown"}
        </p>
        <div className="text-muted-foreground flex flex-wrap gap-x-2.5 gap-y-0.5 text-xs tabular-nums">
          <span className="text-foreground inline-flex items-center gap-1 font-medium">
            <EyeIcon className="size-3" />
            {formatCompact(post.views)}
          </span>
          <span className="inline-flex items-center gap-1">
            <HeartIcon className="size-3" />
            {formatCompact(post.likes)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircleIcon className="size-3" />
            {formatCompact(post.comments)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Share2Icon className="size-3" />
            {formatCompact(post.shares)}
          </span>
        </div>
      </div>
    </>
  )

  return post.postUrl ? (
    <a
      href={post.postUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg p-1 hover:bg-muted/50"
    >
      {content}
    </a>
  ) : (
    <div className="p-1">{content}</div>
  )
}
