import * as React from "react"
import { toast } from "sonner"

import { useApps } from "@/components/apps-provider"
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
import { slugify, SLUG_PATTERN } from "@/lib/admin"
import { ApiError, appsApi, type App } from "@/lib/api"

/**
 * Adds an app to the workspace and makes it the current one, so the next
 * stop is usually Integrations to mint its first API key.
 */
export function CreateAppDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (app: App) => void
}) {
  const { adopt } = useApps()
  const [name, setName] = React.useState("")
  const [slug, setSlug] = React.useState("")
  // Follow the name until someone edits the slug by hand.
  const [slugEdited, setSlugEdited] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const reset = () => {
    setName("")
    setSlug("")
    setSlugEdited(false)
    setError(null)
    setSubmitting(false)
  }

  const slugValid = SLUG_PATTERN.test(slug)
  const canSubmit = name.trim().length > 0 && slugValid

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const created = await appsApi.create({ name: name.trim(), slug })
      adopt(created)
      onCreated?.(created)
      toast.success(`${created.name} added`)
      reset()
      onOpenChange(false)
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Could not add that app."
      )
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          reset()
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New app</DialogTitle>
          <DialogDescription>
            Each app gets its own API keys, users, reports and analytics.
            Billing adds active users across every app in the workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="app-name">App name</Label>
            <Input
              id="app-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                if (!slugEdited) {
                  setSlug(slugify(event.target.value))
                }
              }}
              placeholder="Shredder iOS"
              autoFocus
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="app-slug">Slug</Label>
            <Input
              id="app-slug"
              value={slug}
              onChange={(event) => {
                setSlugEdited(true)
                setSlug(event.target.value.toLowerCase())
              }}
              placeholder="shredder-ios"
              aria-invalid={slug.length > 0 && !slugValid}
              required
            />
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, and dashes, 2 to 40 characters.
            </p>
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
              {submitting ? "Adding…" : "Add app"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
