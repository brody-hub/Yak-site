import * as React from "react"

import { useAuth } from "@/components/auth-provider"
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
import { ApiError } from "@/lib/api"

export const PASSWORD_MIN_LENGTH = 12

/**
 * Shown in place of the panel while an invited account still has the temporary
 * password it was created with. There is no way to skip it.
 */
export function ChangePasswordPage() {
  const { user, changePassword, signOut } = useAuth()

  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const tooShort = newPassword.length > 0 && newPassword.length < PASSWORD_MIN_LENGTH
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

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
      await changePassword(currentPassword, newPassword)
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not change your password. Try again."
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
            <CardTitle>Choose a new password</CardTitle>
            <CardDescription>
              {user?.email} is still using the temporary password from its
              invite. Pick a new one to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="current-password">Temporary password</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  aria-invalid={tooShort}
                />
                <p className="text-muted-foreground text-xs">
                  At least {PASSWORD_MIN_LENGTH} characters.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  aria-invalid={mismatch}
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

              <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
                onClick={() => void signOut()}
              >
                Sign out
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
