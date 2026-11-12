import * as React from "react"
import { Link } from "react-router-dom"
import {
  BellRingIcon,
  ChartLineIcon,
  CircleDollarSignIcon,
  InboxIcon,
  MegaphoneIcon,
  UsersIcon,
} from "lucide-react"

import { IntervalToggle, PlanCards } from "@/components/plan-cards"
import { useBranding } from "@/components/branding-provider"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAppConfig } from "@/hooks/use-app-config"
import type { BillingPlan } from "@/lib/api"
import type { BillingInterval } from "@/lib/plans"

const FEATURES = [
  {
    icon: InboxIcon,
    title: "Support inbox",
    body: "Bug reports and feedback from inside your app land in one inbox, with the device, version and user attached.",
  },
  {
    icon: ChartLineIcon,
    title: "Analytics and KPIs",
    body: "Send events from your app and see active users, retention and the numbers you care about on one dashboard.",
  },
  {
    icon: UsersIcon,
    title: "Your users",
    body: "Every user your app syncs, with their plan and history, so support and analytics share one picture.",
  },
  {
    icon: CircleDollarSignIcon,
    title: "Revenue",
    body: "Connect RevenueCat and put subscriptions and revenue next to usage.",
  },
  {
    icon: BellRingIcon,
    title: "Alerts",
    body: "Post new reports and key events to Discord or your own webhooks as they happen.",
  },
  {
    icon: MegaphoneIcon,
    title: "Creator marketing",
    body: "Track creator campaigns from Sideshift against the installs and revenue they bring.",
  },
] as const

/**
 * The front door for anyone signed out: what the product does, what it costs,
 * and the way in. Plans come from the server, so prices here always match
 * Billing and checkout.
 */
export function LandingPage() {
  const branding = useBranding()
  const { config } = useAppConfig()
  const [interval, setBillingInterval] = React.useState<BillingInterval>("monthly")

  const signUpEnabled = config?.signUpEnabled ?? false

  function planAction(tier: BillingPlan) {
    if (tier.id === "scale") {
      return (
        <p className="text-muted-foreground text-sm">
          For larger apps. Talk to us about a contract.
        </p>
      )
    }

    // Paid tiers need online payments; until then everyone starts free.
    if (!signUpEnabled || (tier.id !== "free" && !config?.paymentsEnabled)) {
      return null
    }

    return (
      <Button
        asChild
        className="w-full"
        variant={tier.id === "growth" ? "default" : "outline"}
      >
        <Link to={`/signup?plan=${tier.id}&interval=${interval}`}>
          {tier.id === "free" ? "Start free" : `Choose ${tier.name}`}
        </Link>
      </Button>
    )
  }

  return (
    <div className="bg-background min-h-svh">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          {branding.logo ? (
            <img
              src={branding.logo}
              alt=""
              className="size-7 rounded-md object-contain"
            />
          ) : null}
          {branding.name}
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <a href="#pricing">Pricing</a>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/login">Sign in</Link>
          </Button>
          {signUpEnabled ? (
            <Button asChild>
              <Link to="/signup">Get started</Link>
            </Button>
          ) : null}
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-6 pt-16 pb-20 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Support, analytics and revenue for your app, in one place.
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-lg text-pretty">
            Collect bug reports from inside your app, see who uses it and how,
            and keep revenue alongside it, for every app you run.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {signUpEnabled ? (
              <Button asChild size="lg" className="px-4">
                <Link to="/signup">Start free</Link>
              </Button>
            ) : null}
            <Button asChild size="lg" variant="outline" className="px-4">
              <a href="#pricing">See pricing</a>
            </Button>
          </div>
          {!signUpEnabled && config ? (
            <p className="text-muted-foreground mt-4 text-sm">
              New accounts are by invitation for now.{" "}
              <Link to="/login" className="underline underline-offset-4">
                Sign in
              </Link>{" "}
              if you have one.
            </p>
          ) : null}
        </section>

        <section className="bg-muted/40 border-y">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="space-y-2">
                <div className="bg-background flex size-9 items-center justify-center rounded-lg border">
                  <Icon className="size-4" />
                </div>
                <h2 className="font-medium">{title}</h2>
                <p className="text-muted-foreground text-sm">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl scroll-mt-6 px-6 py-20">
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Pricing</h2>
              <p className="text-muted-foreground mt-2">
                Priced by monthly active users across all your apps. Every plan
                includes every feature.
              </p>
            </div>
            <IntervalToggle value={interval} onChange={setBillingInterval} />
          </div>

          {config ? (
            <PlanCards
              plans={config.plans}
              interval={interval}
              renderAction={planAction}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-56 rounded-xl" />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="text-muted-foreground border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-sm">
          <span>
            © {new Date().getFullYear()} {branding.name}
          </span>
          <Link to="/login" className="hover:text-foreground">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  )
}
