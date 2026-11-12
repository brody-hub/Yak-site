import * as React from "react"
import { Link, useLocation } from "react-router-dom"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { billingApi, type BillingSummary } from "@/lib/api"
import { planName } from "@/lib/plans"

/**
 * A paid tier picked at sign up and not paid for yet. The first time the owner
 * lands in the panel (straight from the confirmation email) they go on to
 * Stripe Checkout, which is what the sign up form promised; if they come back
 * without paying, this banner stays until they pay or choose Free.
 */
export function PendingPlanBanner() {
  const { user, canManageUsers } = useAuth()
  const location = useLocation()
  const [summary, setSummary] = React.useState<BillingSummary | null>(null)
  const tenantId = user?.tenant?.id

  // Billing changes rarely; re-read on arrival and when leaving Billing,
  // where the choice is made.
  const onBilling = location.pathname.startsWith("/settings/billing")

  React.useEffect(() => {
    if (!canManageUsers || onBilling) {
      return
    }

    let cancelled = false

    billingApi
      .get()
      .then((result) => {
        if (!cancelled) {
          setSummary(result)
        }
      })
      .catch(() => {
        // Billing is a nicety here; the panel works without it.
      })

    return () => {
      cancelled = true
    }
  }, [canManageUsers, onBilling])

  const pending =
    summary?.pendingPlan && summary.paymentsEnabled && !summary.hasSubscription
      ? summary.pendingPlan
      : null

  React.useEffect(() => {
    if (!pending || !tenantId || !summary) {
      return
    }

    const key = `yak:pending-checkout:${tenantId}`

    try {
      if (sessionStorage.getItem(key)) {
        return
      }
      sessionStorage.setItem(key, "1")
    } catch {
      return
    }

    billingApi
      .checkout()
      .then((url) => window.location.assign(url))
      .catch(() => {
        // The banner below still offers the way to pay.
      })
  }, [pending, tenantId, summary])

  if (!pending || !summary || onBilling) {
    return null
  }

  return (
    <div className="bg-primary/5 border-primary/30 mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm lg:mx-6">
      <p>
        You picked <strong>{planName(summary.plans, pending)}</strong> when you
        signed up. You are on Free until you finish paying.
      </p>
      <Button asChild size="sm">
        <Link to="/settings/billing">Finish upgrading</Link>
      </Button>
    </div>
  )
}
