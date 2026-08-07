import * as React from "react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
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
import { useSystemUsers } from "@/components/system-users-provider"
import { ApiError, meApi } from "@/lib/api"
import { removeAvatar, uploadAvatarFile } from "@/lib/avatar-upload"
import { getInitials } from "@/lib/panel-permissions"
import { PASSWORD_MIN_LENGTH } from "@/pages/change-password-page"

export function AccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user, setUser, changePassword } = useAuth()
  const { syncUser } = useSystemUsers()

  const [name, setName] = React.useState(user?.name ?? "")
  const [savingName, setSavingName] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [savingPassword, setSavingPassword] = React.useState(false)
  const [passwordError, setPasswordError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setName(user?.name ?? "")
      setCurrentPassword("")
      setNewPassword("")
      setPasswordError(null)
    }
  }, [open, user?.name])

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

  const applyAvatar = (updated: typeof user) => {
    if (!updated) {
      return
    }

    setUser(updated)
    syncUser(updated)
  }

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    setUploading(true)

    try {
      applyAvatar(await uploadAvatarFile(file))
      toast.success("Avatar updated")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not upload that image"
      )
    } finally {
      setUploading(false)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 rounded-xl">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-xl">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? "Uploading…" : "Change photo"}
              </Button>
              {user.avatar ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={uploading}
                  onClick={() =>
                    void removeAvatar()
                      .then(applyAvatar)
                      .catch(() => toast.error("Could not remove your photo"))
                  }
                >
                  Remove
                </Button>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void uploadAvatar(event)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-name">Name</Label>
            <div className="flex gap-2">
              <Input
                id="account-name"
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
              <p className="text-destructive text-sm" role="alert">
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
      </DialogContent>
    </Dialog>
  )
}
