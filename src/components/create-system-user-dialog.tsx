import * as React from "react"
import { toast } from "sonner"

import { TemporaryPasswordDialog } from "@/components/temporary-password-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ApiError, type InviteResult, type UserRole } from "@/lib/api"
import {
  PANEL_PERMISSIONS,
  type PanelPermissionId,
} from "@/lib/panel-permissions"

type CreateSystemUserDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (input: {
    name: string
    email: string
    role: UserRole
    permissions: PanelPermissionId[]
  }) => Promise<InviteResult>
  /** Only an owner may hand out the admin role. */
  canGrantAdmin: boolean
}

const permissionGroups = ["Main", "Support", "Settings"] as const

const ROLE_OPTIONS: { id: UserRole; label: string; description: string }[] = [
  {
    id: "member",
    label: "Member",
    description: "Sees only the sections you tick below.",
  },
  {
    id: "admin",
    label: "Admin",
    description: "Full access to every section and can invite members.",
  },
]

export function CreateSystemUserDialog({
  open,
  onOpenChange,
  onCreate,
  canGrantAdmin,
}: CreateSystemUserDialogProps) {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState<UserRole>("member")
  const [permissions, setPermissions] = React.useState<PanelPermissionId[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<InviteResult | null>(null)

  const reset = () => {
    setName("")
    setEmail("")
    setRole("member")
    setPermissions([])
    setError(null)
    setResult(null)
    setSubmitting(false)
  }

  const togglePermission = (id: PanelPermissionId, checked: boolean) => {
    setPermissions((current) =>
      checked ? [...current, id] : current.filter((item) => item !== id)
    )
  }

  // Admins get everything implicitly, so the checkboxes only matter for
  // members.
  const needsPermissions = role === "member"
  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    (!needsPermissions || permissions.length > 0)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const invite = await onCreate({
        name: name.trim(),
        email: email.trim(),
        role,
        permissions: needsPermissions ? permissions : [],
      })

      if (invite.inviteEmailSent) {
        toast.success(`Invite emailed to ${invite.user.email}`)
      }

      // Always show the temp password so the admin can copy and send it too.
      setResult(invite)
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not create that user."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog
        open={open && !result}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            reset()
          }
          onOpenChange(nextOpen)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite panel user</DialogTitle>
            <DialogDescription>
              Creates an invite-only account. You&apos;ll get a temporary
              password to share; they must choose a new one on first sign in.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="system-user-name">Name</Label>
                <Input
                  id="system-user-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Jordan Lee"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="system-user-email">Email</Label>
                <Input
                  id="system-user-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="jordan@stand.app"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="system-user-role">Role</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
              >
                <SelectTrigger id="system-user-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.filter(
                    (option) => option.id !== "admin" || canGrantAdmin
                  ).map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                {ROLE_OPTIONS.find((option) => option.id === role)?.description}
              </p>
            </div>

            {needsPermissions && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>Permissions</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setPermissions(
                        permissions.length === PANEL_PERMISSIONS.length
                          ? []
                          : PANEL_PERMISSIONS.map(
                              (permission) => permission.id
                            )
                      )
                    }
                  >
                    {permissions.length === PANEL_PERMISSIONS.length
                      ? "Clear all"
                      : "Select all"}
                  </Button>
                </div>

                <div className="space-y-4 rounded-xl border p-4">
                  {permissionGroups.map((group) => {
                    const groupPermissions = PANEL_PERMISSIONS.filter(
                      (permission) => permission.group === group
                    )

                    return (
                      <div key={group} className="space-y-2">
                        <p className="text-muted-foreground text-xs font-medium">
                          {group}
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {groupPermissions.map((permission) => (
                            <label
                              key={permission.id}
                              htmlFor={`permission-${permission.id}`}
                              className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                            >
                              <Checkbox
                                id={`permission-${permission.id}`}
                                checked={permissions.includes(permission.id)}
                                onCheckedChange={(value) =>
                                  togglePermission(
                                    permission.id,
                                    value === true
                                  )
                                }
                              />
                              <span>{permission.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit || submitting}>
                {submitting ? "Sending…" : "Send invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <TemporaryPasswordDialog
        open={Boolean(result)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            reset()
            onOpenChange(false)
          }
        }}
        details={
          result?.temporaryPassword
            ? {
                userName: result.user.name,
                userEmail: result.user.email,
                inviteEmailSent: result.inviteEmailSent,
                temporaryPassword: result.temporaryPassword,
              }
            : null
        }
      />
    </>
  )
}
