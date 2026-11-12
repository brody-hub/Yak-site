import * as React from "react"
import { toast } from "sonner"

import {
  TemporaryPasswordDialog,
  type TemporaryPasswordDetails,
} from "@/components/temporary-password-dialog"
import { Button } from "@/components/ui/button"
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
import type { IssuedCredentials } from "@/lib/admin"
import { ApiError } from "@/lib/api"

/**
 * Members only see the sections someone ticks for them, which is the
 * account's own owners' call, so the console hands out owner and admin only.
 */
export type InviteRole = "owner" | "admin"

const ROLE_OPTIONS: { id: InviteRole; label: string; description: string }[] = [
  {
    id: "owner",
    label: "Owner",
    description: "Full access, and can manage every user in the account.",
  },
  {
    id: "admin",
    label: "Admin",
    description: "Full section access and can invite members.",
  },
]

/**
 * Invites one person by name and email, then shows the temporary password.
 * Used for adding people to a customer account (with a role) and for inviting
 * super admins (without one).
 */
export function InvitePersonDialog({
  open,
  onOpenChange,
  title,
  description,
  withRole = false,
  onInvite,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  withRole?: boolean
  onInvite: (input: {
    name: string
    email: string
    role: InviteRole
  }) => Promise<IssuedCredentials & { user: { name: string; email: string } }>
}) {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState<InviteRole>("owner")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [credentials, setCredentials] =
    React.useState<TemporaryPasswordDetails | null>(null)

  const reset = () => {
    setName("")
    setEmail("")
    setRole("owner")
    setError(null)
    setCredentials(null)
    setSubmitting(false)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const result = await onInvite({
        name: name.trim(),
        email: email.trim(),
        role,
      })

      if (result.inviteEmailSent) {
        toast.success(`Invite emailed to ${result.user.email}`)
      }

      setCredentials({
        userName: result.user.name,
        userEmail: result.user.email,
        inviteEmailSent: result.inviteEmailSent,
        temporaryPassword: result.temporaryPassword,
      })
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not send that invite."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog
        open={open && !credentials}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            reset()
          }
          onOpenChange(nextOpen)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invite-person-name">Name</Label>
                <Input
                  id="invite-person-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Jordan Lee"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-person-email">Email</Label>
                <Input
                  id="invite-person-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="jordan@example.com"
                  required
                />
              </div>
            </div>

            {withRole ? (
              <div className="space-y-2">
                <Label htmlFor="invite-person-role">Role</Label>
                <Select
                  value={role}
                  onValueChange={(value) => setRole(value as InviteRole)}
                >
                  <SelectTrigger id="invite-person-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {
                    ROLE_OPTIONS.find((option) => option.id === role)
                      ?.description
                  }
                </p>
              </div>
            ) : null}

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset()
                  onOpenChange(false)
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !name.trim() || !email.trim()}
              >
                {submitting ? "Sending…" : "Send invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <TemporaryPasswordDialog
        open={open && Boolean(credentials)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            reset()
            onOpenChange(false)
          }
        }}
        details={credentials}
      />
    </>
  )
}
