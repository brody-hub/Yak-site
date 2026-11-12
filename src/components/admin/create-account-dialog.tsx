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
import { SLUG_PATTERN, adminApi, slugify, type AdminTenant } from "@/lib/admin"
import { ApiError } from "@/lib/api"

/**
 * Creates a customer account and its first owner in one step. The owner gets
 * an invite with a temporary password, shown here once to copy.
 */
export function CreateAccountDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (tenant: AdminTenant) => void
}) {
  const [name, setName] = React.useState("")
  const [slug, setSlug] = React.useState("")
  // Follow the name until someone edits the slug by hand.
  const [slugEdited, setSlugEdited] = React.useState(false)
  const [ownerName, setOwnerName] = React.useState("")
  const [ownerEmail, setOwnerEmail] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [credentials, setCredentials] =
    React.useState<TemporaryPasswordDetails | null>(null)

  const reset = () => {
    setName("")
    setSlug("")
    setSlugEdited(false)
    setOwnerName("")
    setOwnerEmail("")
    setError(null)
    setCredentials(null)
    setSubmitting(false)
  }

  const slugValid = SLUG_PATTERN.test(slug)
  const canSubmit =
    name.trim().length > 0 &&
    slugValid &&
    ownerName.trim().length > 0 &&
    ownerEmail.trim().length > 0

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const created = await adminApi.createTenant({
        name: name.trim(),
        slug,
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim(),
      })

      onCreated(created.tenant)

      if (created.inviteEmailSent) {
        toast.success(`Invite emailed to ${created.owner.email}`)
      }

      setCredentials({
        userName: created.owner.name,
        userEmail: created.owner.email,
        inviteEmailSent: created.inviteEmailSent,
        temporaryPassword: created.temporaryPassword,
      })
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not create that account."
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
            <DialogTitle>New account</DialogTitle>
            <DialogDescription>
              Creates a customer workspace and invites its first owner. The
              owner sets up everything else from their own panel.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="account-name">Account name</Label>
                <Input
                  id="account-name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    if (!slugEdited) {
                      setSlug(slugify(event.target.value))
                    }
                  }}
                  placeholder="Shredder"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-slug">Slug</Label>
                <Input
                  id="account-slug"
                  value={slug}
                  onChange={(event) => {
                    setSlugEdited(true)
                    setSlug(event.target.value.toLowerCase())
                  }}
                  placeholder="shredder"
                  aria-invalid={slug.length > 0 && !slugValid}
                  required
                />
              </div>
            </div>
            <p className="-mt-3 text-xs text-muted-foreground">
              Lowercase letters, numbers, and dashes, 2 to 40 characters. The
              slug cannot be changed later.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="account-owner-name">Owner name</Label>
                <Input
                  id="account-owner-name"
                  value={ownerName}
                  onChange={(event) => setOwnerName(event.target.value)}
                  placeholder="Jordan Lee"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-owner-email">Owner email</Label>
                <Input
                  id="account-owner-email"
                  type="email"
                  value={ownerEmail}
                  onChange={(event) => setOwnerEmail(event.target.value)}
                  placeholder="jordan@example.com"
                  required
                />
              </div>
            </div>

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
              <Button type="submit" disabled={submitting || !canSubmit}>
                {submitting ? "Creating…" : "Create account"}
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
