import type { ActivityAction, PanelPermissionId } from "@/lib/panel-permissions"
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
import type {
  AnalyticsEvent,
  DailyEventPoint,
  EventNameStat,
} from "@/lib/analytics"
import type { AppUser } from "@/lib/app-users"
import type { DashboardWidget } from "@/lib/dashboard"
import type { DiscordTriggerId } from "@/lib/discord-webhooks"
import type { IntegrationProviderId } from "@/lib/integrations"
import type { KpiChartName, KpiOverview, KpiTrend } from "@/lib/kpis"
import type {
  SideshiftAnalytics,
  SideshiftPostSort,
  SideshiftRange,
  SideshiftSeries,
  SideshiftStatus,
} from "@/lib/sideshift"

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

/** The server's 403 message for every request from a suspended tenant. */
const ACCOUNT_SUSPENDED_MESSAGE = "This account has been suspended"

/**
 * Fired on `window` when a request is refused because the tenant was suspended
 * mid-session, so the auth provider can re-read /me and show the suspended
 * screen instead of a panel full of errors.
 */
export const ACCOUNT_SUSPENDED_EVENT = "yak:account-suspended"

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
      // Always a JSON content type on writes, body or not, so every write is
      // a CORS preflighted request rather than a "simple" one a third-party
      // page could fire with the session cookie attached.
      headers:
        options.body || (options.method && options.method !== "GET")
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

    if (
      response.status === 403 &&
      error.message === ACCOUNT_SUSPENDED_MESSAGE
    ) {
      window.dispatchEvent(new Event(ACCOUNT_SUSPENDED_EVENT))
    }

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
  const response = (await request<T[]>(path, {
    query,
  })) as unknown as Paginated<T>

  return response
}

/* -------------------------------------------------------------------------- */
/* Shared server types                                                         */
/* -------------------------------------------------------------------------- */

/** Roles inside a customer's workspace. */
export type UserRole = "owner" | "admin" | "member"

/** Yak staff hold `super_admin`, which belongs to no customer workspace. */
export type AccountRole = UserRole | "super_admin"

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

export type CurrentTenant = {
  id: string
  name: string
  slug: string
  status: "active" | "suspended"
}

export type CurrentUser = Omit<ServerSystemUser, "role"> & {
  role: AccountRole
  mustChangePassword: boolean
  isSuperAdmin: boolean
  /** The customer workspace the user belongs to. Null for super admins. */
  tenant: CurrentTenant | null
}

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
/* Apps                                                                        */
/* -------------------------------------------------------------------------- */

export type AppStatus = "active" | "archived"

/**
 * One of the workspace's apps. Everything an app sends (events, users,
 * reports) and the credentials it sends with belong to exactly one app, so the
 * endpoints for those live under `/api/apps/:appId`.
 */
export type App = {
  id: string
  name: string
  slug: string
  status: AppStatus
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AppDetail = App & {
  userCount: number
  apiKeyCount: number
}

/** Prefix for every endpoint scoped to one app. */
function appPath(appId: string, path: string) {
  return `/api/apps/${encodeURIComponent(appId)}${path}`
}

export const appsApi = {
  list: () => get<App[]>("/api/apps"),
  get: (id: string) => get<AppDetail>(appPath(id, "")),

  create: async (input: { name: string; slug?: string }) =>
    (await request<App>("/api/apps", { method: "POST", body: input })).data,

  rename: async (id: string, name: string) =>
    (
      await request<App>(appPath(id, ""), {
        method: "PATCH",
        body: { name },
      })
    ).data,

  archive: async (id: string) =>
    (await request<App>(appPath(id, "/archive"), { method: "POST" })).data,

  restore: async (id: string) =>
    (await request<App>(appPath(id, "/restore"), { method: "POST" })).data,
}

/* -------------------------------------------------------------------------- */
/* Billing                                                                     */
/* -------------------------------------------------------------------------- */

export type PlanTierId =
  | "free"
  | "starter"
  | "growth"
  | "pro"
  | "studio"
  | "scale"

export type BillingPlan = {
  id: PlanTierId
  name: string
  /** Inclusive MAU cap; null for the custom tier. */
  mauCap: number | null
  monthlyPrice: number | null
  annualPrice: number | null
  /** Null means unlimited. */
  adminSeats: number | null
  historyDays: number | null
  eventsPerMonth: number | null
  support: "docs" | "email"
}

export type BillingSummary = {
  plan: BillingPlan
  plans: BillingPlan[]
  usage: {
    currentMonthMau: number
    previousMonthMau: number
    /** Peak of the last two full months, which is what sets the tier. */
    billableMau: number
    suggestedPlanId: PlanTierId
  }
  hasPaymentMethod: boolean
  /** Stripe holds this account's billing; changes go through its portal. */
  hasSubscription: boolean
  subscriptionStatus: string | null
  /** A paid tier picked at sign up and not yet paid for. */
  pendingPlan: PlanTierId | null
  pendingInterval: "monthly" | "annual" | null
  /** False until Stripe is connected on the server. */
  paymentsEnabled: boolean
}

export const billingApi = {
  get: () => get<BillingSummary>("/api/billing"),

  /** A Stripe Checkout URL. With no plan, continues the one picked at sign up. */
  checkout: async (body: { plan?: PlanTierId; interval?: "monthly" | "annual" } = {}) =>
    (
      await request<{ url: string }>("/api/billing/checkout", {
        method: "POST",
        body,
      })
    ).data.url,

  /** Stripe's customer portal, to change tier, update the card or cancel. */
  portal: async () =>
    (await request<{ url: string }>("/api/billing/portal", { method: "POST" }))
      .data.url,

  /** Stays on Free instead of the tier picked at sign up. */
  dismissPending: async () => {
    await request<{ ok: true }>("/api/billing/pending", { method: "DELETE" })
  },
}

/* -------------------------------------------------------------------------- */
/* Sign up                                                                     */
/* -------------------------------------------------------------------------- */

export type SignupInput = {
  accountName: string
  name: string
  email: string
  password: string
  plan: PlanTierId
  interval: "monthly" | "annual"
}

export const signupApi = {
  /** Creates the account; nobody is signed in until the email is confirmed. */
  create: async (input: SignupInput) =>
    (await request<{ email: string }>("/api/signup", { method: "POST", body: input }))
      .data,
}

/* -------------------------------------------------------------------------- */
/* Public config                                                               */
/* -------------------------------------------------------------------------- */

export type AppConfig = {
  tenantName: string
  tenantSlug: string | null
  signUpEnabled: boolean
  /** Whether paid tiers can be bought online. */
  paymentsEnabled: boolean
  passwordMinLength: number
  plans: BillingPlan[]
  branding: {
    brandName: string
    logoUrl: string | null
    primaryColor: string
    defaultTheme: string
  }
}

let configPromise: Promise<AppConfig> | null = null

/**
 * Product branding, readable without a session so the login screen can render
 * it. A tenant's own brand comes from brandingApi once signed in. Memoized
 * because several providers need it during boot.
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
      body: JSON.stringify({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      }),
    })
  },

  /** Sends a fresh confirmation link; answers the same whoever asks. */
  async sendVerificationEmail(email: string) {
    await fetch(`${API_URL}/api/auth/send-verification-email`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
  },

  /**
   * Confirms the email from a sign up link and signs the person in. Called
   * from the panel rather than opened on the API host, so the session cookie
   * lands where the panel's own requests will send it.
   */
  async verifyEmail(token: string) {
    const response = await fetch(
      `${API_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`,
      { credentials: "include" }
    )

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        code?: string
      } | null

      throw new ApiError(
        response.status,
        payload?.code ?? "verify_failed",
        payload?.code === "TOKEN_EXPIRED"
          ? "This link has expired. Sign in to get a new one."
          : "This link is not valid. Sign in to get a new one."
      )
    }
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
    (
      await request<Sprint>("/api/tasks/sprints", {
        method: "POST",
        body: input,
      })
    ).data,

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

/** Reports are filed against one app, so every call names it. */
export const reportsApi = {
  counts: (appId: string) =>
    get<ReportCounts>(appPath(appId, "/reports/counts")),

  list: (
    appId: string,
    params?: {
      type?: ReportType
      status?: ReportStatus
      search?: string
      /** Excludes resolved and closed reports, matching the inbox default. */
      openOnly?: boolean
      limit?: number
      offset?: number
    }
  ) =>
    getPage<SupportReport>(appPath(appId, "/reports"), {
      type: params?.type,
      status: params?.status,
      search: params?.search,
      openOnly: params?.openOnly,
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
    }),

  get: (appId: string, id: string) =>
    get<SupportReport>(appPath(appId, `/reports/${id}`)),

  update: async (
    appId: string,
    id: string,
    patch: {
      status?: ReportStatus
      priority?: ReportPriority
      assigneeId?: string | null
    }
  ) =>
    (
      await request<SupportReport>(appPath(appId, `/reports/${id}`), {
        method: "PATCH",
        body: patch,
      })
    ).data,

  reply: async (
    appId: string,
    id: string,
    input: { body: string; isInternal?: boolean; status?: ReportStatus }
  ) =>
    (
      await request<SupportReport>(appPath(appId, `/reports/${id}/messages`), {
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
  summary: (appId: string, days = 7) =>
    get<AnalyticsSummary>(appPath(appId, "/analytics/summary"), { days }),
  trend: (appId: string, days = 7) =>
    get<DailyEventPoint[]>(appPath(appId, "/analytics/trend"), { days }),
  topEvents: (appId: string, days = 7, limit = 10) =>
    get<EventNameStat[]>(appPath(appId, "/analytics/top-events"), {
      days,
      limit,
    }),
  names: (appId: string) => get<string[]>(appPath(appId, "/analytics/names")),
  events: (
    appId: string,
    params?: {
      limit?: number
      name?: string
      search?: string
      platform?: AnalyticsEvent["platform"]
    }
  ) =>
    get<AnalyticsEvent[]>(appPath(appId, "/analytics/events"), {
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
  async list(appId: string, query: string, signal?: AbortSignal) {
    const response = await request<AppUser[]>(appPath(appId, "/app-users"), {
      query: { q: query },
      signal,
    })
    const total = response.meta?.total

    return {
      users: response.data,
      total: typeof total === "number" ? total : null,
    }
  },
  stats: (appId: string, days = 7) =>
    get<AppUserStats>(appPath(appId, "/app-users/stats"), { days }),
  detail: (appId: string, externalId: string) =>
    get<{ user: AppUser; reports: SupportReport[] }>(
      appPath(appId, `/app-users/${encodeURIComponent(externalId)}`)
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

/**
 * RevenueCat is connected per app, so the list is read for one app. Sideshift
 * belongs to the whole workspace but is reported in the same list for the
 * dashboard's convenience.
 */
export const integrationsApi = {
  list: (appId: string) =>
    get<ServerIntegration[]>(appPath(appId, "/integrations")),

  /** The key is write-only: no endpoint ever returns it after this call. */
  connectRevenueCat: async (
    appId: string,
    input: { apiKey: string; projectId?: string }
  ) =>
    (
      await request<ServerIntegration>(
        appPath(appId, "/integrations/revenuecat"),
        { method: "PUT", body: input }
      )
    ).data,

  testRevenueCat: async (appId: string) =>
    (
      await request<{
        ok: true
        metricsAvailable: number
        currency: string
      }>(appPath(appId, "/integrations/revenuecat/test"), { method: "POST" })
    ).data,

  disconnectRevenueCat: async (appId: string) =>
    (
      await request<ServerIntegration>(
        appPath(appId, "/integrations/revenuecat"),
        { method: "DELETE" }
      )
    ).data,
}

/* -------------------------------------------------------------------------- */
/* Sideshift                                                                   */
/* -------------------------------------------------------------------------- */

export const sideshiftApi = {
  status: () => get<SideshiftStatus>("/api/sideshift/status"),

  analytics: (params: {
    campaign: string
    range: SideshiftRange
    sort: SideshiftPostSort
  }) => get<SideshiftAnalytics>("/api/sideshift/analytics", params),

  /** `creators` is the stored option value: encoded keys joined by commas. */
  series: (params: { campaign: string; days: number; creators: string }) =>
    get<SideshiftSeries>("/api/sideshift/series", params),

  /** Starts a sync in the background; poll `status` for the result. */
  refresh: async () =>
    (
      await request<{ started: true }>("/api/sideshift/refresh", {
        method: "POST",
      })
    ).data,

  saveCampaigns: async (tracked: string[]) =>
    (
      await request<SideshiftStatus>("/api/sideshift/campaigns", {
        method: "PUT",
        body: { tracked },
      })
    ).data,

  /** Returns Sideshift's consent URL. The caller navigates the page to it. */
  connect: async () =>
    (
      await request<{ authorizeUrl: string }>("/api/sideshift/connect", {
        method: "POST",
      })
    ).data,

  /**
   * Finishes a connection after Sideshift redirects back. Only works for the
   * signed-in user who clicked Connect. Resolves to a callback outcome key.
   */
  complete: async (state: string) =>
    (
      await request<{ outcome: string }>("/api/sideshift/complete", {
        method: "POST",
        body: { state },
      })
    ).data.outcome,

  disconnect: async () =>
    (
      await request<SideshiftStatus>("/api/sideshift/connection", {
        method: "DELETE",
      })
    ).data,
}

/* -------------------------------------------------------------------------- */
/* KPIs                                                                        */
/* -------------------------------------------------------------------------- */

export const kpisApi = {
  overview: (appId: string) =>
    get<KpiOverview>(appPath(appId, "/kpis/overview")),
  trend: (appId: string, chart: KpiChartName, days = 30) =>
    get<KpiTrend>(appPath(appId, "/kpis/trend"), { chart, days }),
  charts: (appId: string) =>
    get<{ id: KpiChartName; label: string }[]>(appPath(appId, "/kpis/charts")),
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

/** The signed-in tenant's brand. Readable by every tenant user. */
export const brandingApi = {
  get: () => get<ThemeSettings>("/api/branding"),
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

/** A key sends data for exactly one app, so keys are minted per app. */
export const apiKeysApi = {
  list: (appId: string) => get<ApiKeySummary[]>(appPath(appId, "/api-keys")),
  scopes: (appId: string) =>
    get<{ id: string; description: string }[]>(
      appPath(appId, "/api-keys/scopes")
    ),

  async create(appId: string, input: { name: string; scopes: string[] }) {
    const response = await request<ApiKeySummary>(appPath(appId, "/api-keys"), {
      method: "POST",
      body: input,
    })

    return {
      key: response.data,
      // Only moment the plaintext is ever available.
      secret: response.meta?.key as string,
    }
  },

  revoke: (appId: string, id: string) =>
    request<ApiKeySummary>(appPath(appId, `/api-keys/${id}/revoke`), {
      method: "POST",
    }),
  remove: (appId: string, id: string) =>
    request<{ ok: true }>(appPath(appId, `/api-keys/${id}`), {
      method: "DELETE",
    }),
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
        // The size is signed into the URL, so only this file fits it.
        body: { purpose, contentType, sizeBytes: file.size },
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
