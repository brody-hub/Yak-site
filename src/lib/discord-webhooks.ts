export type DiscordTriggerId =
  | "new_user"
  | "new_support"
  | "new_subscription"
  | "ticket_status_change"

export type DiscordTriggerConfig = {
  enabled: boolean
  webhookUrl: string
}

export type DiscordWebhooksSettings = Record<
  DiscordTriggerId,
  DiscordTriggerConfig
>

export const DISCORD_TRIGGERS: {
  id: DiscordTriggerId
  label: string
  description: string
}[] = [
  {
    id: "new_user",
    label: "New user",
    description: "Fires when a new application user signs up.",
  },
  {
    id: "new_support",
    label: "New support",
    description: "Fires when a new support report is created.",
  },
  {
    id: "new_subscription",
    label: "New subscription",
    description: "Fires when a user starts a new subscription.",
  },
  {
    id: "ticket_status_change",
    label: "Ticket status change",
    description: "Fires when a task ticket changes status.",
  },
]

/**
 * Mirrors the server-side check so the field can be validated before the URL
 * is sent. The server validates again and is the authority.
 */
export function isValidDiscordWebhookUrl(url: string) {
  try {
    const parsed = new URL(url.trim())
    const host = parsed.hostname
    const isDiscordHost =
      host === "discord.com" ||
      host === "discordapp.com" ||
      host.endsWith(".discord.com")

    return (
      parsed.protocol === "https:" &&
      isDiscordHost &&
      parsed.pathname.startsWith("/api/webhooks/")
    )
  } catch {
    return false
  }
}