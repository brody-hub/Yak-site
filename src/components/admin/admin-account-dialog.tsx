import * as React from "react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ApiError, meApi } from "@/lib/api"
import { PASSWORD_MIN_LENGTH } from "@/pages/change-password-page"

/**
 * The super admin's own profile: name and password. The panel's account
 * dialog also syncs the customer roster and uploads avatars, neither of which
 * a super admin has.
 */
export function AdminAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        {/* Mounted per opening, so the fields start fresh every time. */}
        {open ? <AccountForm /> : null}
      </DialogContent>
    </Dialog>
  )
}

function AccountForm() {
  const { user, setUser, changePassword } = useAuth()

  const [name, setName] = React.useState(user?.name ?? "")
  const [savingName, setSavingName] = React.useState(false)
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [savingPassword, setSavingPassword] = React.useState(false)
  const [passwordError, setPasswordError] = React.useState<string | null>(null)

  if (!user) {
    return null
  }

  const saveName = async () => {
    const trimmed = name.trim()

    if (!trimmed || trimmed === user.name) {
      return
    }

    setSavingName(true)

    try {
      setUser(await meApi.updateName(trimmed))
      toast.success("Name updated")
    } catch {
      setName(user.name)
      toast.error("Could not update your name")
    } finally {
      setSavingName(false)
    }
  }

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setPasswordError(null)

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setPasswordError(`Use at least ${PASSWORD_MIN_LENGTH} characters.`)
      return
    }

    setSavingPassword(true)

    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword("")
      setNewPassword("")
      toast.success("Password changed")
    } catch (error) {
      setPasswordError(
        error instanceof ApiError
          ? error.message
          : "Could not change your password."
      )
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="admin-account-name">Name</Label>
        <div className="flex gap-2">
          <Input
            id="admin-account-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => void saveName()}
          />
          <Button
            type="button"
            onClick={() => void saveName()}
            disabled={savingName || name.trim() === user.name}
          >
            Save
          </Button>
        </div>
      </div>

      <Separator />

      <form
        onSubmit={(event) => void savePassword(event)}
        className="space-y-3"
      >
        <Label>Change password</Label>
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="Current password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <Input
          type="password"
          autoComplete="new-password"
          placeholder={`New password (${PASSWORD_MIN_LENGTH}+ characters)`}
          required
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />

        {passwordError ? (
          <p className="text-sm text-destructive" role="alert">
            {passwordError}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="outline"
            disabled={savingPassword || !currentPassword || !newPassword}
          >
            {savingPassword ? "Saving…" : "Update password"}
          </Button>
        </div>
      </form>
    </div>
  )
}
