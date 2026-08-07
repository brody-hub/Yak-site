/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

import { discordApi, type ServerDiscordTrigger } from "@/lib/api"
import type { DiscordTriggerId } from "@/lib/discord-webhooks"

type DiscordWebhooksProviderProps = {
  children: React.ReactNode
}

type DiscordWebhooksProviderState = {
  triggers: ServerDiscordTrigger[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  getTrigger: (triggerId: DiscordTriggerId) => ServerDiscordTrigger | undefined
  updateTrigger: (
    triggerId: DiscordTriggerId,
    patch: { enabled?: boolean; webhookUrl?: string | null }
  ) => Promise<void>
  /** Posts a sample message so the user can confirm the URL works. */
  testTrigger: (
    triggerId: DiscordTriggerId,
    webhookUrl?: string
  ) => Promise<void>
}

const DiscordWebhooksContext = React.createContext<
  DiscordWebhooksProviderState | undefined
>(undefined)

/**
 * Webhook URLs are stored encrypted on the server and never sent back to the
 * browser, so this provider works with a redacted hint plus a "configured"
 * flag rather than the URL itself.
 */
export function DiscordWebhooksProvider({
  children,
}: DiscordWebhooksProviderProps) {
  const [triggers, setTriggers] = React.useState<ServerDiscordTrigger[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    try {
      setTriggers(await discordApi.list())
      setError(null)
    } catch {
      setError("Could not load Discord settings.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const getTrigger = React.useCallback(
    (triggerId: DiscordTriggerId) =>
      triggers.find((trigger) => trigger.trigger === triggerId),
    [triggers]
  )

  const updateTrigger = React.useCallback(
    async (
      triggerId: DiscordTriggerId,
      patch: { enabled?: boolean; webhookUrl?: string | null }
    ) => {
      const updated = await discordApi.update(triggerId, patch)

      setTriggers((current) => {
        const exists = current.some((item) => item.trigger === triggerId)

        return exists
          ? current.map((item) =>
              item.trigger === triggerId ? updated : item
            )
          : [...current, updated]
      })
    },
    []
  )

  const testTrigger = React.useCallback(
    async (triggerId: DiscordTriggerId, webhookUrl?: string) => {
      await discordApi.test(triggerId, webhookUrl)
    },
    []
  )

  const value = React.useMemo(
    () => ({
      triggers,
      loading,
      error,
      refresh,
      getTrigger,
      updateTrigger,
      testTrigger,
    }),
    [triggers, loading, error, refresh, getTrigger, updateTrigger, testTrigger]
  )

  return (
    <DiscordWebhooksContext.Provider value={value}>
      {children}
    </DiscordWebhooksContext.Provider>
  )
}

export function useDiscordWebhooks() {
  const context = React.useContext(DiscordWebhooksContext)

  if (context === undefined) {
    throw new Error(
      "useDiscordWebhooks must be used within a DiscordWebhooksProvider"
    )
  }

  return context
}
