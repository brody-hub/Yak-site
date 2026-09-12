export type PanelPermissionId =
  | "dashboard"
  | "kpis"
  | "tasks"
  | "users"
  | "reports"
  | "analytics"
  | "user-management"
  | "theme"
  | "discord"

export type PanelPermission = {
  id: PanelPermissionId
  label: string
  group: "Main" | "Support" | "Settings"
}

export const PANEL_PERMISSIONS: PanelPermission[] = [
  { id: "dashboard", label: "Dashboard", group: "Main" },
  { id: "kpis", label: "KPIs", group: "Main" },
  { id: "tasks", label: "Tasks", group: "Main" },
  { id: "users", label: "Users", group: "Support" },
  { id: "reports", label: "Reports", group: "Support" },
  { id: "analytics", label: "Analytic Events", group: "Support" },
  { id: "user-management", label: "User management", group: "Settings" },
  { id: "theme", label: "Theme", group: "Settings" },
  { id: "discord", label: "Discord", group: "Settings" },
]

export type SystemUser = {
  id: string
  name: string
  email: string
  avatar: string
  permissions: PanelPermissionId[]
  createdAt: string
}

export function getAvatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return "?"
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase()
  }

  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
}

export type ActivityAction =
  | "signed_in"
  | "viewed"
  | "updated"
  | "created"
  | "exported"

export type ActivityLogEntry = {
  id: string
  userId: string
  action: ActivityAction
  section: PanelPermissionId | "account"
  summary: string
  createdAt: string
}

export const DEMO_SYSTEM_USERS: SystemUser[] = [
  {
    id: "1",
    name: "Admin",
    email: "admin@stand.app",
    avatar: getAvatarUrl("Admin"),
    permissions: PANEL_PERMISSIONS.map((permission) => permission.id),
    createdAt: "2026-01-12T15:30:00.000Z",
  },
  {
    id: "2",
    name: "Alex Rivera",
    email: "alex@stand.app",
    avatar: getAvatarUrl("Alex Rivera"),
    permissions: ["dashboard", "kpis", "tasks", "reports"],
    createdAt: "2026-02-03T18:10:00.000Z",
  },
  {
    id: "3",
    name: "Jordan Lee",
    email: "jordan@stand.app",
    avatar: getAvatarUrl("Jordan Lee"),
    permissions: ["dashboard", "users", "reports"],
    createdAt: "2026-03-21T12:45:00.000Z",
  },
]

export const DEMO_ACTIVITY_LOG: ActivityLogEntry[] = [
  {
    id: "a1",
    userId: "1",
    action: "signed_in",
    section: "account",
    summary: "Signed in to the panel",
    createdAt: "2026-08-06T19:12:00.000Z",
  },
  {
    id: "a2",
    userId: "1",
    action: "updated",
    section: "theme",
    summary: "Updated primary color",
    createdAt: "2026-08-06T19:18:00.000Z",
  },
  {
    id: "a3",
    userId: "1",
    action: "viewed",
    section: "user-management",
    summary: "Opened user management",
    createdAt: "2026-08-06T19:20:00.000Z",
  },
  {
    id: "a4",
    userId: "1",
    action: "created",
    section: "user-management",
    summary: "Created system user Jordan Lee",
    createdAt: "2026-08-06T19:22:00.000Z",
  },
  {
    id: "a5",
    userId: "2",
    action: "signed_in",
    section: "account",
    summary: "Signed in to the panel",
    createdAt: "2026-08-06T16:04:00.000Z",
  },
  {
    id: "a6",
    userId: "2",
    action: "viewed",
    section: "dashboard",
    summary: "Viewed dashboard metrics",
    createdAt: "2026-08-06T16:06:00.000Z",
  },
  {
    id: "a7",
    userId: "2",
    action: "viewed",
    section: "kpis",
    summary: "Reviewed KPI trends",
    createdAt: "2026-08-06T16:15:00.000Z",
  },
  {
    id: "a8",
    userId: "2",
    action: "updated",
    section: "tasks",
    summary: "Updated sprint task status",
    createdAt: "2026-08-06T16:28:00.000Z",
  },
  {
    id: "a9",
    userId: "2",
    action: "exported",
    section: "reports",
    summary: "Exported weekly report",
    createdAt: "2026-08-06T16:41:00.000Z",
  },
  {
    id: "a10",
    userId: "3",
    action: "signed_in",
    section: "account",
    summary: "Signed in to the panel",
    createdAt: "2026-08-05T21:02:00.000Z",
  },
  {
    id: "a11",
    userId: "3",
    action: "viewed",
    section: "users",
    summary: "Browsed application users",
    createdAt: "2026-08-05T21:08:00.000Z",
  },
  {
    id: "a12",
    userId: "3",
    action: "viewed",
    section: "reports",
    summary: "Opened reports inbox",
    createdAt: "2026-08-05T21:14:00.000Z",
  },
  {
    id: "a13",
    userId: "3",
    action: "updated",
    section: "reports",
    summary: "Responded to a user report",
    createdAt: "2026-08-05T21:27:00.000Z",
  },
]

/** The route that renders a given section. */
export function permissionPath(permission: PanelPermissionId) {
  switch (permission) {
    case "dashboard":
      return "/"
    case "user-management":
      return "/settings/user-management"
    case "theme":
      return "/settings/theme"
    case "discord":
      return "/settings/discord"
    default:
      return `/${permission}`
  }
}

export function getPermissionLabel(id: PanelPermissionId) {
  return PANEL_PERMISSIONS.find((permission) => permission.id === id)?.label ?? id
}

/**
 * The server logs a wider set of sections than the panel exposes as
 * permissions, so unknown values are title-cased rather than dropped.
 */
export function getActivitySectionLabel(section: string) {
  if (section === "account") {
    return "Account"
  }

  const known = PANEL_PERMISSIONS.find(
    (permission) => permission.id === section
  )

  if (known) {
    return known.label
  }

  return section
    .replace(/[-_]/g, " ")
    .replace(/^./, (character) => character.toUpperCase())
}

const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  signed_in: "Signed in",
  viewed: "Viewed",
  updated: "Updated",
  created: "Created",
  exported: "Exported",
  invited: "Invited",
  deleted: "Deleted",
}

export function getActivityActionLabel(action: string) {
  return (
    ACTIVITY_ACTION_LABELS[action] ??
    action.replace(/[-_]/g, " ").replace(/^./, (c) => c.toUpperCase())
  )
}
