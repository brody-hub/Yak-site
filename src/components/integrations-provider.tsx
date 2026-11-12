/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

import { useApps } from "@/components/apps-provider"
import { ApiError, integrationsApi, type ServerIntegration } from "@/lib/api"
import type { IntegrationProviderId } from "@/lib/integrations"

/**
 * Connection state for the third party providers Stand reads metrics from.
 *
 * RevenueCat is connected per app, so the list follows the current app and is
 * reloaded when it changes. Shared because both the dashboard (to decide which
 * widgets can produce data) and the KPIs page (to decide between real numbers
 * and a connect prompt) depend on it. The API never returns a stored
 * credential, so nothing sensitive lives in this context.
 */

type IntegrationsState = {
  status: "loading" | "ready" | "error"
  integrations: ServerIntegration[]
  connected: IntegrationProviderId[]
  isConnected: (provider: IntegrationProviderId) => boolean
  get: (provider: IntegrationProviderId) => ServerIntegration | undefined
  error: string | null
  refresh: () => Promise<void>
}

const IntegrationsContext = React.createContext<IntegrationsState | undefined>(
  undefined
)

type Loaded = {
  appId: string | null
  status: "ready" | "error"
  integrations: ServerIntegration[]
  error: string | null
}

/** Shared empty list so "nothing loaded" keeps one identity across renders. */
const NONE: ServerIntegration[] = []

/** Never throws: a failure is a state the panel shows, not an exception. */
async function fetchIntegrations(appId: string): Promise<Loaded> {
  try {
    const integrations = await integrationsApi.list(appId)
    return { appId, status: "ready", integrations, error: null }
  } catch (err) {
    return {
      appId,
      status: "error",
      integrations: NONE,
      error:
        err instanceof ApiError
          ? err.message
          : "Could not load integration status",
    }
  }
}

export function IntegrationsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { status: appsStatus, currentApp } = useApps()
  const appId = currentApp?.id ?? null

  const [loaded, setLoaded] = React.useState<Loaded | null>(null)

  // Fetched on mount and whenever the app changes. State is only written from
  // the resolved promise, and a result for an app that is no longer current is
  // dropped on arrival rather than shown briefly.
  React.useEffect(() => {
    if (!appId) {
      return
    }

    let cancelled = false

    fetchIntegrations(appId).then((result) => {
      if (!cancelled) {
        setLoaded(result)
      }
    })

    return () => {
      cancelled = true
    }
  }, [appId])

  const refresh = React.useCallback(async () => {
    if (appId) {
      setLoaded(await fetchIntegrations(appId))
    }
  }, [appId])

  // A result for a different app is stale; report loading until the right one
  // arrives. With no app at all there is nothing to connect, so it is "ready"
  // with nothing connected.
  const current: Loaded | null =
    appsStatus === "loading"
      ? null
      : !appId
        ? { appId: null, status: "ready", integrations: NONE, error: null }
        : loaded && loaded.appId === appId
          ? loaded
          : null

  const status = current?.status ?? "loading"
  const integrations = current?.integrations ?? NONE
  const error = current?.error ?? null

  const connected = React.useMemo(
    () =>
      integrations
        .filter((integration) => integration.connected)
        .map((integration) => integration.provider),
    [integrations]
  )

  const value = React.useMemo<IntegrationsState>(
    () => ({
      status,
      integrations,
      connected,
      isConnected: (provider) => connected.includes(provider),
      get: (provider) =>
        integrations.find((integration) => integration.provider === provider),
      error,
      refresh,
    }),
    [status, integrations, connected, error, refresh]
  )

  return (
    <IntegrationsContext.Provider value={value}>
      {children}
    </IntegrationsContext.Provider>
  )
}

export function useIntegrations() {
  const context = React.useContext(IntegrationsContext)

  if (context === undefined) {
    throw new Error("useIntegrations must be used within an IntegrationsProvider")
  }

  return context
}
