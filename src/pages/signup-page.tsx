import * as React from "react"
import { Link, Navigate, useSearchParams } from "react-router-dom"

import { AuthShell } from "@/components/auth-shell"
import { useAuth } from "@/components/auth-provider"
import { IntervalToggle, PlanCards } from "@/components/plan-cards"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useAppConfig } from "@/hooks/use-app-config"
import { ApiError, authApi, type PlanTierId, signupApi } from "@/lib/api"
import { type BillingInterval, isCheckoutPlan } from "@/lib/plans"

const PLAN_IDS: PlanTierId[] = ["free", "starter", "growth", "pro", "studio"]

/**
 * Self-serve sign up. Creates the account on Free and emails a link to choose
 * a password, which is also what confirms the email: the form itself never
 * sets a password, so nobody can claim an inbox they do not read. A paid tier
 * picked here is paid for through Stripe right after the owner first signs in.
 */
export function SignupPage() {
  const { status } = useAuth()
  const { config, failed } = useAppConfig()
  const [searchParams] = useSearchParams()

  const initialPlan = searchParams.get("plan") as PlanTierId | null
  const [plan, setPlan] = React.useState<PlanTierId>(
    initialPlan && PLAN_IDS.includes(initialPlan) ? initialPlan : "free"
  )
  const [interval, setBillingInterval] = React.useState<BillingInterval>(
    searchParams.get("interval") === "annual" ? "annual" : "monthly"
  )

  const [accountName, setAccountName] = React.useState("")
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [sentTo, setSentTo] = React.useState<string | null>(null)

  if (status === "authenticated") {
    return <Navigate to="/" replace />
  }

  if (sentTo) {
    return <CheckEmail email={sentTo} />
  }

  if (failed) {
    return (
      <AuthShell>
        <Card>
          <CardHeader>
            <CardTitle>Could not reach the server</CardTitle>
            <CardDescription>Refresh the page to try again.</CardDescription>
          </CardHeader>
        </Card>
      </AuthShell>
    )
  }

  if (!config) {
    return (
      <AuthShell wide>
        <Skeleton className="h-[32rem] rounded-xl" />
      </AuthShell>
    )
  }

  if (!config.signUpEnabled) {
    return (
      <AuthShell>
        <Card>
          <CardHeader>
            <CardTitle>Sign up is not open yet</CardTitle>
            <CardDescription>
              New accounts are by invitation for now.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </AuthShell>
    )
  }

  const plans = config.plans
  // A paid tier from a pricing link cannot be bought while payments are off.
  const submittedPlan: PlanTierId = config.paymentsEnabled ? plan : "free"
  const chosen = plans.find((tier) => tier.id === submittedPlan)
  const paid = chosen ? isCheckoutPlan(chosen) : false

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const result = await signupApi.create({
        accountName: accountName.trim(),
        name: name.trim(),
        email: email.trim(),
        plan: submittedPlan,
        interval,
      })
      setSentTo(result.email)
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? (caught.details?.[0]?.message ?? caught.message)
          : "Could not create your account. Try again."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell subtitle="Create your account" wide>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle>Pick a plan</CardTitle>
              <CardDescription>
                {config.paymentsEnabled
                  ? "Start free, or pay for a plan right after you confirm your email. Change it any time."
                  : "Paid plans are not available online yet. Start free and upgrade later."}
              </CardDescription>
            </div>
            {config.paymentsEnabled ? (
              <IntervalToggle value={interval} onChange={setBillingInterval} />
            ) : null}
          </CardHeader>
          <CardContent>
            <PlanCards
              plans={
                config.paymentsEnabled
                  ? plans
                  : plans.filter((tier) => tier.id === "free")
              }
              interval={interval}
              selected={submittedPlan}
              onSelect={(tier) => setPlan(tier.id)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your account</CardTitle>
            <CardDescription>
              You will be its owner and can invite your team afterwards.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="account-name">Company or app name</Label>
              <Input
                id="account-name"
                required
                maxLength={120}
                autoComplete="organization"
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
                placeholder="Acme Labs"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                required
                maxLength={120}
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <p className="text-muted-foreground text-sm sm:col-span-2">
              We will email you a link to choose your password.
            </p>

            {error ? (
              <p className="text-destructive text-sm sm:col-span-2" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 sm:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? "Creating your account…"
                  : paid
                    ? `Create account and continue to payment`
                    : "Create account"}
              </Button>
              <p className="text-muted-foreground text-center text-sm">
                Already have an account?{" "}
                <Link to="/login" className="underline underline-offset-4">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </form>
    </AuthShell>
  )
}

function CheckEmail({ email }: { email: string }) {
  const [resent, setResent] = React.useState(false)

  return (
    <AuthShell>
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a link to <strong>{email}</strong>. Open it to choose your
            password and finish setting up your account. The link works for
            one hour.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            variant="outline"
            disabled={resent}
            onClick={() => {
              void authApi.requestPasswordReset(email).finally(() => {
                setResent(true)
              })
            }}
          >
            {resent ? "Sent again" : "Send the link again"}
          </Button>
          <Button asChild variant="ghost">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </AuthShell>
  )
}
