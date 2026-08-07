import * as React from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

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
import { PASSWORD_MIN_LENGTH } from "@/pages/change-password-page"

/** Landing page for the link in a password reset email. */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get("token")

  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [done, setDone] = React.useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!token) {
      setError("This reset link is missing its token.")
      return
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setError(`Use at least ${PASSWORD_MIN_LENGTH} characters.`)
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Those passwords do not match.")
      return
    }

    setSubmitting(true)

    try {
      await authApi.resetPassword(token, newPassword)
      setDone(true)
      setTimeout(() => navigate("/login", { replace: true }), 1500)
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not reset your password. Request a new link."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-muted/40 flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>Set a new password</CardTitle>
            <CardDescription>
              {done
                ? "Your password has been updated."
                : "Choose the password you will use to sign in."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!token ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm">
                  This link is invalid. Request a new one from the sign in
                  screen.
                </p>
                <Button asChild variant="outline">
                  <Link to="/login">Back to sign in</Link>
                </Button>
              </div>
            ) : done ? (
              <Button asChild>
                <Link to="/login">Continue to sign in</Link>
              </Button>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                  <p className="text-muted-foreground text-xs">
                    At least {PASSWORD_MIN_LENGTH} characters.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>

                {error ? (
                  <p className="text-destructive text-sm" role="alert">
                    {error}
                  </p>
                ) : null}

                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving…" : "Set password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
