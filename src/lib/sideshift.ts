/**
 * Sideshift campaign analytics, shown on the Marketing tab.
 *
 * Sideshift's API calls a campaign a "program"; the panel always says
 * "campaign". Every number comes from the server's synced copy, so the page
 * never waits on Sideshift itself.
 */

export type SideshiftConnectionStatus =
  | "disconnected"
  | "connected"
  | "needs_reconnect"
  | "subscription_inactive"

export type SideshiftCampaign = {
  id: string
  name: string
  status: string
  tracked: boolean
}

export type SideshiftStatus = {
  status: SideshiftConnectionStatus
  connected: boolean
  companyId: string | null
  companyName: string | null
  connectedAt: string | null
  lastSyncedAt: string | null
  syncing: boolean
  canRefresh: boolean
  lastError: string | null
  lastErrorAt: string | null
  /** Sideshift's id for the failed request. Owners and admins only. */
  lastErrorRequestId: string | null
  campaigns: SideshiftCampaign[]
}

export type SideshiftRange = "7d" | "30d" | "all"
export type SideshiftPostSort = "views" | "newest"

export type SideshiftCreatorRow = {
  key: string
  name: string
  handle: string | null
  avatarUrl: string | null
  platform: string
  posts: number
  views: number
  engagementRate: number | null
  averageViewsPerPost: number
}

export type SideshiftPost = {
  id: string
  title: string | null
  platform: string
  creatorName: string | null
  creatorHandle: string | null
  thumbnailUrl: string | null
  postUrl: string | null
  uploadedAt: string | null
  views: number
  likes: number
  comments: number
  shares: number
}

export type SideshiftAnalytics = {
  campaign: string
  range: SideshiftRange
  summary: {
    views: number
    engagement: number
    engagementRate: number | null
    posts: number
    creators: number
    /** `gained` inside the window, or `total` over each post's life. */
    basis: "gained" | "total"
  }
  daily: { date: string; views: number; engagement: number }[]
  creators: SideshiftCreatorRow[]
  posts: SideshiftPost[]
}

export const RANGE_OPTIONS: { value: SideshiftRange; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "all", label: "All time" },
]

export function describeRange(range: SideshiftRange) {
  return range === "7d"
    ? "the last 7 days"
    : range === "30d"
      ? "the last 30 days"
      : "all time"
}

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  snapchat: "Snapchat",
  x: "X",
  twitter: "X",
  linkedin: "LinkedIn",
}

export function platformLabel(platform: string) {
  return (
    PLATFORM_LABELS[platform.toLowerCase()] ??
    platform.charAt(0).toUpperCase() + platform.slice(1)
  )
}

/** 12,400 → "12.4K". Cards and tables have little room for raw view counts. */
export function formatCompact(value: number) {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatRate(value: number | null) {
  if (value === null) {
    return "—"
  }

  return `${(value * 100).toFixed(value * 100 >= 10 ? 0 : 1)}%`
}

export function formatRelative(value: string) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000)

  if (minutes < 1) {
    return "just now"
  }

  if (minutes < 60) {
    return `${minutes} min ago`
  }

  const hours = Math.round(minutes / 60)

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`
  }

  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}

/** What the Marketing tab says after Sideshift sends the founder back. */
export const CALLBACK_MESSAGES: Record<
  string,
  { tone: "success" | "error"; message: string }
> = {
  connected: {
    tone: "success",
    message: "Sideshift connected. Pulling in your campaigns now.",
  },
  denied: {
    tone: "error",
    message: "Sideshift access was not approved, so nothing was connected.",
  },
  expired: {
    tone: "error",
    message: "That connection link expired. Click Connect Sideshift to try again.",
  },
  invalid_state: {
    tone: "error",
    message: "That connection link is no longer valid. Click Connect Sideshift to try again.",
  },
  busy: {
    tone: "error",
    message: "A sync was running, so the connection was not saved. Try again in a minute.",
  },
  error: {
    tone: "error",
    message: "Sideshift could not complete the connection. Try again in a few minutes.",
  },
}
