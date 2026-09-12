import * as React from "react"
import { Link } from "react-router-dom"
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  CheckIcon,
  LayoutDashboardIcon,
  PlusIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
} from "lucide-react"

import { useAuth, useCurrentUser } from "@/components/auth-provider"
import { ConfigureWidgetDialog } from "@/components/dashboard/configure-widget-dialog"
import {
  WidgetBody,
  widgetSubtitle,
} from "@/components/dashboard/widget-body"
import {
  PaletteCard,
  PALETTE_ID_PREFIX,
  WidgetPalette,
  type PaletteDragData,
} from "@/components/dashboard/widget-palette"
import { WidgetShell } from "@/components/dashboard/widget-shell"
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
import {
  getWidgetDefinition,
  widgetAvailability,
  widgetSize,
  widgetTitle,
  WIDGET_DEFINITIONS,
  WIDGET_SIZE_CLASSES,
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
 * Edit mode opens a palette beside the board. New widgets are dragged from the
 * palette and dropped where they should live; existing tiles are dragged by
 * their grip to reorder. One DndContext covers both, and the drag's `data`
 * tells the handlers which of the two is happening.
 */

/** Droppable id for the slot after the last tile. */
const END_SLOT_ID = "dashboard:end"

type ActiveDrag =
  | { kind: "palette"; type: string }
  | { kind: "tile"; id: string }

function isPaletteId(id: string | number) {
  return String(id).startsWith(PALETTE_ID_PREFIX)
}

/**
 * Palette drags land wherever the pointer is, so they use pointer containment
 * and fall back to nearest centre when the pointer is in a gap. Tile drags use
 * nearest centre throughout, which is what the sortable strategy expects.
 */
const collisionDetection: CollisionDetection = (args) => {
  if (isPaletteId(args.active.id)) {
    const within = pointerWithin(args)
    return within.length > 0 ? within : closestCenter(args)
  }

  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (container) => container.id !== END_SLOT_ID
    ),
  })
}

export function DashboardPage() {
  const { can, canManageUsers } = useAuth()
  const currentUser = useCurrentUser()
  const { connected } = useIntegrations()
  const {
    status,
    error,
    widgets,
    isDefaultLayout,
    sources,
    saving,
    insertWidget,
    removeWidget,
    updateWidget,
    moveWidget,
    reorderWidgets,
    resetLayout,
    refreshData,
  } = useDashboard()

  const [editing, setEditing] = React.useState(false)
  const [configuring, setConfiguring] = React.useState<string | null>(null)
  const [active, setActive] = React.useState<ActiveDrag | null>(null)
  /** Tile a palette item is hovering; the new widget goes in front of it. */
  const [insertBefore, setInsertBefore] = React.useState<string | null>(null)

  const sensors = useSensors(
    // A little travel before a drag starts keeps clicks on tile controls clean.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

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

  const widgetIds = React.useMemo(
    () => widgets.map((widget) => widget.id),
    [widgets]
  )

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as PaletteDragData | undefined

    if (data?.kind === "palette") {
      setActive({ kind: "palette", type: data.type })
    } else {
      setActive({ kind: "tile", id: String(event.active.id) })
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    if (!isPaletteId(event.active.id)) {
      return
    }

    const overId = event.over ? String(event.over.id) : null
    setInsertBefore(overId && overId !== END_SLOT_ID ? overId : null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active: dragged, over } = event

    setActive(null)
    setInsertBefore(null)

    if (!over) {
      return
    }

    const data = dragged.data.current as PaletteDragData | undefined

    if (data?.kind === "palette") {
      const overId = String(over.id)
      const index =
        overId === END_SLOT_ID
          ? widgets.length
          : widgets.findIndex((widget) => widget.id === overId)

      insertWidget(data.type, index === -1 ? widgets.length : index)
      return
    }

    if (dragged.id !== over.id && over.id !== END_SLOT_ID) {
      reorderWidgets(String(dragged.id), String(over.id))
    }
  }

  const handleDragCancel = () => {
    setActive(null)
    setInsertBefore(null)
  }

  if (status === "loading") {
    return (
      <div className="@container/board grid gap-4 px-4 py-4 @xl/board:grid-cols-4 md:gap-6 md:py-6 lg:px-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-32 @xl/board:col-span-2 @5xl/board:col-span-1"
          />
        ))}
        <Skeleton className="h-72 @xl/board:col-span-4" />
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

  const activeWidget =
    active?.kind === "tile"
      ? (widgets.find((widget) => widget.id === active.id) ?? null)
      : null
  const activeDefinition =
    active?.kind === "palette"
      ? (getWidgetDefinition(active.type) ?? null)
      : null

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {editing
              ? "Drag widgets from the palette onto the board, and drag tiles by their grip to rearrange."
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
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <SlidersHorizontalIcon />
              Customise
            </Button>
          )}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          className={cn(
            "flex flex-col gap-4 px-4 lg:px-6",
            editing && "@4xl/main:flex-row @4xl/main:items-start"
          )}
        >
          <div className="@container/board min-w-0 flex-1">
            {widgets.length === 0 ? (
              editing ? (
                <EmptyDropZone anyWidgetAvailable={anyWidgetAvailable} />
              ) : (
                <EmptyDashboard
                  anyWidgetAvailable={anyWidgetAvailable}
                  canManageIntegrations={canManageUsers}
                  onAdd={() => setEditing(true)}
                />
              )
            ) : (
              <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 gap-4 @xl/board:grid-cols-4">
                  {widgets.map((widget, index) => (
                    <SortableTile
                      key={widget.id}
                      widget={widget}
                      editing={editing}
                      isFirst={index === 0}
                      isLast={index === widgets.length - 1}
                      dropTarget={insertBefore === widget.id}
                      currentUserId={currentUser.id}
                      sources={sources}
                      onConfigure={() => setConfiguring(widget.id)}
                      onRemove={() => removeWidget(widget.id)}
                      onMove={(direction) => moveWidget(widget.id, direction)}
                    />
                  ))}
                  {editing ? (
                    <EndSlot active={active?.kind === "palette"} />
                  ) : null}
                </div>
              </SortableContext>
            )}
          </div>

          {editing ? (
            <WidgetPalette
              onAdd={(type) => insertWidget(type, 0)}
              className="max-h-[70vh] @4xl/main:sticky @4xl/main:top-[calc(var(--header-height)+1rem)] @4xl/main:max-h-[calc(100vh-var(--header-height)-2rem)] @4xl/main:w-80 @4xl/main:shrink-0"
            />
          ) : null}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDefinition ? (
            <PaletteCard
              definition={activeDefinition}
              draggable
              className="border-primary/60 w-80 max-w-[calc(100vw-2rem)] cursor-grabbing shadow-lg"
            />
          ) : activeWidget ? (
            <TilePreview
              widget={activeWidget}
              currentUserId={currentUser.id}
              sources={sources}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

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

function SortableTile({
  widget,
  editing,
  isFirst,
  isLast,
  dropTarget,
  currentUserId,
  sources,
  onConfigure,
  onRemove,
  onMove,
}: TileProps & {
  editing: boolean
  isFirst: boolean
  isLast: boolean
  dropTarget: boolean
  onConfigure: () => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
}) {
  const definition = getWidgetDefinition(widget.type)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: widget.id,
    data: { kind: "tile" },
    disabled: !editing,
  })

  if (!definition) {
    return null
  }

  return (
    <WidgetShell
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      title={widgetTitle(definition, widget.options)}
      subtitle={widgetSubtitle(widget.type, widget.options)}
      editing={editing}
      dragging={isDragging}
      dropTarget={dropTarget}
      dragHandleProps={{ ...attributes, ...listeners }}
      onConfigure={onConfigure}
      onRemove={onRemove}
      onMove={onMove}
      canMoveUp={!isFirst}
      canMoveDown={!isLast}
      className={WIDGET_SIZE_CLASSES[widgetSize(definition, widget.options)]}
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

/** The tile drawn under the pointer while it is being moved. */
function TilePreview({ widget, currentUserId, sources }: TileProps) {
  const definition = getWidgetDefinition(widget.type)

  if (!definition) {
    return null
  }

  return (
    <WidgetShell
      title={widgetTitle(definition, widget.options)}
      subtitle={widgetSubtitle(widget.type, widget.options)}
      editing
      onConfigure={() => {}}
      onRemove={() => {}}
      onMove={() => {}}
      canMoveUp={false}
      canMoveDown={false}
      className="ring-primary/60 h-full cursor-grabbing shadow-xl ring-2"
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

/** Trailing drop slot so a palette item can be appended after the last tile. */
function EndSlot({ active }: { active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: END_SLOT_ID })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "text-muted-foreground flex min-h-24 items-center justify-center rounded-xl border border-dashed text-sm transition-colors @xl/board:col-span-4",
        active ? "border-primary/50 bg-primary/5" : "border-border/70",
        isOver && "border-primary bg-primary/10 text-foreground"
      )}
    >
      <PlusIcon className="mr-1.5 size-4" />
      {active ? "Drop here to add at the end" : "Drop a widget here"}
    </div>
  )
}

/** Shown in edit mode when the board is empty, so the first drag has a target. */
function EmptyDropZone({ anyWidgetAvailable }: { anyWidgetAvailable: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: END_SLOT_ID })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "text-muted-foreground flex min-h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm transition-colors",
        isOver && "border-primary bg-primary/10 text-foreground"
      )}
    >
      <LayoutDashboardIcon className="size-6" />
      {anyWidgetAvailable
        ? "Drag a widget from the palette onto the board."
        : "Widgets need either a section you have access to or a connected integration."}
    </div>
  )
}

function EmptyDashboard({
  anyWidgetAvailable,
  canManageIntegrations,
  onAdd,
}: {
  anyWidgetAvailable: boolean
  canManageIntegrations: boolean
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
            ? "Add widgets for the sections you work in. Each one reads live data from this deployment."
            : "There is nothing to show yet. Widgets need either a section you have access to or a connected integration."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button type="button" onClick={onAdd}>
          <PlusIcon />
          Add a widget
        </Button>
        {canManageIntegrations ? (
          <Button type="button" variant="outline" asChild>
            <Link to="/settings/integrations">Connect an integration</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
