import * as React from "react"
import { Link } from "react-router-dom"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { useApps } from "@/components/apps-provider"
import { CreateAppDialog } from "@/components/create-app-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatAdminDate } from "@/lib/admin"
import { ApiError, appsApi, type App } from "@/lib/api"

function errorMessage(caught: unknown, fallback: string) {
  return caught instanceof ApiError ? caught.message : fallback
}

/**
 * The workspace's apps. Owners and admins add, rename, archive and restore
 * them here; the sidebar switcher picks which one the data pages show.
 * Archiving stops an app's API keys and hides it from the switcher without
 * deleting anything, which is why there is no delete here.
 */
export function AppsPage() {
  const { status, apps, currentApp, setCurrentApp, refresh, error } = useApps()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [renaming, setRenaming] = React.useState<App | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const run = async (app: App, action: () => Promise<App>, success: string) => {
    setBusyId(app.id)

    try {
      await action()
      await refresh()
      toast.success(success)
    } catch (caught) {
      toast.error(errorMessage(caught, "That action failed"))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle>Apps</CardTitle>
              <CardDescription>
                Each app has its own API keys, users, reports and analytics.
                Your plan counts active users across all of them. Mint keys for
                an app under{" "}
                <Link
                  to="/settings/integrations"
                  className="text-foreground underline underline-offset-4"
                >
                  Integrations
                </Link>
                .
              </CardDescription>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              New app
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {status === "loading" ? (
                    Array.from({ length: 2 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={5}>
                          <Skeleton className="h-8" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : status === "error" ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-8 text-center text-destructive"
                      >
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : apps.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No apps yet. Add the first one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    apps.map((app) => {
                      const archived = app.status === "archived"
                      const isCurrent = app.id === currentApp?.id
                      const busy = busyId === app.id

                      return (
                        <TableRow key={app.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{app.name}</span>
                              {isCurrent ? (
                                <Badge variant="secondary">Current</Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {app.slug}
                          </TableCell>
                          <TableCell>
                            {archived ? (
                              <Badge variant="outline">Archived</Badge>
                            ) : (
                              <Badge variant="outline">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatAdminDate(app.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {!archived && !isCurrent ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCurrentApp(app.id)}
                                >
                                  Switch to
                                </Button>
                              ) : null}
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                onClick={() => setRenaming(app)}
                              >
                                Rename
                              </Button>
                              {archived ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={busy}
                                  onClick={() =>
                                    void run(
                                      app,
                                      () => appsApi.restore(app.id),
                                      `${app.name} restored`
                                    )
                                  }
                                >
                                  Restore
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={busy}
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Archive ${app.name}? Its API keys stop accepting data and it leaves the app switcher. Nothing is deleted, and you can restore it later.`
                                      )
                                    ) {
                                      void run(
                                        app,
                                        () => appsApi.archive(app.id),
                                        `${app.name} archived`
                                      )
                                    }
                                  }}
                                >
                                  Archive
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateAppDialog open={createOpen} onOpenChange={setCreateOpen} />

      <RenameAppDialog
        app={renaming}
        onOpenChange={(open) => {
          if (!open) {
            setRenaming(null)
          }
        }}
        onRenamed={() => void refresh()}
      />
    </div>
  )
}

function RenameAppDialog({
  app,
  onOpenChange,
  onRenamed,
}: {
  app: App | null
  onOpenChange: (open: boolean) => void
  onRenamed: () => void
}) {
  const [name, setName] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  // Tracks which app the field was filled for, so a new app resets it
  // without an effect.
  const [filledFor, setFilledFor] = React.useState<string | null>(null)

  if (app && filledFor !== app.id) {
    setFilledFor(app.id)
    setName(app.name)
  }

  const trimmed = name.trim()
  const canSave = Boolean(app) && trimmed.length > 0 && trimmed !== app?.name

  const save = async () => {
    if (!app || !canSave) {
      return
    }

    setSaving(true)

    try {
      await appsApi.rename(app.id, trimmed)
      toast.success("App renamed")
      onRenamed()
      onOpenChange(false)
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not rename that app"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={Boolean(app)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename {app?.name}</DialogTitle>
          <DialogDescription>
            The slug stays <span className="font-mono">{app?.slug}</span>.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="rename-app">Name</Label>
            <Input
              id="rename-app"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !canSave}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
