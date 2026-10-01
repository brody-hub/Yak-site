import type {
  ActivityAction,
  PanelPermissionId,
} from "@/lib/panel-permissions"
import type {
  ReportPriority,
  ReportStatus,
  ReportType,
  SupportReport,
} from "@/lib/reports"
import type {
  Sprint,
  SprintDurationWeeks,
  Ticket,
  TicketHistoryEntry,
  TicketPriority,
  TicketStatus,
} from "@/lib/tasks"
import type { AnalyticsEvent, DailyEventPoint, EventNameStat } from "@/lib/analytics"
import type { AppUser } from "@/lib/app-users"
import type { DashboardWidget } from "@/lib/dashboard"
import type { DiscordTriggerId } from "@/lib/discord-webhooks"
import type { IntegrationProviderId } from "@/lib/integrations"
import type { KpiChartName, KpiOverview, KpiTrend } from "@/lib/kpis"

export const API_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:8080"
).replace(/\/+$/, "")

/* -------------------------------------------------------------------------- */
/* Core client                                                                 */
/* -------------------------------------------------------------------------- */

export type ApiErrorDetail = { field: string; message: string }

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: ApiErrorDetail[]

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ApiErrorDetail[]
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details
  }

  get isUnauthorized() {
    return this.status === 401
  }

  get isForbidden() {
    return this.status === 403
  }
}

type Envelope<T> = { data: T; meta?: Record<string, unknown> }

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
  signal?: AbortSignal
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(`${API_URL}${path}`)

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}

/**
 * Single entry point for every call to the backend.
 *
 * `credentials: "include"` is required because the session lives in a
 * cross-site cookie: the panel and the API are served from different hosts.
 */
export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<Envelope<T>> {
  let response: Response

  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      credentials: "include",
      headers: options.body
        ? { "Content-Type": "application/json" }
        : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      ...(options.signal ? { signal: options.signal } : {}),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error
    }

    throw new ApiError(
      0,
      "network_error",
      "Could not reach the server. Check your connection and try again."
    )
  }

  if (response.status === 204) {
    return { data: undefined as T }
  }

  const payload = (await response.json().catch(() => null)) as
    | Envelope<T>
    | { error: { code: string; message: string; details?: ApiErrorDetail[] } }
    | null

  if (!response.ok) {
    const error =
      payload && "error" in payload
        ? payload.error
        : { code: "unknown_error", message: response.statusText }

    throw new ApiError(
      response.status,
      error.code,
      error.message,
      "details" in error ? error.details : undefined
    )
  }

  if (!payload || "error" in payload) {
    throw new ApiError(response.status, "unknown_error", "Malformed response")
  }

  return payload
}

/** Convenience wrapper for the common case of only needing `data`. */
async function get<T>(path: string, query?: RequestOptions["query"]) {
  return (await request<T>(path, { query })).data
}

/**
 * Paginated endpoints return the page alongside a `pagination` block instead of
 * the plain `{ data }` envelope, so callers get both without a cast.
 */
async function getPage<T>(path: string, query?: RequestOptions["query"]) {
  const response = (await request<T[]>(path, { query })) as unknown as
    Paginated<T>

  return response
}

/* -------------------------------------------------------------------------- */
/* Shared server types                                                         */
/* -------------------------------------------------------------------------- */

export type UserRole = "owner" | "admin" | "member"

export type ServerSystemUser = {
  id: string
  name: string
  email: string
  avatar: string
  role: UserRole
  permissions: PanelPermissionId[]
  effectivePermissions: PanelPermissionId[]
  status: "active" | "deactivated"
  pendingInvite: boolean
  lastLoginAt: string | null
  createdAt: string
}

export type CurrentUser = ServerSystemUser & { mustChangePassword: boolean }

export type ServerActivityEntry = {
  id: string
  userId: string
  userName: string | null
  userEmail: string | null
  action: ActivityAction | "deleted" | "invited"
  section: string
  summary: string
  createdAt: string
}

export type Paginated<T> = {
  data: T[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

/* -------------------------------------------------------------------------- */
/* Public config                                                               */
/* -------------------------------------------------------------------------- */

export type AppConfig = {
  tenantName: string
  tenantSlug: string
  signUpEnabled: boolean
  passwordMinLength: number
  branding: {
    brandName: string
    logoUrl: string | null
    primaryColor: string
    defaultTheme: string
  }
}

let configPromise: Promise<AppConfig> | null = null

/**
 * Branding and tenant metadata, readable without a session so the login screen
 * can render it. Memoized because several providers need it during boot.
 */
export function fetchAppConfig(): Promise<AppConfig> {
  configPromise ??= get<AppConfig>("/api/config").catch((error: unknown) => {
    // Let the next caller retry rather than caching a transient failure.
    configPromise = null
    throw error
  })

  return configPromise
}

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export const authApi = {
  async signIn(email: string, password: string) {
    const response = await fetch(`${API_URL}/api/auth/sign-in/email`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        message?: string
        code?: string
      } | null

      throw new ApiError(
        response.status,
        payload?.code ?? "invalid_credentials",
        // Better Auth returns the same failure for an unknown email and a wrong
        // password, which is what we want to surface.
        payload?.message ?? "That email and password combination is not valid"
      )
    }
  },

  async signOut() {
    await fetch(`${API_URL}/api/auth/sign-out`, {
      method: "POST",
      credentials: "include",
    })
  },

  async requestPasswordReset(email: string) {
    await fetch(`${API_URL}/api/auth/request-password-reset`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, redirectTo: `${window.location.origin}/reset-password` }),
    })
  },

  async resetPassword(token: string, newPassword: string) {
    const response = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        message?: string
      } | null

      throw new ApiError(
        response.status,
        "reset_failed",
        payload?.message ?? "That reset link is invalid or has expired"
      )
    }
  },
}

/* -------------------------------------------------------------------------- */
/* Account                                                                     */
/* -------------------------------------------------------------------------- */

export const meApi = {
  get: () => get<CurrentUser>("/api/me"),
  updateName: async (name: string) =>
    (await request<CurrentUser>("/api/me", { method: "PATCH", body: { name } }))
      .data,
  changePassword: async (currentPassword: string, newPassword: string) =>
    (
      await request<CurrentUser>("/api/me/password", {
        method: "POST",
        body: { currentPassword, newPassword },
      })
    ).data,
  setAvatar: async (body: {
    imageId?: string | null
    dataUrl?: string | null
  }) =>
    (
      await request<CurrentUser>("/api/me/avatar", {
        method: "PUT",
        body,
      })
    ).data,
  activity: () => get<ServerActivityEntry[]>("/api/me/activity"),
}

/* -------------------------------------------------------------------------- */
/* Panel users                                                                 */
/* -------------------------------------------------------------------------- */

export type InviteResult = {
  user: ServerSystemUser
  inviteEmailSent: boolean
  temporaryPassword?: string
}

export const systemUsersApi = {
  list: () => get<ServerSystemUser[]>("/api/system-users"),
  meta: () =>
    get<{
      roles: { id: UserRole; label: string; description: string }[]
      permissions: PanelPermissionId[]
    }>("/api/system-users/meta"),

  async invite(input: {
    name: string
    email: string
    role: UserRole
    permissions: PanelPermissionId[]
  }): Promise<InviteResult> {
    const response = await request<ServerSystemUser>("/api/system-users", {
      method: "POST",
      body: input,
    })

    return {
      user: response.data,
      inviteEmailSent: Boolean(response.meta?.inviteEmailSent),
      temporaryPassword: response.meta?.temporaryPassword as string | undefined,
    }
  },

  update: async (
    id: string,
    patch: { name?: string; role?: UserRole; permissions?: PanelPermissionId[] }
  ) =>
    (
      await request<ServerSystemUser>(`/api/system-users/${id}`, {
        method: "PATCH",
        body: patch,
      })
    ).data,

  deactivate: async (id: string, reason?: string) =>
    (
      await request<ServerSystemUser>(`/api/system-users/${id}/deactivate`, {
        method: "POST",
        body: reason ? { reason } : {},
      })
    ).data,

  reactivate: async (id: string) =>
    (
      await request<ServerSystemUser>(`/api/system-users/${id}/reactivate`, {
        method: "POST",
      })
    ).data,

  async resendInvite(id: string) {
    const response = await request<{ ok: true }>(
      `/api/system-users/${id}/resend-invite`,
      { method: "POST" }
    )

    return {
      inviteEmailSent: Boolean(response.meta?.inviteEmailSent),
      temporaryPassword: response.meta?.temporaryPassword as string | undefined,
    }
  },

  remove: (id: string) =>
    request<{ ok: true }>(`/api/system-users/${id}`, { method: "DELETE" }),
}

export const activityApi = {
  list: (params?: { userId?: string; limit?: number; offset?: number }) =>
    getPage<ServerActivityEntry>("/api/activity", {
      userId: params?.userId,
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
    }),
}

/* -------------------------------------------------------------------------- */
/* Tasks                                                                       */
/* -------------------------------------------------------------------------- */

export const tasksApi = {
  sprints: () => get<Sprint[]>("/api/tasks/sprints"),
  tickets: () => get<Ticket[]>("/api/tasks/tickets"),
  history: () => get<TicketHistoryEntry[]>("/api/tasks/history"),

  createSprint: async (input: {
    name: string
    durationWeeks: SprintDurationWeeks
    startDate: string
  }) =>
    (await request<Sprint>("/api/tasks/sprints", { method: "POST", body: input }))
      .data,

  deleteSprint: (id: string) =>
    request<{ ok: true }>(`/api/tasks/sprints/${id}`, { method: "DELETE" }),

  createTicket: async (input: {
    title: string
    description: string
    status: TicketStatus
    priority: TicketPriority
    sprintId: string | null
    assigneeId: string | null
  }) =>
    (
      await request<Ticket>("/api/tasks/tickets", {
        method: "POST",
        body: input,
      })
    ).data,

  updateTicket: async (
    id: string,
    patch: Partial<{
      title: string
      description: string
      status: TicketStatus
      priority: TicketPriority
      sprintId: string | null
      assigneeId: string | null
    }>
  ) =>
    (
      await request<Ticket>(`/api/tasks/tickets/${id}`, {
        method: "PATCH",
        body: patch,
      })
    ).data,

  deleteTicket: (id: string) =>
    request<{ ok: true }>(`/api/tasks/tickets/${id}`, { method: "DELETE" }),

  ticketHistory: (id: string) =>
    get<TicketHistoryEntry[]>(`/api/tasks/tickets/${id}/history`),
}

/* -------------------------------------------------------------------------- */
/* Reports                                                                     */
/* -------------------------------------------------------------------------- */

export type ReportCounts = {
  all: number
  bug: number
  suggestion: number
  support: number
  report: number
}

export const reportsApi = {
  counts: () => get<ReportCounts>("/api/reports/counts"),

  list: (params?: {
    type?: ReportType
    status?: ReportStatus
    search?: string
    /** Excludes resolved and closed reports, matching the inbox default. */
    openOnly?: boolean
    limit?: number
    offset?: number
  }) =>
    getPage<SupportReport>("/api/reports", {
      type: params?.type,
      status: params?.status,
      search: params?.search,
      openOnly: params?.openOnly,
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
    }),

  get: (id: string) => get<SupportReport>(`/api/reports/${id}`),

  update: async (
    id: string,
    patch: {
      status?: ReportStatus
      priority?: ReportPriority
      assigneeId?: string | null
    }
  ) =>
    (
      await request<SupportReport>(`/api/reports/${id}`, {
        method: "PATCH",
        body: patch,
      })
    ).data,

  reply: async (
    id: string,
    input: { body: string; isInternal?: boolean; status?: ReportStatus }
  ) =>
    (
      await request<SupportReport>(`/api/reports/${id}/messages`, {
        method: "POST",
        body: input,
      })
    ).data,
}

/* -------------------------------------------------------------------------- */
/* Analytics                                                                   */
/* -------------------------------------------------------------------------- */

export type AnalyticsSummary = {
  windowDays: number
  totalEvents: number
  uniqueUsers: number
  eventsToday: number
  eventsChange: number
  topEvent: string | null
}

export const analyticsApi = {
  summary: (days = 7) => get<AnalyticsSummary>("/api/analytics/summary", { days }),
  trend: (days = 7) => get<DailyEventPoint[]>("/api/analytics/trend", { days }),
  topEvents: (days = 7, limit = 10) =>
    get<EventNameStat[]>("/api/analytics/top-events", { days, limit }),
  names: () => get<string[]>("/api/analytics/names"),
  events: (params?: {
    limit?: number
    name?: string
    search?: string
    platform?: AnalyticsEvent["platform"]
  }) =>
    get<AnalyticsEvent[]>("/api/analytics/events", {
      limit: params?.limit ?? 50,
      name: params?.name,
      search: params?.search,
      platform: params?.platform,
    }),
}

/* -------------------------------------------------------------------------- */
/* App users                                                                   */
/* -------------------------------------------------------------------------- */

export type AppUserStats = {
  windowDays: number
  total: number
  active: number
  trialing: number
  churned: number
  paid: number
  /** Keyed by the integrating app's own plan names. */
  plans: Record<string, number>
  newInWindow: number
}

export const appUsersApi = {
  /**
   * An empty query returns the most recently added users. `total` is the size
   * of the whole roster, however many rows came back.
   */
  async list(query: string, signal?: AbortSignal) {
    const response = await request<AppUser[]>("/api/app-users", {
      query: { q: query },
      signal,
    })
    const total = response.meta?.total

    return {
      users: response.data,
      total: typeof total === "number" ? total : null,
    }
  },
  stats: (days = 7) => get<AppUserStats>("/api/app-users/stats", { days }),
  detail: (externalId: string) =>
    get<{ user: AppUser; reports: SupportReport[] }>(
      `/api/app-users/${encodeURIComponent(externalId)}`
    ),
}

/* -------------------------------------------------------------------------- */
/* Provider integrations                                                       */
/* -------------------------------------------------------------------------- */

export type ServerIntegration = {
  provider: IntegrationProviderId
  label: string
  capabilities: string[]
  connected: boolean
  /** Non secret fragment. Null for users who cannot manage integrations. */
  apiKeyHint: string | null
  projectId: string | null
  projectName: string | null
  connectedAt: string | null
  lastCheckedAt: string | null
  lastError: string | null
}

export const integrationsApi = {
  list: () => get<ServerIntegration[]>("/api/integrations"),

  /** The key is write-only: no endpoint ever returns it after this call. */
  connectRevenueCat: async (input: { apiKey: string; projectId?: string }) =>
    (
      await request<ServerIntegration>("/api/integrations/revenuecat", {
        method: "PUT",
        body: input,
      })
    ).data,

  testRevenueCat: async () =>
    (
      await request<{
        ok: true
        metricsAvailable: number
        currency: string
      }>("/api/integrations/revenuecat/test", { method: "POST" })
    ).data,

  disconnectRevenueCat: async () =>
    (
      await request<ServerIntegration>("/api/integrations/revenuecat", {
        method: "DELETE",
      })
    ).data,
}

/* -------------------------------------------------------------------------- */
/* KPIs                                                                        */
/* -------------------------------------------------------------------------- */

export const kpisApi = {
  overview: () => get<KpiOverview>("/api/kpis/overview"),
  trend: (chart: KpiChartName, days = 30) =>
    get<KpiTrend>("/api/kpis/trend", { chart, days }),
  charts: () => get<{ id: KpiChartName; label: string }[]>("/api/kpis/charts"),
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                   */
/* -------------------------------------------------------------------------- */

export type ServerDashboardLayout = {
  /** Null when the user has never configured a dashboard. */
  widgets: DashboardWidget[] | null
  updatedAt: string | null
}

export const dashboardApi = {
  layout: () => get<ServerDashboardLayout>("/api/dashboard/layout"),
  saveLayout: async (widgets: DashboardWidget[]) =>
    (
      await request<{ widgets: DashboardWidget[]; updatedAt: string | null }>(
        "/api/dashboard/layout",
        { method: "PUT", body: { widgets } }
      )
    ).data,
}

/* -------------------------------------------------------------------------- */
/* Settings                                                                    */
/* -------------------------------------------------------------------------- */

export type ThemeSettings = {
  brandName: string
  logoImageId: string | null
  logoUrl: string | null
  primaryColor: string
  defaultTheme: string
  updatedAt: string
}

export const settingsApi = {
  theme: () => get<ThemeSettings>("/api/settings/theme"),
  updateTheme: async (
    patch: Partial<{
      brandName: string
      primaryColor: string
      defaultTheme: string
      logoImageId: string | null
    }>
  ) =>
    (
      await request<ThemeSettings>("/api/settings/theme", {
        method: "PUT",
        body: patch,
      })
    ).data,
}

/* -------------------------------------------------------------------------- */
/* Discord                                                                     */
/* -------------------------------------------------------------------------- */

export type ServerDiscordTrigger = {
  trigger: DiscordTriggerId
  label: string
  enabled: boolean
  configured: boolean
  webhookUrlHint: string | null
  lastFiredAt: string | null
  lastError: string | null
}

export const discordApi = {
  list: () => get<ServerDiscordTrigger[]>("/api/discord"),
  update: async (
    trigger: DiscordTriggerId,
    patch: { enabled?: boolean; webhookUrl?: string | null }
  ) =>
    (
      await request<ServerDiscordTrigger>(`/api/discord/${trigger}`, {
        method: "PUT",
        body: patch,
      })
    ).data,
  test: (trigger: DiscordTriggerId, webhookUrl?: string) =>
    request<{ ok: true }>(`/api/discord/${trigger}/test`, {
      method: "POST",
      body: webhookUrl ? { webhookUrl } : {},
    }),
}

/* -------------------------------------------------------------------------- */
/* API keys                                                                    */
/* -------------------------------------------------------------------------- */

export type ApiKeySummary = {
  id: string
  name: string
  prefix: string
  scopes: string[]
  lastUsedAt: string | null
  /** The most recent request this key had rejected, with the reason. */
  lastErrorAt?: string | null
  lastError?: string | null
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
}

export const apiKeysApi = {
  list: () => get<ApiKeySummary[]>("/api/api-keys"),
  scopes: () => get<{ id: string; description: string }[]>("/api/api-keys/scopes"),

  async create(input: { name: string; scopes: string[] }) {
    const response = await request<ApiKeySummary>("/api/api-keys", {
      method: "POST",
      body: input,
    })

    return {
      key: response.data,
      // Only moment the plaintext is ever available.
      secret: response.meta?.key as string,
    }
  },

  revoke: (id: string) =>
    request<ApiKeySummary>(`/api/api-keys/${id}/revoke`, { method: "POST" }),
  remove: (id: string) =>
    request<{ ok: true }>(`/api/api-keys/${id}`, { method: "DELETE" }),
}

/* -------------------------------------------------------------------------- */
/* Uploads                                                                     */
/* -------------------------------------------------------------------------- */

export const uploadsApi = {
  status: () =>
    get<{ uploadsConfigured: boolean; imagesConfigured: boolean }>(
      "/api/uploads/status"
    ),

  /**
   * Uploads straight to Cloudflare R2 with a short-lived presigned PUT URL
   * minted by our API, so the file never passes through the backend. Returns
   * the object key to persist against a profile or the theme settings.
   */
  async uploadImage(
    file: File,
    purpose: "avatar" | "branding"
  ): Promise<string> {
    const contentType = await resolveImageContentType(file)
    const { uploadUrl, imageId, method, headers } = (
      await request<{
        uploadUrl: string
        imageId: string
        method: "PUT"
        headers: Record<string, string>
      }>("/api/uploads/direct-upload", {
        method: "POST",
        body: { purpose, contentType },
      })
    ).data

    const response = await fetch(uploadUrl, {
      method: method ?? "PUT",
      body: file,
      headers: {
        "Content-Type": contentType,
        ...headers,
      },
    })

    if (!response.ok) {
      throw new ApiError(
        response.status,
        "upload_failed",
        "Image upload failed"
      )
    }

    return imageId
  },
}

/** Prefer `file.type`, then sniff magic bytes, then fall back by extension. */
async function resolveImageContentType(file: File): Promise<string> {
  const typed = file.type.trim().toLowerCase()
  if (typed === "image/jpg" || typed === "image/pjpeg") return "image/jpeg"
  if (typed === "image/x-png") return "image/png"
  if (
    typed === "image/jpeg" ||
    typed === "image/png" ||
    typed === "image/webp" ||
    typed === "image/gif"
  ) {
    return typed
  }

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (
    header.length >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47
  ) {
    return "image/png"
  }
  if (
    header.length >= 3 &&
    header[0] === 0xff &&
    header[1] === 0xd8 &&
    header[2] === 0xff
  ) {
    return "image/jpeg"
  }
  if (
    header.length >= 6 &&
    header[0] === 0x47 &&
    header[1] === 0x49 &&
    header[2] === 0x46
  ) {
    return "image/gif"
  }
  if (
    header.length >= 12 &&
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return "image/webp"
  }

  const name = file.name.toLowerCase()
  if (name.endsWith(".png")) return "image/png"
  if (name.endsWith(".webp")) return "image/webp"
  if (name.endsWith(".gif")) return "image/gif"
  return "image/jpeg"
}
