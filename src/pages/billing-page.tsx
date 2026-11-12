import * as React from "react"
import { useSearchParams } from "react-router-dom"
import { CheckIcon, ExternalLinkIcon } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { IntervalToggle } from "@/components/plan-cards"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  type PlanTierId,
} from "@/lib/api"
import {
  type BillingInterval,
  formatHistory,
  formatNumber,
  formatPrice,
  isCheckoutPlan,
  mauRange,
  planName,
} from "@/lib/plans"
import { cn } from "@/lib/utils"

/**
 * The plan, the live MAU meter, and the tier ladder, with the doors to
 * Stripe: Checkout to start paying for a tier, the customer portal to change
 * or cancel one. The tier itself only moves when Stripe's webhook says so,
 * which is why a finished checkout waits here for it.
 */
export function BillingPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [summary, setSummary] = React.useState<BillingSummary | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [interval, setBillingInterval] =
    React.useState<BillingInterval>("monthly")
  const [redirecting, setRedirecting] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    try {
      const result = await billingApi.get()
      setSummary(result)
      setError(null)
      return result
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Could not load billing"
      )
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false

    billingApi
      .get()
      .then((result) => {
        if (!cancelled) {
          setSummary(result)
          setError(null)
          if (result.pendingInterval) {
            setBillingInterval(result.pendingInterval)
          }
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

  // Back from Stripe. The webhook usually lands within seconds of the
  // redirect, so look again a few times before calling it pending.
  const checkout = searchParams.get("checkout")

  React.useEffect(() => {
    if (!checkout) {
      return
    }

    setSearchParams({}, { replace: true })

    if (checkout === "cancelled") {
      toast("Checkout cancelled. Nothing was charged.")
      return
    }

    if (checkout !== "success") {
      return
    }

    let cancelled = false
    let attempts = 0

    async function poll() {
      const result = await load()
      attempts += 1

      if (cancelled) {
        return
      }

      if (result?.hasSubscription) {
        toast.success(`You are on ${result.plan.name}. Thank you!`)
        return
      }

      if (attempts < 6) {
        setTimeout(() => void poll(), 2000)
      } else {
        toast("Payment received. Your plan will update in a moment.")
      }
    }

    void poll()

    return () => {
      cancelled = true
    }
  }, [checkout, load, setSearchParams])

  async function goToStripe(action: () => Promise<string>, label: string) {
    setRedirecting(label)

    try {
      window.location.assign(await action())
    } catch (caught) {
      toast.error(
        caught instanceof ApiError ? caught.message : "Could not open Stripe"
      )
      setRedirecting(null)
    }
  }

  function startCheckout(plan: PlanTierId, chosenInterval: BillingInterval) {
    void goToStripe(
      () => billingApi.checkout({ plan, interval: chosenInterval }),
      plan
    )
  }

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

  const { plan, plans, usage, paymentsEnabled, hasSubscription, pendingPlan } =
    summary
  const canCheckout = paymentsEnabled && !hasSubscription
  const suggested = plans.find((tier) => tier.id === usage.suggestedPlanId)
  const suggestsChange = suggested && suggested.id !== plan.id
  const capPercent =
    plan.mauCap === null
      ? null
      : Math.min(100, Math.round((usage.currentMonthMau / plan.mauCap) * 100))

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {pendingPlan && canCheckout ? (
        <div className="px-4 lg:px-6">
          <Card className="border-primary/40">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
              <div className="space-y-1.5">
                <CardTitle>Finish upgrading to {planName(plans, pendingPlan)}</CardTitle>
                <CardDescription>
                  You picked {planName(plans, pendingPlan)} (
                  {summary.pendingInterval ?? "monthly"}) when you signed up.
                  You are on Free until payment goes through.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  disabled={redirecting !== null}
                  onClick={() => {
                    void billingApi
                      .dismissPending()
                      .then(() => load())
                      .catch(() => toast.error("Could not update your plan"))
                  }}
                >
                  Stay on Free
                </Button>
                <Button
                  disabled={redirecting !== null}
                  onClick={() =>
                    startCheckout(
                      pendingPlan,
                      summary.pendingInterval ?? "monthly"
                    )
                  }
                >
                  {redirecting === pendingPlan
                    ? "Opening checkout…"
                    : "Continue to payment"}
                </Button>
              </div>
            </CardHeader>
          </Card>
        </div>
      ) : null}

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
            {summary.subscriptionStatus === "past_due" ? (
              <p className="rounded-lg border border-orange-500/40 bg-orange-500/5 p-3 text-sm">
                Your last payment did not go through. Update your card in
                Manage billing to keep {plan.name}.
              </p>
            ) : null}
            {hasSubscription && paymentsEnabled ? (
              <Button
                variant="outline"
                disabled={redirecting !== null}
                onClick={() =>
                  void goToStripe(() => billingApi.portal(), "portal")
                }
              >
                <ExternalLinkIcon />
                {redirecting === "portal" ? "Opening…" : "Manage billing"}
              </Button>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {!paymentsEnabled
                ? `Online payments are not available yet. To change ${user?.tenant?.name ?? "this workspace"}'s plan, contact support.`
                : hasSubscription
                  ? "Change plan, update your card, see invoices or cancel in Manage billing."
                  : "Choose a plan below to pay by card through Stripe."}
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
                {canCheckout && isCheckoutPlan(suggested)
                  ? " You can switch to it below."
                  : hasSubscription
                    ? " You can switch to it in Manage billing."
                    : ""}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle>Tiers</CardTitle>
              <CardDescription>
                Every tier has every module. They differ by how many active
                users they cover and how much history Yak keeps.
              </CardDescription>
            </div>
            {canCheckout ? (
              <IntervalToggle value={interval} onChange={setBillingInterval} />
            ) : null}
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
                    {canCheckout ? <TableHead /> : null}
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
                      action={
                        canCheckout ? (
                          isCheckoutPlan(tier) && tier.id !== plan.id ? (
                            <Button
                              size="sm"
                              variant={
                                tier.id === suggested?.id ? "default" : "outline"
                              }
                              disabled={redirecting !== null}
                              onClick={() => startCheckout(tier.id, interval)}
                            >
                              {redirecting === tier.id ? "Opening…" : "Choose"}
                            </Button>
                          ) : null
                        ) : undefined
                      }
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
  action,
}: {
  tier: BillingPlan
  previous: BillingPlan | undefined
  current: boolean
  suggested: boolean
  /** Undefined when the table has no action column at all. */
  action?: React.ReactNode
}) {
  const range = mauRange(tier, previous)

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
      {action !== undefined ? (
        <TableCell className="text-right">{action}</TableCell>
      ) : null}
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
