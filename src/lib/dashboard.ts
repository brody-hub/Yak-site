import type { IntegrationProviderId } from "@/lib/integrations"
import { KPI_CHARTS, KPI_CHART_LABELS, KPI_SUMMARY_METRICS } from "@/lib/kpis"
import type { PanelPermissionId } from "@/lib/panel-permissions"

/**
 * The dashboard widget catalogue.
 *
 * A widget is offered to a user when two independent conditions hold:
 *
 *  1. they hold the section permission the widget reads from, and
 *  2. every integration the widget depends on is connected.
 *
 * The add-widget picker lists the whole catalogue either way so people can see
 * what the dashboard is capable of, but anything unavailable is disabled with
 * the reason spelled out. Nothing here is a security boundary: each widget
 * fetches from an endpoint that enforces the same permission server side.
 */

export type WidgetSize = "sm" | "md" | "lg" | "full"

export const WIDGET_SIZE_LABELS: Record<WidgetSize, string> = {
  sm: "Small (quarter width)",
  md: "Medium (half width)",
  lg: "Large (three quarters)",
  full: "Full width",
}

/** Tailwind column spans against the 4-column dashboard grid. */
export const WIDGET_SIZE_CLASSES: Record<WidgetSize, string> = {
  sm: "@xl/main:col-span-2 @5xl/main:col-span-1",
  md: "@xl/main:col-span-2 @5xl/main:col-span-2",
  lg: "@xl/main:col-span-4 @5xl/main:col-span-3",
  full: "@xl/main:col-span-4 @5xl/main:col-span-4",
}

export type WidgetOption =
  | {
      key: string
      label: string
      type: "select"
      choices: { value: string; label: string }[]
      default: string
      help?: string
    }
  | {
      key: string
      label: string
      type: "number"
      min: number
      max: number
      default: number
      help?: string
    }
  | {
      key: string
      label: string
      type: "boolean"
      default: boolean
      help?: string
    }
  | {
      key: string
      label: string
      type: "text"
      maxLength: number
      default: string
      help?: string
    }

export type WidgetOptionValues = Record<string, string | number | boolean>

/** A configured tile on someone's dashboard. */
export type DashboardWidget = {
  /** Instance id, so the same type can be added more than once. */
  id: string
  type: string
  options: WidgetOptionValues
}

export type WidgetCategory =
  | "Revenue"
  | "Analytics"
  | "Support"
  | "Tasks"
  | "Users"

export type WidgetDefinition = {
  type: string
  title: string
  description: string
  category: WidgetCategory
  /** Section permission the widget's data lives behind. */
  permission: PanelPermissionId
  /** Integration that must be connected before the widget can show anything. */
  requires?: IntegrationProviderId
  sizes: WidgetSize[]
  defaultSize: WidgetSize
  options: WidgetOption[]
  /** Data keys the widget needs once its options are resolved. */
  sources: (options: WidgetOptionValues) => string[]
}

/* -------------------------------------------------------------------------- */
/* Shared option builders                                                      */
/* -------------------------------------------------------------------------- */

const WINDOW_CHOICES = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
]

function windowOption(defaultDays = 7): WidgetOption {
  return {
    key: "days",
    label: "Time range",
    type: "select",
    choices: WINDOW_CHOICES,
    default: String(defaultDays),
  }
}

function chartStyleOption(): WidgetOption {
  return {
    key: "style",
    label: "Chart style",
    type: "select",
    choices: [
      { value: "area", label: "Area" },
      { value: "line", label: "Line" },
      { value: "bar", label: "Bar" },
    ],
    default: "area",
  }
}

function limitOption(label: string, defaultValue: number): WidgetOption {
  return {
    key: "limit",
    label,
    type: "number",
    min: 3,
    max: 25,
    default: defaultValue,
  }
}

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                   */
/* -------------------------------------------------------------------------- */

export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  /* ---------------------------------- Revenue ---------------------------- */
  {
    type: "kpi-stat",
    title: "Subscription metric",
    description:
      "A single RevenueCat number such as MRR, ARR, or active subscriptions.",
    category: "Revenue",
    permission: "kpis",
    requires: "revenuecat",
    sizes: ["sm", "md"],
    defaultSize: "sm",
    options: [
      {
        key: "metric",
        label: "Metric",
        type: "select",
        choices: KPI_SUMMARY_METRICS.map((metric) => ({
          value: metric.key,
          label: metric.label,
        })),
        default: "mrr",
      },
      {
        key: "showHint",
        label: "Show the metric description",
        type: "boolean",
        default: true,
      },
    ],
    sources: () => ["kpi.overview"],
  },
  {
    type: "kpi-stat-group",
    title: "Subscription snapshot",
    description:
      "A row of related RevenueCat metrics: revenue, subscriptions, or customers.",
    category: "Revenue",
    permission: "kpis",
    requires: "revenuecat",
    sizes: ["md", "lg", "full"],
    defaultSize: "full",
    options: [
      {
        key: "group",
        label: "Group",
        type: "select",
        choices: [
          { value: "revenue", label: "Revenue (MRR, ARR, revenue, ARPU)" },
          {
            value: "subscriptions",
            label: "Subscriptions (active, trials, new, users)",
          },
        ],
        default: "revenue",
      },
    ],
    sources: () => ["kpi.overview"],
  },
  {
    type: "kpi-trend",
    title: "Subscription trend",
    description:
      "Time series for a RevenueCat chart such as revenue, MRR, or churn.",
    category: "Revenue",
    permission: "kpis",
    requires: "revenuecat",
    sizes: ["md", "lg", "full"],
    defaultSize: "full",
    options: [
      {
        key: "chart",
        label: "Chart",
        type: "select",
        choices: KPI_CHARTS.map((chart) => ({
          value: chart,
          label: KPI_CHART_LABELS[chart],
        })),
        default: "revenue",
      },
      windowOption(30),
      chartStyleOption(),
    ],
    sources: (options) => [
      `kpi.trend:${String(options.chart ?? "revenue")}:${Number(options.days ?? 30)}`,
    ],
  },
  {
    type: "kpi-metrics-table",
    title: "All RevenueCat metrics",
    description:
      "Every metric the connected project reports, with the period each covers.",
    category: "Revenue",
    permission: "kpis",
    requires: "revenuecat",
    sizes: ["md", "lg", "full"],
    defaultSize: "lg",
    options: [],
    sources: () => ["kpi.overview"],
  },

  /* --------------------------------- Analytics --------------------------- */
  {
    type: "analytics-stat",
    title: "Analytics metric",
    description: "Event volume, unique users, or today's events.",
    category: "Analytics",
    permission: "analytics",
    sizes: ["sm", "md"],
    defaultSize: "sm",
    options: [
      {
        key: "metric",
        label: "Metric",
        type: "select",
        choices: [
          { value: "totalEvents", label: "Total events" },
          { value: "uniqueUsers", label: "Unique users" },
          { value: "eventsToday", label: "Events today" },
        ],
        default: "totalEvents",
      },
      windowOption(7),
    ],
    sources: (options) => [`analytics.summary:${Number(options.days ?? 7)}`],
  },
  {
    type: "analytics-trend",
    title: "Analytics trend",
    description: "Daily events and unique users over your chosen window.",
    category: "Analytics",
    permission: "analytics",
    sizes: ["md", "lg", "full"],
    defaultSize: "full",
    options: [
      {
        key: "series",
        label: "Series",
        type: "select",
        choices: [
          { value: "both", label: "Events and users" },
          { value: "events", label: "Events only" },
          { value: "users", label: "Users only" },
        ],
        default: "both",
      },
      windowOption(30),
      chartStyleOption(),
    ],
    sources: (options) => [`analytics.trend:${Number(options.days ?? 30)}`],
  },
  {
    type: "analytics-top-events",
    title: "Top events",
    description: "The most frequent event names, with change against the prior window.",
    category: "Analytics",
    permission: "analytics",
    sizes: ["md", "lg"],
    defaultSize: "md",
    options: [windowOption(7), limitOption("Events to show", 8)],
    sources: (options) => [
      `analytics.topEvents:${Number(options.days ?? 7)}:${Number(options.limit ?? 8)}`,
    ],
  },

  /* ---------------------------------- Support ---------------------------- */
  {
    type: "reports-stat",
    title: "Open reports",
    description: "Count of unresolved reports, optionally for one type.",
    category: "Support",
    permission: "reports",
    sizes: ["sm", "md"],
    defaultSize: "sm",
    options: [
      {
        key: "type",
        label: "Type",
        type: "select",
        choices: [
          { value: "all", label: "All types" },
          { value: "bug", label: "Bugs" },
          { value: "suggestion", label: "Suggestions" },
          { value: "support", label: "Support" },
          { value: "report", label: "Reports" },
        ],
        default: "all",
      },
    ],
    sources: () => ["reports.counts"],
  },
  {
    type: "reports-breakdown",
    title: "Reports by type",
    description: "Open report volume split across bug, suggestion, support, and report.",
    category: "Support",
    permission: "reports",
    sizes: ["md", "lg"],
    defaultSize: "md",
    options: [],
    sources: () => ["reports.counts"],
  },
  {
    type: "reports-recent",
    title: "Recent reports",
    description: "The most recently updated open reports, linking into the inbox.",
    category: "Support",
    permission: "reports",
    sizes: ["md", "lg", "full"],
    defaultSize: "lg",
    options: [limitOption("Reports to show", 6)],
    sources: (options) => [`reports.recent:${Number(options.limit ?? 6)}`],
  },

  /* ----------------------------------- Tasks ----------------------------- */
  {
    type: "tasks-stat",
    title: "Ticket count",
    description: "How many tickets sit in one status, or across the whole board.",
    category: "Tasks",
    permission: "tasks",
    sizes: ["sm", "md"],
    defaultSize: "sm",
    options: [
      {
        key: "status",
        label: "Status",
        type: "select",
        choices: [
          { value: "all", label: "All tickets" },
          { value: "backlog", label: "Backlog" },
          { value: "todo", label: "Todo" },
          { value: "in_progress", label: "In progress" },
          { value: "done", label: "Done" },
        ],
        default: "in_progress",
      },
      {
        key: "mineOnly",
        label: "Only tickets assigned to me",
        type: "boolean",
        default: false,
      },
    ],
    sources: () => ["tasks.tickets"],
  },
  {
    type: "tasks-board",
    title: "Board summary",
    description: "Ticket counts per status, with urgent work called out.",
    category: "Tasks",
    permission: "tasks",
    sizes: ["md", "lg", "full"],
    defaultSize: "md",
    options: [
      {
        key: "mineOnly",
        label: "Only tickets assigned to me",
        type: "boolean",
        default: false,
      },
    ],
    sources: () => ["tasks.tickets"],
  },
  {
    type: "tasks-recent",
    title: "Recent tickets",
    description: "The most recently updated tickets on the board.",
    category: "Tasks",
    permission: "tasks",
    sizes: ["md", "lg", "full"],
    defaultSize: "lg",
    options: [
      limitOption("Tickets to show", 6),
      {
        key: "mineOnly",
        label: "Only tickets assigned to me",
        type: "boolean",
        default: false,
      },
    ],
    sources: () => ["tasks.tickets"],
  },

  /* ----------------------------------- Users ----------------------------- */
  {
    type: "app-users-stat",
    title: "App user metric",
    description: "Totals from the user records your app syncs into Stand.",
    category: "Users",
    permission: "users",
    sizes: ["sm", "md"],
    defaultSize: "sm",
    options: [
      {
        key: "metric",
        label: "Metric",
        type: "select",
        choices: [
          { value: "total", label: "Total users" },
          { value: "active", label: "Active" },
          { value: "trialing", label: "Trialing" },
          { value: "churned", label: "Churned" },
          { value: "paid", label: "On a paid plan" },
          { value: "newInWindow", label: "New in window" },
        ],
        default: "total",
      },
      windowOption(7),
    ],
    sources: (options) => [`appUsers.stats:${Number(options.days ?? 7)}`],
  },
  {
    type: "app-users-breakdown",
    title: "Users by plan",
    description: "How your synced users split across free, plus, and pro.",
    category: "Users",
    permission: "users",
    sizes: ["md", "lg"],
    defaultSize: "md",
    options: [windowOption(7)],
    sources: (options) => [`appUsers.stats:${Number(options.days ?? 7)}`],
  },
]

export const WIDGET_CATEGORIES: WidgetCategory[] = [
  "Revenue",
  "Analytics",
  "Support",
  "Tasks",
  "Users",
]

export function getWidgetDefinition(type: string) {
  return WIDGET_DEFINITIONS.find((definition) => definition.type === type)
}

/* -------------------------------------------------------------------------- */
/* Options                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Every widget also carries `size` and an optional `title` override. They are
 * appended here rather than repeated in each definition.
 */
export function widgetOptions(definition: WidgetDefinition): WidgetOption[] {
  return [
    ...definition.options,
    {
      key: "size",
      label: "Width",
      type: "select",
      choices: definition.sizes.map((size) => ({
        value: size,
        label: WIDGET_SIZE_LABELS[size],
      })),
      default: definition.defaultSize,
    },
    {
      key: "title",
      label: "Title",
      type: "text",
      maxLength: 60,
      default: "",
      help: "Leave empty to use the default title.",
    },
  ]
}

export function defaultWidgetOptions(
  definition: WidgetDefinition
): WidgetOptionValues {
  const values: WidgetOptionValues = {}

  for (const option of widgetOptions(definition)) {
    values[option.key] = option.default
  }

  return values
}

/** Fills in defaults for options a stored layout predates or omits. */
export function resolveWidgetOptions(
  definition: WidgetDefinition,
  stored: WidgetOptionValues
): WidgetOptionValues {
  const resolved = defaultWidgetOptions(definition)

  for (const option of widgetOptions(definition)) {
    const value = stored[option.key]

    if (value === undefined) {
      continue
    }

    if (option.type === "number" && typeof value === "number") {
      resolved[option.key] = Math.min(option.max, Math.max(option.min, value))
      continue
    }

    if (option.type === "boolean" && typeof value === "boolean") {
      resolved[option.key] = value
      continue
    }

    if (option.type === "text" && typeof value === "string") {
      resolved[option.key] = value.slice(0, option.maxLength)
      continue
    }

    if (
      option.type === "select" &&
      typeof value === "string" &&
      option.choices.some((choice) => choice.value === value)
    ) {
      resolved[option.key] = value
    }
  }

  return resolved
}

export function widgetSize(
  definition: WidgetDefinition,
  options: WidgetOptionValues
): WidgetSize {
  const size = options.size

  return typeof size === "string" &&
    definition.sizes.includes(size as WidgetSize)
    ? (size as WidgetSize)
    : definition.defaultSize
}

export function widgetTitle(
  definition: WidgetDefinition,
  options: WidgetOptionValues
) {
  const override = options.title

  return typeof override === "string" && override.trim()
    ? override.trim()
    : definition.title
}

export function optionLabel(
  definition: WidgetDefinition,
  key: string,
  options: WidgetOptionValues
) {
  const option = widgetOptions(definition).find((entry) => entry.key === key)

  if (option?.type !== "select") {
    return null
  }

  return (
    option.choices.find((choice) => choice.value === String(options[key]))
      ?.label ?? null
  )
}

/* -------------------------------------------------------------------------- */
/* Availability                                                                */
/* -------------------------------------------------------------------------- */

export type WidgetAvailability =
  | { available: true }
  | { available: false; reason: string }

export function widgetAvailability(
  definition: WidgetDefinition,
  context: {
    can: (permission: PanelPermissionId) => boolean
    connectedIntegrations: IntegrationProviderId[]
    integrationLabel: (id: IntegrationProviderId) => string
  }
): WidgetAvailability {
  if (!context.can(definition.permission)) {
    return {
      available: false,
      reason: `Needs access to the ${definition.permission} section`,
    }
  }

  if (
    definition.requires &&
    !context.connectedIntegrations.includes(definition.requires)
  ) {
    return {
      available: false,
      reason: `Connect ${context.integrationLabel(definition.requires)} in Settings → Integrations`,
    }
  }

  return { available: true }
}

/* -------------------------------------------------------------------------- */
/* Default layout                                                              */
/* -------------------------------------------------------------------------- */

/**
 * What a user sees before they have configured anything.
 *
 * Built from what they can actually reach, so a member with only the reports
 * section gets a support dashboard rather than a page of locked tiles.
 */
export function defaultLayout(context: {
  can: (permission: PanelPermissionId) => boolean
  connectedIntegrations: IntegrationProviderId[]
}): DashboardWidget[] {
  const widgets: DashboardWidget[] = []
  const add = (type: string, options: WidgetOptionValues = {}) => {
    const definition = getWidgetDefinition(type)

    if (!definition) {
      return
    }

    if (!context.can(definition.permission)) {
      return
    }

    if (
      definition.requires &&
      !context.connectedIntegrations.includes(definition.requires)
    ) {
      return
    }

    widgets.push({
      id: createWidgetId(type),
      type,
      options: { ...defaultWidgetOptions(definition), ...options },
    })
  }

  add("kpi-stat-group", { group: "revenue" })
  add("kpi-trend", { chart: "revenue", days: "30" })
  add("analytics-stat", { metric: "totalEvents" })
  add("reports-stat", { type: "all" })
  add("tasks-stat", { status: "in_progress" })
  add("app-users-stat", { metric: "total" })
  add("analytics-trend", { series: "both", days: "30" })
  add("reports-recent")

  return widgets
}

export function createWidgetId(type: string) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)

  return `${type}-${suffix}`
}
