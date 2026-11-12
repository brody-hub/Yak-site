/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

import { useAuth } from "@/components/auth-provider"
import { ApiError, appsApi, type App } from "@/lib/api"

/**
 * The workspace's apps and which one the panel is looking at.
 *
 * Reports, users, analytics, KPIs, API keys and RevenueCat all belong to one
 * app, so those pages read `currentApp` and ask the API for that app only.
 * The choice is remembered per workspace in localStorage so a reload, or a
 * second browser tab, lands on the same app.
 */

type AppsState = {
  status: "loading" | "ready" | "error"
  apps: App[]
  /** Apps that still accept data. Archived ones are kept for history only. */
  activeApps: App[]
  /** Null while loading, or when the workspace has no active app yet. */
  currentApp: App | null
  setCurrentApp: (appId: string) => void
  refresh: () => Promise<void>
  /** Adds a freshly created app and switches to it. */
  adopt: (app: App) => void
  error: string | null
}

const AppsContext = React.createContext<AppsState | undefined>(undefined)

/** Never throws: a failure is a state the panel shows, not an exception. */
async function fetchApps(): Promise<
  { ok: true; apps: App[] } | { ok: false; error: string }
> {
  try {
    return { ok: true, apps: await appsApi.list() }
  } catch (caught) {
    return {
      ok: false,
      error:
        caught instanceof ApiError ? caught.message : "Could not load your apps",
    }
  }
}

function storageKey(tenantId: string) {
  return `yak:current-app:${tenantId}`
}

function readStoredAppId(tenantId: string) {
  try {
    return localStorage.getItem(storageKey(tenantId))
  } catch {
    return null
  }
}

function writeStoredAppId(tenantId: string, appId: string | null) {
  try {
    if (appId) {
      localStorage.setItem(storageKey(tenantId), appId)
    } else {
      localStorage.removeItem(storageKey(tenantId))
    }
  } catch {
    // Private mode or a full store: the choice just does not persist.
  }
}

export function AppsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const tenantId = user?.tenant?.id ?? null

  const [status, setStatus] = React.useState<AppsState["status"]>("loading")
  const [apps, setApps] = React.useState<App[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [selectedId, setSelectedId] = React.useState<string | null>(() =>
    tenantId ? readStoredAppId(tenantId) : null
  )

  const apply = React.useCallback((result: Awaited<ReturnType<typeof fetchApps>>) => {
    if (result.ok) {
      setApps(result.apps)
      setError(null)
      setStatus("ready")
    } else {
      setError(result.error)
      setStatus("error")
    }
  }, [])

  // Loaded once per sign-in; state is only written from the resolved promise.
  React.useEffect(() => {
    let cancelled = false

    fetchApps().then((result) => {
      if (!cancelled) {
        apply(result)
      }
    })

    return () => {
      cancelled = true
    }
  }, [apply])

  const refresh = React.useCallback(async () => {
    apply(await fetchApps())
  }, [apply])

  const activeApps = React.useMemo(
    () => apps.filter((app) => app.status === "active"),
    [apps]
  )

  // The stored choice wins while it still names an active app; otherwise the
  // first active app. Derived, so an archive or deletion elsewhere falls back
  // without a stale selection lingering in state.
  const currentApp = React.useMemo(
    () =>
      activeApps.find((app) => app.id === selectedId) ?? activeApps[0] ?? null,
    [activeApps, selectedId]
  )

  const setCurrentApp = React.useCallback(
    (appId: string) => {
      setSelectedId(appId)
      if (tenantId) {
        writeStoredAppId(tenantId, appId)
      }
    },
    [tenantId]
  )

  const adopt = React.useCallback(
    (app: App) => {
      setApps((current) => [...current.filter((item) => item.id !== app.id), app])
      setCurrentApp(app.id)
    },
    [setCurrentApp]
  )

  const value = React.useMemo<AppsState>(
    () => ({
      status,
      apps,
      activeApps,
      currentApp,
      setCurrentApp,
      refresh,
      adopt,
      error,
    }),
    [status, apps, activeApps, currentApp, setCurrentApp, refresh, adopt, error]
  )

  return <AppsContext.Provider value={value}>{children}</AppsContext.Provider>
}

export function useApps() {
  const context = React.useContext(AppsContext)

  if (context === undefined) {
    throw new Error("useApps must be used within an AppsProvider")
  }

  return context
}

/**
 * The app the page is showing. Only valid under RequireApp, which guarantees
 * one exists; elsewhere use `useApps().currentApp` and handle null.
 */
export function useCurrentApp(): App {
  const { currentApp } = useApps()

  if (!currentApp) {
    throw new Error("useCurrentApp requires an active app; wrap the route in RequireApp")
  }

  return currentApp
}
