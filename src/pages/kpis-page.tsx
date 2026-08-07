import * as React from "react"
import {
  ActivityIcon,
  CircleDollarSignIcon,
  KeyRoundIcon,
  LineChartIcon,
  TrendingDownIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useKpis } from "@/components/kpis-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DEMO_CHURN,
  DEMO_SUBSCRIBERS,
  DEMO_SUMMARY,
  DEMO_TREND,
  DEMO_TRIALS,
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPercent,
  isConnected,
  KPI_SECTIONS,
  maskApiKey,
  type KpiProviderId,
  type KpiSectionId,
  type SubscriberEvent,
  type TrialEvent,
} from "@/lib/kpis"
import { cn } from "@/lib/utils"

const sectionIcons: Record<KpiSectionId, React.ReactNode> = {
  overview: <LineChartIcon className="size-4" />,
  subscribers: <UserPlusIcon className="size-4" />,
  trials: <ActivityIcon className="size-4" />,
  active: <UsersIcon className="size-4" />,
  churn: <TrendingDownIcon className="size-4" />,
  revenue: <CircleDollarSignIcon className="size-4" />,
  connection: <KeyRoundIcon className="size-4" />,
}

const trendConfig = {
  subscribers: {
    label: "Subscribers",
    color: "var(--primary)",
  },
  trials: {
    label: "Trials",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const revenueConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--primary)",
  },
} satisfies ChartConfig

export function KpisPage() {
  const { revenueCatConnected } = useKpis()
  const [section, setSection] = React.useState<KpiSectionId>("overview")

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="w-full shrink-0 border-b md:w-56 md:border-r md:border-b-0">
        <div className="flex flex-col gap-1 p-3 md:sticky md:top-0 md:py-4">
          <div className="px-2 pb-2">
            <p className="text-sm font-medium">KPIs</p>
            <p className="text-xs text-muted-foreground">
              {revenueCatConnected
                ? "RevenueCat · demo data"
                : "Connect a provider"}
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
                      ? "bg-primary/10 font-medium text-primary"
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

      <div className="flex min-w-0 flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          {!revenueCatConnected && section !== "connection" ? (
            <Card>
              <CardHeader>
                <CardTitle>Connect RevenueCat</CardTitle>
                <CardDescription>
                  Add your RevenueCat secret API key to load subscription KPIs.
                  Superwall can be connected as a second source.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button type="button" onClick={() => setSection("connection")}>
                  <KeyRoundIcon />
                  Open connection settings
                </Button>
              </CardContent>
            </Card>
          ) : (
            <SectionContent section={section} />
          )}
        </div>
      </div>
    </div>
  )
}

function SectionContent({ section }: { section: KpiSectionId }) {
  switch (section) {
    case "overview":
      return <OverviewSection />
    case "subscribers":
      return <SubscribersSection />
    case "trials":
      return <TrialsSection />
    case "active":
      return <ActiveSection />
    case "churn":
      return <ChurnSection />
    case "revenue":
      return <RevenueSection />
    case "connection":
      return <ConnectionSection />
  }
}

function OverviewSection() {
  return (
    <div className="space-y-4 md:space-y-6">
      <PageIntro
        title="Overview"
        description="Subscription health from RevenueCat over the last 7 days."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="MRR"
          value={formatCurrency(DEMO_SUMMARY.mrr)}
          hint="Monthly recurring revenue"
        />
        <StatCard
          label="Active subscriptions"
          value={formatNumber(DEMO_SUMMARY.activeSubscriptions)}
          hint="Paying customers right now"
        />
        <StatCard
          label="New subscribers"
          value={formatNumber(DEMO_SUMMARY.newSubscribers7d)}
          hint={`${formatPercent(DEMO_SUMMARY.newSubscribersChange)} vs prior week`}
          trend="up"
        />
        <StatCard
          label="Trial conversion"
          value={`${DEMO_SUMMARY.trialConversionRate}%`}
          hint={`${formatNumber(DEMO_SUMMARY.trialsStarted7d)} trials started`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscribers & trials</CardTitle>
          <CardDescription>Daily volume for the past week</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={trendConfig} className="h-[260px] w-full">
            <AreaChart data={DEMO_TREND} accessibilityLayer>
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
              <YAxis tickLine={false} axisLine={false} width={36} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                dataKey="trials"
                type="natural"
                fill="var(--color-trials)"
                fillOpacity={0.15}
                stroke="var(--color-trials)"
                strokeWidth={2}
              />
              <Area
                dataKey="subscribers"
                type="natural"
                fill="var(--color-subscribers)"
                fillOpacity={0.2}
                stroke="var(--color-subscribers)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function SubscribersSection() {
  return (
    <div className="space-y-4 md:space-y-6">
      <PageIntro
        title="New subscribers"
        description="Paid conversions from RevenueCat in the last 7 days."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="New this week"
          value={formatNumber(DEMO_SUMMARY.newSubscribers7d)}
          hint={`${formatPercent(DEMO_SUMMARY.newSubscribersChange)} vs prior week`}
          trend="up"
        />
        <StatCard
          label="Avg / day"
          value={formatNumber(Math.round(DEMO_SUMMARY.newSubscribers7d / 7))}
          hint="Across all products"
        />
        <StatCard
          label="Top plan"
          value="Pro Annual"
          hint="42% of new paid subs"
        />
      </div>
      <SubscriberTable
        rows={DEMO_SUBSCRIBERS}
        empty="No new subscribers yet."
      />
    </div>
  )
}

function TrialsSection() {
  return (
    <div className="space-y-4 md:space-y-6">
      <PageIntro
        title="Trials"
        description="Trial starts, conversions, and expirations from RevenueCat."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Trials started"
          value={formatNumber(DEMO_SUMMARY.trialsStarted7d)}
          hint="Last 7 days"
        />
        <StatCard
          label="Conversion rate"
          value={`${DEMO_SUMMARY.trialConversionRate}%`}
          hint="Trial → paid"
        />
        <StatCard
          label="Active trials"
          value={formatNumber(
            DEMO_TRIALS.filter((trial) => trial.converted === null).length
          )}
          hint="Still in trial window"
        />
      </div>
      <TrialTable rows={DEMO_TRIALS} />
    </div>
  )
}

function ActiveSection() {
  return (
    <div className="space-y-4 md:space-y-6">
      <PageIntro
        title="Active subscriptions"
        description="Current paying customers synced from RevenueCat."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Active"
          value={formatNumber(DEMO_SUMMARY.activeSubscriptions)}
          hint="All platforms"
        />
        <StatCard label="iOS" value="2,418" hint="63% of active" />
        <StatCard label="Android" value="1,424" hint="37% of active" />
      </div>
      <SubscriberTable
        rows={DEMO_SUBSCRIBERS.filter((row) => row.status === "active")}
        empty="No active subscriptions."
      />
    </div>
  )
}

function ChurnSection() {
  return (
    <div className="space-y-4 md:space-y-6">
      <PageIntro
        title="Churn"
        description="Cancellations and expired subscriptions from RevenueCat."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Churn rate"
          value={`${DEMO_SUMMARY.churnRate}%`}
          hint="Trailing 30 days"
          trend="down"
        />
        <StatCard
          label="Churned this week"
          value={formatNumber(DEMO_SUMMARY.churned7d)}
          hint="Cancelled or expired"
        />
        <StatCard
          label="Refunds"
          value={formatNumber(DEMO_SUMMARY.refunds7d)}
          hint="Last 7 days"
        />
      </div>
      <SubscriberTable rows={DEMO_CHURN} empty="No churn events." />
    </div>
  )
}

function RevenueSection() {
  return (
    <div className="space-y-4 md:space-y-6">
      <PageIntro
        title="Revenue"
        description="Proceeds and recurring revenue from RevenueCat."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="MRR"
          value={formatCurrency(DEMO_SUMMARY.mrr)}
          hint="Normalized monthly"
        />
        <StatCard
          label="ARR"
          value={formatCurrency(DEMO_SUMMARY.arr)}
          hint="Annualized"
        />
        <StatCard
          label="7-day revenue"
          value={formatCurrency(DEMO_SUMMARY.revenue7d)}
          hint={`${formatPercent(DEMO_SUMMARY.revenueChange)} vs prior week`}
          trend="up"
        />
        <StatCard
          label="ARPU"
          value={formatCurrency(
            DEMO_SUMMARY.mrr / DEMO_SUMMARY.activeSubscriptions
          )}
          hint="MRR / active subs"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Daily revenue</CardTitle>
          <CardDescription>Estimated proceeds, last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={revenueConfig} className="h-[260px] w-full">
            <AreaChart data={DEMO_TREND} accessibilityLayer>
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
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(value) => `$${value}`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                }
              />
              <Area
                dataKey="revenue"
                type="natural"
                fill="var(--color-revenue)"
                fillOpacity={0.2}
                stroke="var(--color-revenue)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function ConnectionSection() {
  const {
    connections,
    connectProvider,
    disconnectProvider,
    updateApiKeyDraft,
  } = useKpis()

  return (
    <div className="space-y-4 md:space-y-6">
      <PageIntro
        title="Connection"
        description="Add API keys so Stand can pull subscription and paywall metrics."
      />

      <ProviderConnectionCard
        provider="revenuecat"
        title="RevenueCat"
        description="Secret API key from RevenueCat Project settings → API keys."
        placeholder="sk_…"
        connection={connections.revenuecat}
        onApiKeyChange={(value) => updateApiKeyDraft("revenuecat", value)}
        onConnect={() =>
          connectProvider("revenuecat", connections.revenuecat.apiKey)
        }
        onDisconnect={() => disconnectProvider("revenuecat")}
      />

      <ProviderConnectionCard
        provider="superwall"
        title="Superwall"
        description="Optional. Use your Superwall API key for paywall funnel metrics."
        placeholder="sw_…"
        connection={connections.superwall}
        onApiKeyChange={(value) => updateApiKeyDraft("superwall", value)}
        onConnect={() =>
          connectProvider("superwall", connections.superwall.apiKey)
        }
        onDisconnect={() => disconnectProvider("superwall")}
      />

      <Card>
        <CardHeader>
          <CardTitle>Demo mode</CardTitle>
          <CardDescription>
            KPI charts and tables currently show sample RevenueCat data so you
            can explore the UI before live sync is wired.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}

function ProviderConnectionCard({
  provider,
  title,
  description,
  placeholder,
  connection,
  onApiKeyChange,
  onConnect,
  onDisconnect,
}: {
  provider: KpiProviderId
  title: string
  description: string
  placeholder: string
  connection: {
    apiKey: string
    connectedAt: string | null
  }
  onApiKeyChange: (value: string) => void
  onConnect: () => void
  onDisconnect: () => void
}) {
  const connected = isConnected({
    provider,
    apiKey: connection.apiKey,
    connectedAt: connection.connectedAt,
  })
  const [reveal, setReveal] = React.useState(false)
  const inputId = `${provider}-api-key`

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Badge variant={connected ? "default" : "outline"}>
          {connected ? "Connected" : "Not connected"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={inputId}>API key</Label>
          <Input
            id={inputId}
            type={reveal ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            value={connection.apiKey}
            onChange={(event) => onApiKeyChange(event.target.value)}
          />
          {connected && !reveal && connection.apiKey && (
            <p className="text-xs text-muted-foreground">
              Stored as {maskApiKey(connection.apiKey)}
              {connection.connectedAt
                ? ` · connected ${formatDateTime(connection.connectedAt)}`
                : null}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={onConnect}
            disabled={!connection.apiKey.trim()}
          >
            {connected ? "Save & reconnect" : "Connect"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setReveal((current) => !current)}
          >
            {reveal ? "Hide key" : "Show key"}
          </Button>
          {connected && (
            <Button type="button" variant="ghost" onClick={onDisconnect}>
              Disconnect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function PageIntro({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
  trend,
}: {
  label: string
  value: string
  hint: string
  trend?: "up" | "down"
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
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

function SubscriberTable({
  rows,
  empty,
}: {
  rows: SubscriberEvent[]
  empty: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.email}
                      </div>
                    </TableCell>
                    <TableCell>{row.product}</TableCell>
                    <TableCell>{row.plan}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.amount)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDateTime(row.startedAt)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {empty}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function TrialTable({ rows }: { rows: TrialEvent[] }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Days left</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead className="text-right">Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.email}
                    </div>
                  </TableCell>
                  <TableCell>{row.product}</TableCell>
                  <TableCell className="tabular-nums">
                    {row.converted === null ? row.daysLeft : "—"}
                  </TableCell>
                  <TableCell>
                    {row.converted === null ? (
                      <Badge variant="outline">In trial</Badge>
                    ) : row.converted ? (
                      <Badge>Converted</Badge>
                    ) : (
                      <Badge variant="secondary">Expired</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDateTime(row.startedAt)}
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

function StatusBadge({ status }: { status: SubscriberEvent["status"] }) {
  if (status === "active") {
    return <Badge>Active</Badge>
  }

  if (status === "trialing") {
    return <Badge variant="outline">Trialing</Badge>
  }

  if (status === "cancelled") {
    return <Badge variant="secondary">Cancelled</Badge>
  }

  return <Badge variant="secondary">Expired</Badge>
}
