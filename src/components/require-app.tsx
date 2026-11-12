import * as React from "react"
import { Outlet } from "react-router-dom"
import { PlusIcon } from "lucide-react"

import { useApps } from "@/components/apps-provider"
import { useAuth } from "@/components/auth-provider"
import { CreateAppDialog } from "@/components/create-app-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Gate for pages that show one app's data. While the list loads it shows a
 * placeholder; with no active app it explains what to do. The outlet is keyed
 * on the app so switching remounts the page with fresh state instead of
 * showing the previous app's rows while the next ones load.
 */
export function RequireApp() {
  const { status, currentApp, error } = useApps()

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-4 px-4 py-6 lg:px-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <h2 className="text-lg font-semibold">Could not load your apps</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          {error ?? "Try reloading the page."}
        </p>
      </div>
    )
  }

  if (!currentApp) {
    return <NoAppYet />
  }

  return <Outlet key={currentApp.id} />
}

/** Shown on app-scoped pages until the workspace has an active app. */
export function NoAppYet() {
  const { canManageUsers } = useAuth()
  const [createOpen, setCreateOpen] = React.useState(false)

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h2 className="text-lg font-semibold">Add your first app</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        {canManageUsers
          ? "Users, reports, analytics and API keys belong to an app. Add one, then mint an API key for it under Integrations."
          : "This workspace has no app set up yet. Ask an owner or admin to add one."}
      </p>
      {canManageUsers ? (
        <>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            New app
          </Button>
          <CreateAppDialog open={createOpen} onOpenChange={setCreateOpen} />
        </>
      ) : null}
    </div>
  )
}
