import * as React from "react"
import { Link, Navigate, useSearchParams } from "react-router-dom"

import { AuthShell } from "@/components/auth-shell"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ApiError, authApi } from "@/lib/api"

/**
 * Where the sign up confirmation email lands. Confirms the address with the
 * API from here, which also signs the new owner in, then opens the panel.
 */
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const { refresh } = useAuth()
  const token = searchParams.get("token")

  const [state, setState] = React.useState<"working" | "done" | "failed">(
    token ? "working" : "failed"
  )
  const [error, setError] = React.useState<string | null>(
    token ? null : "This link is missing its token."
  )
  const started = React.useRef(false)

  React.useEffect(() => {
    // Once only: React's development double effect would spend the link twice.
    if (!token || started.current) {
      return
    }

    started.current = true

    authApi
      .verifyEmail(token)
      .then(async () => {
        await refresh()
        setState("done")
      })
      .catch((caught: unknown) => {
        setError(
          caught instanceof ApiError
            ? caught.message
            : "Could not confirm your email. Try the link again."
        )
        setState("failed")
      })
  }, [token, refresh])

  if (state === "done") {
    // An address confirmed twice signs nobody in the second time; the panel's
    // guard then sends them to sign in, which is what they need.
    return <Navigate to="/" replace />
  }

  return (
    <AuthShell>
      <Card>
        <CardHeader>
          <CardTitle>
            {state === "working" ? "Confirming your email…" : "That link did not work"}
          </CardTitle>
          {error ? <CardDescription>{error}</CardDescription> : null}
        </CardHeader>
        {state === "failed" ? (
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/login">Sign in</Link>
            </Button>
          </CardContent>
        ) : null}
      </Card>
    </AuthShell>
  )
}
