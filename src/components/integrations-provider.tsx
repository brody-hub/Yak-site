/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

import { ApiError, integrationsApi, type ServerIntegration } from "@/lib/api"
import type { IntegrationProviderId } from "@/lib/integrations"

/**
 * Connection state for the third party providers Stand reads metrics from.
 *
 * Loaded once per session and shared, because both the dashboard (to decide
 * which widgets can produce data) and the KPIs page (to decide between real
 * numbers and a connect prompt) depend on it. The API never returns a stored
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

export function IntegrationsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [status, setStatus] =
    React.useState<IntegrationsState["status"]>("loading")
  const [integrations, setIntegrations] = React.useState<ServerIntegration[]>([])
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    try {
      setIntegrations(await integrationsApi.list())
      setError(null)
      setStatus("ready")
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load integration status"
      )
      setStatus("error")
    }
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

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
