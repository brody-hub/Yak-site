/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { useIntegrations } from "@/components/integrations-provider"
import { ApiError, dashboardApi } from "@/lib/api"
import {
  applyLayoutItems,
  clampLayout,
  compactWidgets,
  createWidgetId,
  defaultLayout,
  defaultWidgetOptions,
  findFreeSlot,
  getWidgetDefinition,
  layoutsDiffer,
  placeWidgets,
  resolveWidgetOptions,
  type DashboardWidget,
  type WidgetLayout,
  type WidgetOptionValues,
} from "@/lib/dashboard"
import type { LayoutItem } from "react-grid-layout"
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
  /** Adds a widget in the first free slot, or at `at` when the user dropped it somewhere. */
  addWidget: (
    type: string,
    at?: Pick<WidgetLayout, "x" | "y">,
    options?: WidgetOptionValues
  ) => void
  removeWidget: (id: string) => void
  updateWidget: (id: string, options: WidgetOptionValues) => void
  /**
   * Takes positions back from the board. `persist` is true after a drag or
   * resize the user finished; false when the board merely compacted what it
   * was given, which should not count as the user saving a layout.
   */
  applyLayout: (items: readonly LayoutItem[], persist: boolean) => void
  resetLayout: () => void
  clearLayout: () => void
  refreshData: () => void
}

const DashboardContext = React.createContext<DashboardState | undefined>(
  undefined
)

/**
 * Drops widget types that no longer exist, backfills missing options, and
 * gives every tile a grid position. Positions are assigned before options are
 * resolved because pre-grid layouts carry their width in `options.size`.
 */
function normalizeWidgets(widgets: DashboardWidget[]): DashboardWidget[] {
  return placeWidgets(widgets).map((widget) => {
    const definition = getWidgetDefinition(widget.type)

    return {
      id: widget.id,
      type: widget.type,
      layout: widget.layout,
      options: definition
        ? resolveWidgetOptions(definition, widget.options ?? {})
        : widget.options,
    }
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

  const addWidget = React.useCallback(
    (
      type: string,
      at?: Pick<WidgetLayout, "x" | "y">,
      options: WidgetOptionValues = {}
    ) => {
      const definition = getWidgetDefinition(type)

      if (!definition) {
        return
      }

      commit((current) => {
        const taken = current.flatMap((widget) =>
          widget.layout ? [widget.layout] : []
        )
        const size = clampLayout(definition.grid, {})
        const slot = at
          ? clampLayout(definition.grid, { ...size, x: at.x, y: at.y })
          : { ...size, ...findFreeSlot(taken, size.w, size.h) }

        return compactWidgets([
          ...current,
          {
            id: createWidgetId(type),
            type,
            options: { ...defaultWidgetOptions(definition), ...options },
            layout: slot,
          },
        ])
      })
    },
    [commit]
  )

  const applyLayout = React.useCallback(
    (items: readonly LayoutItem[], persist: boolean) => {
      if (persist) {
        commit((current) => applyLayoutItems(current, items))
        return
      }

      setWidgets((current) =>
        layoutsDiffer(current, items) ? applyLayoutItems(current, items) : current
      )
    },
    [commit]
  )

  const removeWidget = React.useCallback(
    (id: string) => {
      commit((current) =>
        compactWidgets(current.filter((widget) => widget.id !== id))
      )
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
      removeWidget,
      updateWidget,
      applyLayout,
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
      removeWidget,
      updateWidget,
      applyLayout,
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
