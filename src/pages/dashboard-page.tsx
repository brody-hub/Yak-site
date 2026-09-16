import * as React from "react"
import { Link } from "react-router-dom"
import {
  GridLayout,
  useContainerWidth,
  verticalCompactor,
  type EventCallback,
  type Layout,
  type LayoutItem,
} from "react-grid-layout"
import {
  CheckIcon,
  LayoutDashboardIcon,
  PlusIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
} from "lucide-react"

import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

import { useAuth, useCurrentUser } from "@/components/auth-provider"
import { ConfigureWidgetDialog } from "@/components/dashboard/configure-widget-dialog"
import {
  WidgetBody,
  widgetSubtitle,
} from "@/components/dashboard/widget-body"
import {
  WidgetPalette,
  WIDGET_DRAG_MIME,
} from "@/components/dashboard/widget-palette"
import {
  WidgetShell,
  WIDGET_DRAG_HANDLE,
} from "@/components/dashboard/widget-shell"
import { useDashboard } from "@/components/dashboard-provider"
import { useIntegrations } from "@/components/integrations-provider"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  getWidgetDefinition,
  GRID_COLS,
  GRID_MARGIN,
  GRID_ROW_HEIGHT,
  toLayoutItem,
  widgetAvailability,
  widgetTitle,
  WIDGET_DEFINITIONS,
  type DashboardWidget,
} from "@/lib/dashboard"
import { getIntegrationLabel } from "@/lib/integrations"
import { cn } from "@/lib/utils"

/**
 * The dashboard.
 *
 * Everything on this page is real data: each tile reads from an API endpoint
 * that enforces the same section permission the widget declares. The layout is
 * per user and stored server side, so edit mode writes as you go rather than
 * asking anyone to remember to save.
 *
 * The board is a 12 column grid. Tiles cover a rectangle of cells, move by the
 * grip in their header, and resize from their bottom right corner within the
 * limits their widget definition allows. Moving a tile onto others pushes them
 * down, and everything settles upward into any gap that opens. New widgets are
 * dragged in from the palette and land on the cell under the pointer.
 *
 * Phones get the same tiles stacked in board order, read only: a 12 column grid
 * has no sensible meaning at 400px and finger dragging a chart is not a good
 * time.
 */

/** Id the board gives the placeholder while a palette item hovers over it. */
const DROPPING_ID = "__dropping__"

export function DashboardPage() {
  const { can, canManageUsers } = useAuth()
  const currentUser = useCurrentUser()
  const { connected } = useIntegrations()
  const isMobile = useIsMobile()
  const {
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
    refreshData,
  } = useDashboard()

  const [editing, setEditing] = React.useState(false)
  const [configuring, setConfiguring] = React.useState<string | null>(null)
  /** Widget type being dragged in from the palette, for the placeholder size. */
  const [dragType, setDragType] = React.useState<string | null>(null)

  const configuringWidget =
    widgets.find((widget) => widget.id === configuring) ?? null

  const anyWidgetAvailable = WIDGET_DEFINITIONS.some(
    (definition) =>
      widgetAvailability(definition, {
        can,
        connectedIntegrations: connected,
        integrationLabel: getIntegrationLabel,
      }).available
  )

  // Leaving edit mode on a phone would strand a half finished drag, so the
  // editing state simply never turns on there.
  const canEdit = !isMobile

  if (status === "loading") {
    return (
      <div className="grid gap-4 px-4 py-4 md:grid-cols-4 md:gap-6 md:py-6 lg:px-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
        <Skeleton className="h-72 md:col-span-4" />
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="px-4 py-4 md:py-6 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Could not load your dashboard</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {editing
              ? "Drag tiles by their grip, resize from the corner, and drag new widgets in from the palette."
              : isDefaultLayout
                ? "A starting layout built from the sections you can access. Customise it any time."
                : "Your saved layout."}
            {saving ? " Saving…" : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refreshData}
          >
            <RefreshCwIcon />
            Refresh
          </Button>
          {editing ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetLayout}
              >
                <RotateCcwIcon />
                Reset
              </Button>
              <Button type="button" size="sm" onClick={() => setEditing(false)}>
                <CheckIcon />
                Done
              </Button>
            </>
          ) : canEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <SlidersHorizontalIcon />
              Customise
            </Button>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-4 px-4 lg:px-6",
          editing && "@4xl/main:flex-row @4xl/main:items-start"
        )}
      >
        <div className="min-w-0 flex-1">
          {widgets.length === 0 && !editing ? (
            <EmptyDashboard
              anyWidgetAvailable={anyWidgetAvailable}
              canManageIntegrations={canManageUsers}
              canEdit={canEdit}
              onAdd={() => setEditing(true)}
            />
          ) : isMobile ? (
            <StackedBoard
              widgets={widgets}
              currentUserId={currentUser.id}
              sources={sources}
            />
          ) : (
            <Board
              widgets={widgets}
              editing={editing}
              dragType={dragType}
              currentUserId={currentUser.id}
              sources={sources}
              onConfigure={setConfiguring}
              onRemove={removeWidget}
              onAdd={addWidget}
              onLayout={applyLayout}
              onDropHandled={() => setDragType(null)}
            />
          )}

          {editing && widgets.length === 0 ? (
            <p className="text-muted-foreground -mt-40 flex h-40 items-center justify-center text-sm">
              {anyWidgetAvailable
                ? "Drag a widget from the palette onto the board."
                : "Widgets need either a section you have access to or a connected integration."}
            </p>
          ) : null}
        </div>

        {editing ? (
          <WidgetPalette
            onAdd={(type) => addWidget(type)}
            onDragTypeChange={setDragType}
            className="max-h-[70vh] @4xl/main:sticky @4xl/main:top-[calc(var(--header-height)+1rem)] @4xl/main:max-h-[calc(100vh-var(--header-height)-2rem)] @4xl/main:w-80 @4xl/main:shrink-0"
          />
        ) : null}
      </div>

      <ConfigureWidgetDialog
        widget={configuringWidget}
        definition={
          configuringWidget
            ? (getWidgetDefinition(configuringWidget.type) ?? null)
            : null
        }
        onOpenChange={(open) => {
          if (!open) {
            setConfiguring(null)
          }
        }}
        onSave={updateWidget}
      />
    </div>
  )
}

type TileProps = {
  widget: DashboardWidget
  currentUserId: string
  sources: ReturnType<typeof useDashboard>["sources"]
}

/**
 * The grid itself. Lives in its own component so the width hook's observer is
 * attached when this container mounts, which only happens once the layout has
 * loaded; measuring before first paint avoids a flash at the library default.
 */
function Board({
  widgets,
  editing,
  dragType,
  currentUserId,
  sources,
  onConfigure,
  onRemove,
  onAdd,
  onLayout,
  onDropHandled,
}: {
  widgets: DashboardWidget[]
  editing: boolean
  dragType: string | null
  currentUserId: string
  sources: ReturnType<typeof useDashboard>["sources"]
  onConfigure: (id: string) => void
  onRemove: (id: string) => void
  onAdd: (type: string, at: { x: number; y: number }) => void
  onLayout: (items: readonly LayoutItem[], persist: boolean) => void
  onDropHandled: () => void
}) {
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
  })

  const layout = React.useMemo<Layout>(
    () => widgets.map(toLayoutItem),
    [widgets]
  )

  const droppingDefinition = dragType ? getWidgetDefinition(dragType) : null
  const droppingItem = React.useMemo<LayoutItem | undefined>(
    () =>
      droppingDefinition
        ? {
            i: DROPPING_ID,
            x: 0,
            y: 0,
            w: droppingDefinition.grid.w,
            h: droppingDefinition.grid.h,
          }
        : undefined,
    [droppingDefinition]
  )

  const handleSettled: EventCallback = (nextLayout) => {
    onLayout(nextLayout, true)
  }

  const handleDrop = (
    _layout: Layout,
    item: LayoutItem | undefined,
    event: Event
  ) => {
    const transfer = (event as DragEvent).dataTransfer
    const type = transfer?.getData(WIDGET_DRAG_MIME) || dragType

    onDropHandled()

    if (!type || !item) {
      return
    }

    onAdd(type, { x: item.x, y: item.y })
  }

  return (
    <div ref={containerRef} className="min-w-0">
      {mounted ? (
        <GridLayout
          width={width}
          layout={layout}
          className={cn(
            editing &&
              widgets.length === 0 &&
              "min-h-64 rounded-xl border border-dashed"
          )}
          gridConfig={{
            cols: GRID_COLS,
            rowHeight: GRID_ROW_HEIGHT,
            margin: [GRID_MARGIN, GRID_MARGIN],
            containerPadding: [0, 0],
          }}
          dragConfig={{
            enabled: editing,
            handle: `.${WIDGET_DRAG_HANDLE}`,
            bounded: false,
          }}
          resizeConfig={{ enabled: editing, handles: ["se"] }}
          dropConfig={{
            enabled: editing,
            defaultItem: droppingItem
              ? { w: droppingItem.w, h: droppingItem.h }
              : { w: 3, h: 3 },
          }}
          droppingItem={droppingItem}
          compactor={verticalCompactor}
          onLayoutChange={(nextLayout) => onLayout(nextLayout, false)}
          onDragStop={handleSettled}
          onResizeStop={handleSettled}
          onDrop={handleDrop}
        >
          {widgets.map((widget) => (
            <div key={widget.id} className="h-full">
              <BoardTile
                widget={widget}
                editing={editing}
                currentUserId={currentUserId}
                sources={sources}
                onConfigure={() => onConfigure(widget.id)}
                onRemove={() => onRemove(widget.id)}
              />
            </div>
          ))}
        </GridLayout>
      ) : null}
    </div>
  )
}

function BoardTile({
  widget,
  editing,
  currentUserId,
  sources,
  onConfigure,
  onRemove,
}: TileProps & {
  editing: boolean
  onConfigure: () => void
  onRemove: () => void
}) {
  const definition = getWidgetDefinition(widget.type)

  if (!definition) {
    return null
  }

  return (
    <WidgetShell
      title={widgetTitle(definition, widget.options)}
      subtitle={widgetSubtitle(widget.type, widget.options)}
      editing={editing}
      onConfigure={onConfigure}
      onRemove={onRemove}
    >
      <WidgetBody
        type={widget.type}
        options={widget.options}
        sources={sources}
        currentUserId={currentUserId}
      />
    </WidgetShell>
  )
}

/** Phone rendering: the same tiles, one per row, in the board's reading order. */
function StackedBoard({
  widgets,
  currentUserId,
  sources,
}: {
  widgets: DashboardWidget[]
} & Omit<TileProps, "widget">) {
  const ordered = [...widgets].sort((a, b) => {
    const la = a.layout ?? { x: 0, y: 0 }
    const lb = b.layout ?? { x: 0, y: 0 }
    return la.y - lb.y || la.x - lb.x
  })

  return (
    <div className="flex flex-col gap-4">
      {ordered.map((widget) => {
        const definition = getWidgetDefinition(widget.type)
        const rows = widget.layout?.h ?? definition?.grid.h ?? 3
        // Charts and lists keep the height they have on the board, and it has
        // to be a fixed height for a chart filling its tile to resolve. Stat
        // tiles size to their content.
        const height =
          rows >= 4 ? rows * GRID_ROW_HEIGHT + (rows - 1) * GRID_MARGIN : undefined

        return (
          <div key={widget.id} style={{ height }}>
            <BoardTile
              widget={widget}
              editing={false}
              currentUserId={currentUserId}
              sources={sources}
              onConfigure={() => {}}
              onRemove={() => {}}
            />
          </div>
        )
      })}
    </div>
  )
}

function EmptyDashboard({
  anyWidgetAvailable,
  canManageIntegrations,
  canEdit,
  onAdd,
}: {
  anyWidgetAvailable: boolean
  canManageIntegrations: boolean
  canEdit: boolean
  onAdd: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutDashboardIcon className="size-4" />
          Your dashboard is empty
        </CardTitle>
        <CardDescription>
          {anyWidgetAvailable
            ? canEdit
              ? "Add widgets for the sections you work in. Each one reads live data from this deployment."
              : "Open this page on a larger screen to add widgets."
            : "There is nothing to show yet. Widgets need either a section you have access to or a connected integration."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {canEdit ? (
          <Button type="button" onClick={onAdd}>
            <PlusIcon />
            Add a widget
          </Button>
        ) : null}
        {canManageIntegrations ? (
          <Button type="button" variant="outline" asChild>
            <Link to="/settings/integrations">Connect an integration</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
