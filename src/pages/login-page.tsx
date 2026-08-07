import * as React from "react"
import { Navigate, useLocation } from "react-router-dom"

import { useAuth } from "@/components/auth-provider"
import { useBranding } from "@/components/branding-provider"
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
import { ApiError, authApi } from "@/lib/api"

export function LoginPage() {
  const { status, signIn } = useAuth()
  const location = useLocation()
  const branding = useBranding()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [mode, setMode] = React.useState<"sign-in" | "forgot">("sign-in")
  const [resetSent, setResetSent] = React.useState(false)

  if (status === "authenticated") {
    const from = (location.state as { from?: string } | null)?.from ?? "/"
    return <Navigate to={from} replace />
  }

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await signIn(email.trim(), password)
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not sign in. Try again."
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForgot(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await authApi.requestPasswordReset(email.trim())
      // Always report success, so this form cannot be used to discover which
      // email addresses have accounts.
      setResetSent(true)
    } catch {
      setResetSent(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-muted/40 flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          {branding.logo ? (
            <img
              src={branding.logo}
              alt={branding.name}
              className="size-12 rounded-lg object-contain"
            />
          ) : null}
          <div>
            <h1 className="text-xl font-semibold">{branding.name}</h1>
            <p className="text-muted-foreground text-sm">Admin panel</p>
          </div>
        </div>

        <Card>
          {mode === "sign-in" ? (
            <>
              <CardHeader>
                <CardTitle>Sign in</CardTitle>
                <CardDescription>
                  Use the email and password you were invited with.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@company.com"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </div>

                  {error ? (
                    <p className="text-destructive text-sm" role="alert">
                      {error}
                    </p>
                  ) : null}

                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Signing in…" : "Sign in"}
                  </Button>

                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
                    onClick={() => {
                      setMode("forgot")
                      setError(null)
                    }}
                  >
                    Forgot your password?
                  </button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle>Reset your password</CardTitle>
                <CardDescription>
                  We will email you a link to choose a new one.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {resetSent ? (
                  <div className="flex flex-col gap-4">
                    <p className="text-sm">
                      If an account exists for <strong>{email}</strong>, a reset
                      link is on its way. The link expires in one hour.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setMode("sign-in")
                        setResetSent(false)
                      }}
                    >
                      Back to sign in
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgot} className="flex flex-col gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@company.com"
                      />
                    </div>

                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Sending…" : "Send reset link"}
                    </Button>

                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
                      onClick={() => setMode("sign-in")}
                    >
                      Back to sign in
                    </button>
                  </form>
                )}
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-muted-foreground mt-6 text-center text-xs">
          Access is invite only. Ask an owner or admin for an account.
        </p>
      </div>
    </div>
  )
}
