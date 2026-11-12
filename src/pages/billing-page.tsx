import * as React from "react"
import { CheckIcon } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ApiError,
  billingApi,
  type BillingPlan,
  type BillingSummary,
} from "@/lib/api"
import { cn } from "@/lib/utils"

/**
 * The plan, the live MAU meter that sets it, and the tier ladder. Yak charges
 * by monthly active users added up across every app in the workspace; paid
 * tiers follow the peak of the last two full months so one spike does not
 * change the bill. Payments are not wired up yet, so nothing here changes the
 * plan: that goes through support until Stripe is connected.
 */
export function BillingPage() {
  const { user } = useAuth()
  const [summary, setSummary] = React.useState<BillingSummary | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false

    billingApi
      .get()
      .then((result) => {
        if (!cancelled) {
          setSummary(result)
          setError(null)
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(
            caught instanceof ApiError
              ? caught.message
              : "Could not load billing"
          )
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

  if (loading) {
    return (
      <div className="flex flex-col gap-4 px-4 py-6 lg:px-6">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <h2 className="text-lg font-semibold">Could not load billing</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  const { plan, plans, usage, paymentsEnabled } = summary
  const suggested = plans.find((tier) => tier.id === usage.suggestedPlanId)
  const suggestsChange = suggested && suggested.id !== plan.id
  const capPercent =
    plan.mauCap === null
      ? null
      : Math.min(100, Math.round((usage.currentMonthMau / plan.mauCap) * 100))

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {plan.name}
              <Badge variant="secondary">Current plan</Badge>
            </CardTitle>
            <CardDescription>
              {plan.monthlyPrice === null
                ? "Custom pricing"
                : plan.monthlyPrice === 0
                  ? "Free while you build"
                  : `${formatPrice(plan.monthlyPrice)}/month, or ${formatPrice(plan.annualPrice ?? 0)}/year with two months free`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Limit label="Monthly active users">
                {plan.mauCap === null ? "Custom" : `Up to ${formatNumber(plan.mauCap)}`}
              </Limit>
              <Limit label="Admin seats">
                {plan.adminSeats === null ? "Unlimited" : plan.adminSeats}
              </Limit>
              <Limit label="Data history">{formatHistory(plan.historyDays)}</Limit>
              <Limit label="Events per month">
                {plan.eventsPerMonth === null
                  ? "Custom"
                  : formatNumber(plan.eventsPerMonth)}
              </Limit>
              <Limit label="Support">
                {plan.support === "email" ? "Email" : "Documentation"}
              </Limit>
            </dl>
            <p className="text-xs text-muted-foreground">
              {paymentsEnabled
                ? "Plan changes take effect from the next billing cycle."
                : `Online payments are not available yet. To change ${user?.tenant?.name ?? "this workspace"}'s plan, contact support.`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly active users</CardTitle>
            <CardDescription>
              Unique end users with at least one event in a calendar month,
              added up across every app. Paid tiers follow the peak of the last
              two full months.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Meter label="This month" value={usage.currentMonthMau} />
              <Meter label="Last month" value={usage.previousMonthMau} />
              <Meter label="Billable peak" value={usage.billableMau} />
            </div>
            {capPercent !== null ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>This month against the {plan.name} cap</span>
                  <span className="tabular-nums">{capPercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full bg-primary transition-[width]",
                      capPercent >= 80 && "bg-orange-500"
                    )}
                    style={{ width: `${capPercent}%` }}
                  />
                </div>
              </div>
            ) : null}
            {suggestsChange ? (
              <p className="rounded-lg border bg-muted/40 p-3 text-sm">
                Based on the billable peak, this workspace fits the{" "}
                <span className="font-medium">{suggested.name}</span> tier.
                {paymentsEnabled
                  ? " Yak moves accounts automatically with notice."
                  : " Yak will move accounts automatically once billing is live."}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Tiers</CardTitle>
            <CardDescription>
              Every tier has every module. They differ by how many active users
              they cover and how much history Yak keeps.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tier</TableHead>
                    <TableHead>Monthly active users</TableHead>
                    <TableHead>Monthly</TableHead>
                    <TableHead>Annual</TableHead>
                    <TableHead>Admin seats</TableHead>
                    <TableHead>Data history</TableHead>
                    <TableHead>Support</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((tier, index) => (
                    <TierRow
                      key={tier.id}
                      tier={tier}
                      previous={plans[index - 1]}
                      current={tier.id === plan.id}
                      suggested={Boolean(suggestsChange) && tier.id === suggested?.id}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function TierRow({
  tier,
  previous,
  current,
  suggested,
}: {
  tier: BillingPlan
  previous: BillingPlan | undefined
  current: boolean
  suggested: boolean
}) {
  const range =
    tier.mauCap === null
      ? `${formatNumber((previous?.mauCap ?? 0) + 1)}+`
      : previous?.mauCap
        ? `${formatNumber(previous.mauCap + 1)} to ${formatNumber(tier.mauCap)}`
        : `Up to ${formatNumber(tier.mauCap)}`

  return (
    <TableRow className={cn(current && "bg-muted/40")}>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium">{tier.name}</span>
          {current ? <CheckIcon className="size-4 text-primary" /> : null}
          {suggested ? <Badge variant="secondary">Suggested</Badge> : null}
        </div>
      </TableCell>
      <TableCell className="tabular-nums">{range}</TableCell>
      <TableCell className="tabular-nums">
        {tier.monthlyPrice === null
          ? "Custom"
          : tier.monthlyPrice === 0
            ? "$0"
            : formatPrice(tier.monthlyPrice)}
      </TableCell>
      <TableCell className="tabular-nums">
        {tier.annualPrice === null ? "—" : formatPrice(tier.annualPrice)}
      </TableCell>
      <TableCell>
        {tier.adminSeats === null ? "Unlimited" : tier.adminSeats}
      </TableCell>
      <TableCell>{formatHistory(tier.historyDays)}</TableCell>
      <TableCell>{tier.support === "email" ? "Email" : "Docs only"}</TableCell>
    </TableRow>
  )
}

function Limit({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">
        {formatNumber(value)}
      </p>
    </div>
  )
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value)
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatHistory(days: number | null) {
  if (days === null) {
    return "Custom"
  }

  if (days < 365) {
    return `${days} days`
  }

  const months = Math.round(days / 30.4)
  return months % 12 === 0 ? `${months / 12} year${months === 12 ? "" : "s"}` : `${months} months`
}
