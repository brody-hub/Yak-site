import { verticalCompactor, type LayoutItem } from "react-grid-layout"

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

/* -------------------------------------------------------------------------- */
/* Grid                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The board is a 12 column grid. A tile occupies a rectangle of cells, moves by
 * its grip, and resizes from its corner within the limits its definition sets.
 * Rows are fixed height so a tile's `h` maps to pixels the same way for every
 * user: `h * GRID_ROW_HEIGHT + (h - 1) * GRID_MARGIN`.
 */
export const GRID_COLS = 12
export const GRID_ROW_HEIGHT = 48
export const GRID_MARGIN = 16

/** Where a tile sits and how many cells it covers. */
export type WidgetLayout = { x: number; y: number; w: number; h: number }

/** Size a widget starts at and the range it may be resized within. */
export type WidgetGrid = {
  w: number
  h: number
  minW: number
  minH: number
  maxW: number
  maxH: number
}

const GRID_PRESETS = {
  /** One number with a caption. */
  stat: { w: 3, h: 3, minW: 2, minH: 3, maxW: 6, maxH: 4 },
  /** A row of numbers. */
  statGroup: { w: 12, h: 3, minW: 6, minH: 3, maxW: 12, maxH: 4 },
  /** A time series; grows to fill whatever it is given. */
  chart: { w: 6, h: 6, minW: 4, minH: 4, maxW: 12, maxH: 12 },
  /** Scrolling rows. */
  list: { w: 6, h: 6, minW: 3, minH: 4, maxW: 12, maxH: 16 },
  /** A longer table. */
  table: { w: 6, h: 8, minW: 4, minH: 4, maxW: 12, maxH: 16 },
} satisfies Record<string, WidgetGrid>

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
  /** Absent only on layouts saved before the grid; `placeWidgets` fills it. */
  layout?: WidgetLayout
}

export type WidgetCategory =
  | "Revenue"
  | "Analytic Events"
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
  /** Starting footprint and resize limits on the board. */
  grid: WidgetGrid
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
    grid: GRID_PRESETS.stat,
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
    grid: GRID_PRESETS.statGroup,
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
    grid: GRID_PRESETS.chart,
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
    grid: GRID_PRESETS.table,
    options: [],
    sources: () => ["kpi.overview"],
  },

  /* ------------------------------ Analytic Events ------------------------ */
  {
    type: "analytics-stat",
    title: "Event metric",
    description: "Event volume, unique users, or today's events.",
    category: "Analytic Events",
    permission: "analytics",
    grid: GRID_PRESETS.stat,
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
    title: "Event trend",
    description: "Daily events and unique users over your chosen window.",
    category: "Analytic Events",
    permission: "analytics",
    grid: GRID_PRESETS.chart,
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
    category: "Analytic Events",
    permission: "analytics",
    grid: GRID_PRESETS.list,
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
    grid: GRID_PRESETS.stat,
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
    grid: GRID_PRESETS.list,
    options: [],
    sources: () => ["reports.counts"],
  },
  {
    type: "reports-recent",
    title: "Recent reports",
    description: "The most recently updated open reports, linking into the inbox.",
    category: "Support",
    permission: "reports",
    grid: GRID_PRESETS.list,
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
    grid: GRID_PRESETS.stat,
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
    grid: GRID_PRESETS.list,
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
    grid: GRID_PRESETS.list,
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
    grid: GRID_PRESETS.stat,
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
    grid: GRID_PRESETS.list,
    options: [windowOption(7)],
    sources: (options) => [`appUsers.stats:${Number(options.days ?? 7)}`],
  },
]

export const WIDGET_CATEGORIES: WidgetCategory[] = [
  "Revenue",
  "Analytic Events",
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
 * Every widget also carries an optional `title` override. It is appended here
 * rather than repeated in each definition. Size is not an option: tiles are
 * resized on the board itself.
 */
export function widgetOptions(definition: WidgetDefinition): WidgetOption[] {
  return [
    ...definition.options,
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

/* -------------------------------------------------------------------------- */
/* Layout                                                                      */
/* -------------------------------------------------------------------------- */

/** Keeps a rectangle inside the grid and within the widget's resize limits. */
export function clampLayout(
  grid: WidgetGrid,
  layout: Partial<WidgetLayout>
): WidgetLayout {
  const w = Math.min(
    GRID_COLS,
    grid.maxW,
    Math.max(grid.minW, Math.round(layout.w ?? grid.w))
  )
  const h = Math.min(grid.maxH, Math.max(grid.minH, Math.round(layout.h ?? grid.h)))
  const x = Math.min(GRID_COLS - w, Math.max(0, Math.round(layout.x ?? 0)))
  const y = Math.max(0, Math.round(layout.y ?? 0))

  return { x, y, w, h }
}

function overlaps(a: WidgetLayout, b: WidgetLayout) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

/** First free rectangle of the given size, scanning left to right, top down. */
export function findFreeSlot(
  taken: WidgetLayout[],
  w: number,
  h: number
): { x: number; y: number } {
  const bottom = taken.reduce((max, item) => Math.max(max, item.y + item.h), 0)

  for (let y = 0; y <= bottom; y += 1) {
    for (let x = 0; x + w <= GRID_COLS; x += 1) {
      const candidate = { x, y, w, h }

      if (!taken.some((item) => overlaps(item, candidate))) {
        return { x, y }
      }
    }
  }

  return { x: 0, y: bottom }
}

/**
 * Column span a pre-grid layout stored as `options.size`, so upgrading users
 * keep roughly the board they had.
 */
const LEGACY_SIZE_COLUMNS: Record<string, number> = {
  sm: 3,
  md: 6,
  lg: 9,
  full: 12,
}

/**
 * Gives every widget a valid rectangle. Existing rectangles are clamped to the
 * widget's limits; widgets without one are placed in the first free slot, in
 * order, after everything that already has a position.
 */
export function placeWidgets(widgets: DashboardWidget[]): DashboardWidget[] {
  const placed: DashboardWidget[] = []
  const pending: DashboardWidget[] = []

  for (const widget of widgets) {
    const definition = getWidgetDefinition(widget.type)

    if (!definition) {
      continue
    }

    if (widget.layout) {
      placed.push({
        ...widget,
        layout: clampLayout(definition.grid, widget.layout),
      })
    } else {
      pending.push(widget)
    }
  }

  const taken = placed.map((widget) => widget.layout as WidgetLayout)

  for (const widget of pending) {
    const definition = getWidgetDefinition(widget.type) as WidgetDefinition
    const legacy = LEGACY_SIZE_COLUMNS[String(widget.options.size ?? "")]
    const size = clampLayout(definition.grid, {
      w: legacy ?? definition.grid.w,
      h: definition.grid.h,
    })
    const slot = findFreeSlot(taken, size.w, size.h)
    const layout = { ...slot, w: size.w, h: size.h }

    taken.push(layout)
    placed.push({ ...widget, layout })
  }

  return compactWidgets(placed)
}

/** The board's own layout item for a widget, with its resize limits attached. */
export function toLayoutItem(widget: DashboardWidget): LayoutItem {
  const definition = getWidgetDefinition(widget.type)
  const grid = definition?.grid ?? GRID_PRESETS.stat
  const layout = widget.layout ?? clampLayout(grid, {})

  return {
    i: widget.id,
    ...layout,
    minW: grid.minW,
    minH: grid.minH,
    maxW: Math.min(GRID_COLS, grid.maxW),
    maxH: grid.maxH,
    isResizable: grid.minW !== grid.maxW || grid.minH !== grid.maxH,
  }
}

/**
 * Pulls every tile up as far as it will go, the same way the board does while
 * dragging, so what is saved is exactly what is shown.
 */
export function compactWidgets(widgets: DashboardWidget[]): DashboardWidget[] {
  const compacted = verticalCompactor.compact(
    widgets.map(toLayoutItem),
    GRID_COLS
  )
  const byId = new Map(compacted.map((item) => [item.i, item]))

  return widgets.map((widget) => {
    const item = byId.get(widget.id)

    return item
      ? { ...widget, layout: { x: item.x, y: item.y, w: item.w, h: item.h } }
      : widget
  })
}

/** Writes positions from the board back onto the widgets that own them. */
export function applyLayoutItems(
  widgets: DashboardWidget[],
  items: readonly LayoutItem[]
): DashboardWidget[] {
  const byId = new Map(items.map((item) => [item.i, item]))

  return widgets.map((widget) => {
    const item = byId.get(widget.id)

    return item
      ? { ...widget, layout: { x: item.x, y: item.y, w: item.w, h: item.h } }
      : widget
  })
}

/** True when any tile would move or change size. */
export function layoutsDiffer(
  widgets: DashboardWidget[],
  items: readonly LayoutItem[]
) {
  const byId = new Map(items.map((item) => [item.i, item]))

  return widgets.some((widget) => {
    const item = byId.get(widget.id)
    const layout = widget.layout

    return (
      !item ||
      !layout ||
      item.x !== layout.x ||
      item.y !== layout.y ||
      item.w !== layout.w ||
      item.h !== layout.h
    )
  })
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
  // Graphs first: two per row so the trends read side by side.
  add("kpi-trend", { chart: "revenue", days: "30" })
  add("kpi-trend", { chart: "mrr", days: "90" })
  add("kpi-trend", { chart: "active_subscriptions", days: "90" })
  add("kpi-trend", { chart: "new_customers", days: "30" })
  add("analytics-stat", { metric: "totalEvents" })
  add("reports-stat", { type: "all" })
  add("tasks-stat", { status: "in_progress" })
  add("app-users-stat", { metric: "total" })
  add("analytics-trend", { series: "both", days: "30" })
  add("reports-recent")

  return placeWidgets(widgets)
}

export function createWidgetId(type: string) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)

  return `${type}-${suffix}`
}
