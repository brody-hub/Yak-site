/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

import {
  DEFAULT_KPI_CONNECTIONS,
  isConnected,
  KPI_CONNECTIONS_STORAGE_KEY,
  type KpiConnection,
  type KpiConnections,
  type KpiProviderId,
} from "@/lib/kpis"

type KpisProviderProps = {
  children: React.ReactNode
}

type KpisProviderState = {
  connections: KpiConnections
  revenueCatConnected: boolean
  anyConnected: boolean
  connectProvider: (provider: KpiProviderId, apiKey: string) => void
  disconnectProvider: (provider: KpiProviderId) => void
  updateApiKeyDraft: (provider: KpiProviderId, apiKey: string) => void
}

const KpisContext = React.createContext<KpisProviderState | undefined>(
  undefined
)

function loadConnections(): KpiConnections {
  try {
    const raw = localStorage.getItem(KPI_CONNECTIONS_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_KPI_CONNECTIONS
    }

    const parsed = JSON.parse(raw) as Partial<KpiConnections>
    return {
      revenuecat: {
        ...DEFAULT_KPI_CONNECTIONS.revenuecat,
        ...parsed.revenuecat,
      },
      superwall: {
        ...DEFAULT_KPI_CONNECTIONS.superwall,
        ...parsed.superwall,
      },
    }
  } catch {
    return DEFAULT_KPI_CONNECTIONS
  }
}

export function KpisProvider({ children }: KpisProviderProps) {
  const [connections, setConnections] =
    React.useState<KpiConnections>(loadConnections)

  React.useEffect(() => {
    localStorage.setItem(
      KPI_CONNECTIONS_STORAGE_KEY,
      JSON.stringify(connections)
    )
  }, [connections])

  const connectProvider = React.useCallback(
    (provider: KpiProviderId, apiKey: string) => {
      const trimmed = apiKey.trim()
      if (!trimmed) {
        return
      }

      setConnections((current) => ({
        ...current,
        [provider]: {
          provider,
          apiKey: trimmed,
          connectedAt: new Date().toISOString(),
        } satisfies KpiConnection,
      }))
    },
    []
  )

  const disconnectProvider = React.useCallback((provider: KpiProviderId) => {
    setConnections((current) => ({
      ...current,
      [provider]: {
        provider,
        apiKey: "",
        connectedAt: null,
      },
    }))
  }, [])

  const updateApiKeyDraft = React.useCallback(
    (provider: KpiProviderId, apiKey: string) => {
      setConnections((current) => ({
        ...current,
        [provider]: {
          ...current[provider],
          apiKey,
        },
      }))
    },
    []
  )

  const revenueCatConnected = isConnected(connections.revenuecat)
  const anyConnected =
    revenueCatConnected || isConnected(connections.superwall)

  const value = React.useMemo(
    () => ({
      connections,
      revenueCatConnected,
      anyConnected,
      connectProvider,
      disconnectProvider,
      updateApiKeyDraft,
    }),
    [
      connections,
      revenueCatConnected,
      anyConnected,
      connectProvider,
      disconnectProvider,
      updateApiKeyDraft,
    ]
  )

  return (
    <KpisContext.Provider value={value}>{children}</KpisContext.Provider>
  )
}

export function useKpis() {
  const context = React.useContext(KpisContext)

  if (context === undefined) {
    throw new Error("useKpis must be used within a KpisProvider")
  }

  return context
}
