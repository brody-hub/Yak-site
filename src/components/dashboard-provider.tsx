/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { useIntegrations } from "@/components/integrations-provider"
import { ApiError, dashboardApi } from "@/lib/api"
import {
  createWidgetId,
  defaultLayout,
  defaultWidgetOptions,
  getWidgetDefinition,
  resolveWidgetOptions,
  type DashboardWidget,
  type WidgetOptionValues,
} from "@/lib/dashboard"
import {
  fetchSource,
  type SourceKey,
  type SourceStates,
} from "@/lib/dashboard-sources"

/**
 * Dashboard layout and data.
 *
 * The layout is per user and persisted server side; every mutation writes
 * immediately so a tile added on a laptop is there on a phone. Widget data is
 * fetched by source key, deduplicated across tiles, and refetched only when the
 * set of keys changes — so reordering tiles costs nothing, while retuning a
 * tile's time range fetches exactly the one new window.
 */

type DashboardState = {
  status: "loading" | "ready" | "error"
  error: string | null
  widgets: DashboardWidget[]
  /** True until the user has saved a layout of their own. */
  isDefaultLayout: boolean
  sources: SourceStates
  saving: boolean
  /** Appends a widget. Prefer `insertWidget` when the user chose a spot. */
  addWidget: (type: string, options?: WidgetOptionValues) => void
  /** Adds a widget at a position in the layout; the index is clamped. */
  insertWidget: (type: string, index: number, options?: WidgetOptionValues) => void
  removeWidget: (id: string) => void
  updateWidget: (id: string, options: WidgetOptionValues) => void
  moveWidget: (id: string, direction: -1 | 1) => void
  /** Drops the widget `id` into the slot currently held by `overId`. */
  reorderWidgets: (id: string, overId: string) => void
  resetLayout: () => void
  clearLayout: () => void
  refreshData: () => void
}

const DashboardContext = React.createContext<DashboardState | undefined>(
  undefined
)

/** Drops widget types that no longer exist and backfills missing options. */
function normalizeWidgets(widgets: DashboardWidget[]): DashboardWidget[] {
  return widgets.flatMap((widget) => {
    const definition = getWidgetDefinition(widget.type)

    if (!definition) {
      return []
    }

    return [
      {
        id: widget.id,
        type: widget.type,
        options: resolveWidgetOptions(definition, widget.options ?? {}),
      },
    ]
  })
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { can } = useAuth()
  const { status: integrationsStatus, connected } = useIntegrations()

  const [status, setStatus] = React.useState<DashboardState["status"]>("loading")
  const [error, setError] = React.useState<string | null>(null)
  const [widgets, setWidgets] = React.useState<DashboardWidget[]>([])
  const [isDefaultLayout, setIsDefaultLayout] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [sources, setSources] = React.useState<SourceStates>({})
  const [dataNonce, setDataNonce] = React.useState(0)

  // The default layout depends on which integrations are live, so the layout is
  // only built once integration state has settled.
  const integrationsReady = integrationsStatus !== "loading"

  React.useEffect(() => {
    if (!integrationsReady) {
      return
    }

    let cancelled = false

    const load = async () => {
      try {
        const layout = await dashboardApi.layout()

        if (cancelled) {
          return
        }

        if (layout.widgets === null) {
          setWidgets(defaultLayout({ can, connectedIntegrations: connected }))
          setIsDefaultLayout(true)
        } else {
          setWidgets(normalizeWidgets(layout.widgets))
          setIsDefaultLayout(false)
        }

        setError(null)
        setStatus("ready")
      } catch (err) {
        if (cancelled) {
          return
        }

        setError(
          err instanceof ApiError ? err.message : "Could not load your dashboard"
        )
        setStatus("error")
      }
    }

    void load()

    return () => {
      cancelled = true
    }
    // `can` and `connected` only shape the first-run default; refetching the
    // layout when they change would discard unsaved reordering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrationsReady])

  const persist = React.useCallback(async (next: DashboardWidget[]) => {
    setSaving(true)

    try {
      await dashboardApi.saveLayout(next)
      setIsDefaultLayout(false)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not save your dashboard"
      )
    } finally {
      setSaving(false)
    }
  }, [])

  /** Applies a layout change optimistically, then writes it. */
  const commit = React.useCallback(
    (update: (current: DashboardWidget[]) => DashboardWidget[]) => {
      setWidgets((current) => {
        const next = update(current)
        void persist(next)
        return next
      })
    },
    [persist]
  )

  const insertWidget = React.useCallback(
    (type: string, index: number, options: WidgetOptionValues = {}) => {
      const definition = getWidgetDefinition(type)

      if (!definition) {
        return
      }

      commit((current) => {
        const at = Math.max(0, Math.min(index, current.length))
        const next = [...current]

        next.splice(at, 0, {
          id: createWidgetId(type),
          type,
          options: { ...defaultWidgetOptions(definition), ...options },
        })

        return next
      })
    },
    [commit]
  )

  const addWidget = React.useCallback(
    (type: string, options: WidgetOptionValues = {}) => {
      insertWidget(type, Number.MAX_SAFE_INTEGER, options)
    },
    [insertWidget]
  )

  const reorderWidgets = React.useCallback(
    (id: string, overId: string) => {
      commit((current) => {
        const from = current.findIndex((widget) => widget.id === id)
        const to = current.findIndex((widget) => widget.id === overId)

        if (from === -1 || to === -1 || from === to) {
          return current
        }

        const next = [...current]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved as DashboardWidget)

        return next
      })
    },
    [commit]
  )

  const removeWidget = React.useCallback(
    (id: string) => {
      commit((current) => current.filter((widget) => widget.id !== id))
    },
    [commit]
  )

  const updateWidget = React.useCallback(
    (id: string, options: WidgetOptionValues) => {
      commit((current) =>
        current.map((widget) => {
          if (widget.id !== id) {
            return widget
          }

          const definition = getWidgetDefinition(widget.type)

          return {
            ...widget,
            options: definition
              ? resolveWidgetOptions(definition, options)
              : options,
          }
        })
      )
    },
    [commit]
  )

  const moveWidget = React.useCallback(
    (id: string, direction: -1 | 1) => {
      commit((current) => {
        const index = current.findIndex((widget) => widget.id === id)
        const target = index + direction

        if (index === -1 || target < 0 || target >= current.length) {
          return current
        }

        const next = [...current]
        const [moved] = next.splice(index, 1)
        next.splice(target, 0, moved as DashboardWidget)

        return next
      })
    },
    [commit]
  )

  const resetLayout = React.useCallback(() => {
    commit(() => defaultLayout({ can, connectedIntegrations: connected }))
  }, [commit, can, connected])

  const clearLayout = React.useCallback(() => {
    commit(() => [])
  }, [commit])

  /* ------------------------------ Widget data ---------------------------- */

  const sourceKeys = React.useMemo(() => {
    const keys = new Set<SourceKey>()

    for (const widget of widgets) {
      const definition = getWidgetDefinition(widget.type)

      if (!definition) {
        continue
      }

      for (const key of definition.sources(widget.options)) {
        keys.add(key)
      }
    }

    return [...keys].sort()
  }, [widgets])

  // Joined so the effect re-runs on a change of contents rather than identity.
  const sourceSignature = sourceKeys.join("|")

  React.useEffect(() => {
    if (status !== "ready") {
      return
    }

    let cancelled = false
    const keys = sourceSignature ? sourceSignature.split("|") : []

    setSources((current) => {
      const next: SourceStates = {}

      for (const key of keys) {
        // Keep whatever is already loaded so retuning one tile does not blank
        // out the rest of the dashboard.
        next[key] = dataNonce > 0 ? { status: "loading" } : current[key] ?? {
          status: "loading",
        }
      }

      return next
    })

    for (const key of keys) {
      void fetchSource(key).then((state) => {
        if (!cancelled) {
          setSources((current) => ({ ...current, [key]: state }))
        }
      })
    }

    return () => {
      cancelled = true
    }
  }, [sourceSignature, status, dataNonce])

  const refreshData = React.useCallback(() => {
    setDataNonce((current) => current + 1)
  }, [])

  const value = React.useMemo<DashboardState>(
    () => ({
      status,
      error,
      widgets,
      isDefaultLayout,
      sources,
      saving,
      addWidget,
      insertWidget,
      removeWidget,
      updateWidget,
      moveWidget,
      reorderWidgets,
      resetLayout,
      clearLayout,
      refreshData,
    }),
    [
      status,
      error,
      widgets,
      isDefaultLayout,
      sources,
      saving,
      addWidget,
      insertWidget,
      removeWidget,
      updateWidget,
      moveWidget,
      reorderWidgets,
      resetLayout,
      clearLayout,
      refreshData,
    ]
  )

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = React.useContext(DashboardContext)

  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider")
  }

  return context
}
