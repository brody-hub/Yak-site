import {
  request,
  type AccountRole,
  type AppStatus,
  type PlanTierId,
  type ServerSystemUser,
  type UserRole,
} from "@/lib/api"

/* -------------------------------------------------------------------------- */
/* Super admin console: customer accounts and Yak staff                        */
/* -------------------------------------------------------------------------- */

export type TenantStatus = "active" | "suspended"

/**
 * An account as staff see it: who runs it and what it is set up with. The
 * apps carry name and status only; what those apps send is never shown here.
 */
export type AdminTenant = {
  id: string
  name: string
  slug: string
  status: TenantStatus
  plan: PlanTierId
  suspendedAt: string | null
  suspendedReason: string | null
  createdAt: string
  userCount: number
  appCount: number
  apps: { id: string; name: string; status: AppStatus }[]
  owners: { id: string; name: string; email: string }[]
  lastActiveAt: string | null
}

export const PLAN_TIERS: { id: PlanTierId; label: string }[] = [
  { id: "free", label: "Free" },
  { id: "starter", label: "Starter" },
  { id: "growth", label: "Growth" },
  { id: "pro", label: "Pro" },
  { id: "studio", label: "Studio" },
  { id: "scale", label: "Scale" },
]

export function planLabel(id: PlanTierId) {
  return PLAN_TIERS.find((tier) => tier.id === id)?.label ?? id
}

/** A panel user as the admin console sees it, super admins included. */
export type AdminUser = Omit<ServerSystemUser, "role"> & { role: AccountRole }

export type IssuedCredentials = {
  inviteEmailSent: boolean
  /** Empty unless the invite email could not be sent. */
  temporaryPassword: string
}

function credentialsFrom(meta: Record<string, unknown> | undefined) {
  return {
    inviteEmailSent: Boolean(meta?.inviteEmailSent),
    temporaryPassword: String(meta?.temporaryPassword ?? ""),
  }
}

/** Mirrors the server's rule. Slugs are fixed once an account is created. */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,39}$/

/** A slug suggestion from an account name, e.g. "Shred Labs!" → "shred-labs". */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "")
}

export const adminApi = {
  tenants: async () =>
    (await request<AdminTenant[]>("/api/admin/tenants")).data,

  tenant: async (id: string) =>
    (
      await request<{ tenant: AdminTenant; users: AdminUser[] }>(
        `/api/admin/tenants/${id}`
      )
    ).data,

  async createTenant(input: {
    name: string
    slug: string
    ownerName: string
    ownerEmail: string
  }) {
    const response = await request<{ tenant: AdminTenant; owner: AdminUser }>(
      "/api/admin/tenants",
      { method: "POST", body: input }
    )

    return { ...response.data, ...credentialsFrom(response.meta) }
  },

  renameTenant: async (id: string, name: string) =>
    (
      await request<AdminTenant>(`/api/admin/tenants/${id}`, {
        method: "PATCH",
        body: { name },
      })
    ).data,

  setPlan: async (id: string, plan: PlanTierId) =>
    (
      await request<AdminTenant>(`/api/admin/tenants/${id}/plan`, {
        method: "PATCH",
        body: { plan },
      })
    ).data,

  suspendTenant: async (id: string, reason?: string) =>
    (
      await request<AdminTenant>(`/api/admin/tenants/${id}/suspend`, {
        method: "POST",
        body: reason ? { reason } : {},
      })
    ).data,

  reactivateTenant: async (id: string) =>
    (
      await request<AdminTenant>(`/api/admin/tenants/${id}/reactivate`, {
        method: "POST",
      })
    ).data,

  deleteTenant: (id: string, confirmSlug: string) =>
    request<{ ok: true }>(`/api/admin/tenants/${id}`, {
      method: "DELETE",
      body: { confirmSlug },
    }),

  async addTenantUser(
    tenantId: string,
    input: { name: string; email: string; role: UserRole }
  ) {
    const response = await request<AdminUser>(
      `/api/admin/tenants/${tenantId}/users`,
      { method: "POST", body: input }
    )

    return { user: response.data, ...credentialsFrom(response.meta) }
  },

  async resendTenantInvite(tenantId: string, userId: string) {
    const response = await request<{ ok: true }>(
      `/api/admin/tenants/${tenantId}/users/${userId}/resend-invite`,
      { method: "POST" }
    )

    return credentialsFrom(response.meta)
  },

  superAdmins: async () =>
    (await request<AdminUser[]>("/api/admin/super-admins")).data,

  async inviteSuperAdmin(input: { name: string; email: string }) {
    const response = await request<AdminUser>("/api/admin/super-admins", {
      method: "POST",
      body: input,
    })

    return { user: response.data, ...credentialsFrom(response.meta) }
  },

  removeSuperAdmin: (id: string) =>
    request<{ ok: true }>(`/api/admin/super-admins/${id}`, {
      method: "DELETE",
    }),
}

export function formatAdminDate(value: string | null) {
  if (!value) {
    return "Never"
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value))
}
