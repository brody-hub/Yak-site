import { getAvatarUrl } from "@/lib/panel-permissions"

/**
 * The integrating app's own plan name, lowercased by the API. `free` is the
 * one reserved name and means the user is not paying.
 */
export type AppUserPlan = string

export type AppUserPlatform = "ios" | "android" | "web"

export type AppUser = {
  id: string
  name: string
  /** Null for accounts with no address on file, such as phone sign-in. */
  email: string | null
  avatar: string
  plan: AppUserPlan
  billingPeriod: "none" | "monthly" | "annual"
  /** Null when the app did not say which platform the user is on. */
  platform: AppUserPlatform | null
  status: "active" | "trialing" | "churned"
  renewsAt: string | null
  createdAt: string
}

export const DEMO_APP_USERS: AppUser[] = [
  {
    id: "u_1842",
    name: "Maya Chen",
    email: "maya@example.com",
    avatar: getAvatarUrl("Maya Chen"),
    plan: "pro",
    billingPeriod: "annual",
    platform: "ios",
    status: "active",
    renewsAt: "2026-11-12T10:00:00.000Z",
    createdAt: "2025-11-12T10:00:00.000Z",
  },
  {
    id: "u_2091",
    name: "Noah Patel",
    email: "noah@example.com",
    avatar: getAvatarUrl("Noah Patel"),
    plan: "pro",
    billingPeriod: "monthly",
    platform: "android",
    status: "active",
    renewsAt: "2026-09-04T14:20:00.000Z",
    createdAt: "2026-01-04T14:20:00.000Z",
  },
  {
    id: "u_773",
    name: "Sofia Alvarez",
    email: "sofia@example.com",
    avatar: getAvatarUrl("Sofia Alvarez"),
    plan: "plus",
    billingPeriod: "monthly",
    platform: "android",
    status: "trialing",
    renewsAt: "2026-08-11T09:15:00.000Z",
    createdAt: "2026-07-28T09:15:00.000Z",
  },
  {
    id: "u_3301",
    name: "Liam Brooks",
    email: "liam@example.com",
    avatar: getAvatarUrl("Liam Brooks"),
    plan: "free",
    billingPeriod: "none",
    platform: "web",
    status: "active",
    renewsAt: null,
    createdAt: "2026-03-19T18:40:00.000Z",
  },
  {
    id: "u_1190",
    name: "Ava Nguyen",
    email: "ava@example.com",
    avatar: getAvatarUrl("Ava Nguyen"),
    plan: "plus",
    billingPeriod: "annual",
    platform: "ios",
    status: "active",
    renewsAt: "2026-09-02T11:05:00.000Z",
    createdAt: "2025-09-02T11:05:00.000Z",
  },
  {
    id: "u_552",
    name: "Ethan Cole",
    email: "ethan@example.com",
    avatar: getAvatarUrl("Ethan Cole"),
    plan: "free",
    billingPeriod: "none",
    platform: "web",
    status: "churned",
    renewsAt: null,
    createdAt: "2025-06-14T16:30:00.000Z",
  },
  {
    id: "u_4410",
    name: "Harper Diaz",
    email: "harper@example.com",
    avatar: getAvatarUrl("Harper Diaz"),
    plan: "pro",
    billingPeriod: "monthly",
    platform: "ios",
    status: "trialing",
    renewsAt: "2026-08-08T08:12:00.000Z",
    createdAt: "2026-08-01T08:12:00.000Z",
  },
  {
    id: "u_882",
    name: "Owen Kim",
    email: "owen@example.com",
    avatar: getAvatarUrl("Owen Kim"),
    plan: "plus",
    billingPeriod: "monthly",
    platform: "web",
    status: "active",
    renewsAt: "2026-08-22T13:50:00.000Z",
    createdAt: "2026-02-22T13:50:00.000Z",
  },
  {
    id: "u_9012",
    name: "Isla Freya",
    email: "isla@example.com",
    avatar: getAvatarUrl("Isla Freya"),
    plan: "free",
    billingPeriod: "none",
    platform: "ios",
    status: "active",
    renewsAt: null,
    createdAt: "2026-05-08T20:00:00.000Z",
  },
  {
    id: "u_667",
    name: "Jack Morgan",
    email: "jack@example.com",
    avatar: getAvatarUrl("Jack Morgan"),
    plan: "pro",
    billingPeriod: "annual",
    platform: "android",
    status: "churned",
    renewsAt: null,
    createdAt: "2025-04-30T07:45:00.000Z",
  },
]

/** `team_annual` and `team-annual` both read as "Team Annual". */
export function getPlanLabel(plan: AppUserPlan) {
  return plan
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

const PLATFORM_LABELS: Record<AppUserPlatform, string> = {
  ios: "iOS",
  android: "Android",
  web: "Web",
}

export function getPlatformLabel(platform: AppUserPlatform | null) {
  return platform ? PLATFORM_LABELS[platform] : "Unknown"
}

export function getSubscriptionLabel(user: AppUser) {
  if (user.plan === "free") {
    return "Free"
  }

  const period =
    user.billingPeriod === "annual"
      ? "Annual"
      : user.billingPeriod === "monthly"
        ? "Monthly"
        : null

  return period ? `${getPlanLabel(user.plan)} · ${period}` : getPlanLabel(user.plan)
}

export function formatUserDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value))
}

export function searchAppUsers(users: AppUser[], query: string) {
  const trimmed = query.trim().toLowerCase()

  if (!trimmed) {
    return []
  }

  return users.filter((user) => {
    const haystack = [user.id, user.name, user.email ?? ""]
      .join(" ")
      .toLowerCase()
    return haystack.includes(trimmed)
  })
}
