/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Link } from "react-router-dom"
import { useDraggable } from "@dnd-kit/core"
import { GripVerticalIcon, LockIcon, PlusIcon, SearchIcon } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { useIntegrations } from "@/components/integrations-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  widgetAvailability,
  WIDGET_CATEGORIES,
  WIDGET_DEFINITIONS,
  type WidgetAvailability,
  type WidgetDefinition,
} from "@/lib/dashboard"
import { getIntegrationLabel } from "@/lib/integrations"
import { cn } from "@/lib/utils"

/**
 * The widget palette shown beside the board in edit mode.
 *
 * Every widget in the catalogue is listed so people can see what the dashboard
 * is capable of. Available ones are dragged straight onto the board, dropping
 * exactly where the pointer lands; the Add button is the keyboard route and
 * puts the tile at the top so it is visible immediately. Anything unavailable
 * is shown locked with the specific reason.
 */

/** Prefix on draggable ids so the board can tell a palette drag from a tile drag. */
export const PALETTE_ID_PREFIX = "palette:"

export type PaletteDragData = { kind: "palette"; type: string }

export function paletteDragId(type: string) {
  return `${PALETTE_ID_PREFIX}${type}`
}

export function WidgetPalette({
  onAdd,
  className,
}: {
  onAdd: (type: string) => void
  className?: string
}) {
  const { can, canManageUsers } = useAuth()
  const { connected } = useIntegrations()
  const [query, setQuery] = React.useState("")

  const availability = React.useMemo(() => {
    const entries = new Map<string, WidgetAvailability>()

    for (const definition of WIDGET_DEFINITIONS) {
      entries.set(
        definition.type,
        widgetAvailability(definition, {
          can,
          connectedIntegrations: connected,
          integrationLabel: getIntegrationLabel,
        })
      )
    }

    return entries
  }, [can, connected])

  const needle = query.trim().toLowerCase()

  const sections = WIDGET_CATEGORIES.map((category) => ({
    category,
    definitions: WIDGET_DEFINITIONS.filter(
      (definition) =>
        definition.category === category &&
        (!needle ||
          definition.title.toLowerCase().includes(needle) ||
          definition.description.toLowerCase().includes(needle))
    ),
  })).filter((section) => section.definitions.length > 0)

  return (
    <aside
      aria-label="Widget palette"
      className={cn(
        "bg-card text-card-foreground flex flex-col rounded-xl border shadow-sm",
        className
      )}
    >
      <div className="space-y-3 border-b p-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Widgets</h2>
          <p className="text-muted-foreground text-xs">
            Drag a widget onto the board, or press Add to place it at the top.
          </p>
        </div>
        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search widgets"
            aria-label="Search widgets"
            className="h-9 pl-8"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {sections.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No widgets match “{query.trim()}”.
          </p>
        ) : (
          sections.map((section) => (
            <section key={section.category} className="space-y-2">
              <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {section.category}
              </h3>
              <div className="grid gap-2">
                {section.definitions.map((definition) => {
                  const state = availability.get(definition.type) ?? {
                    available: false,
                    reason: "Unavailable",
                  }

                  return state.available ? (
                    <DraggablePaletteItem
                      key={definition.type}
                      definition={definition}
                      onAdd={() => onAdd(definition.type)}
                    />
                  ) : (
                    <PaletteCard
                      key={definition.type}
                      definition={definition}
                      locked
                      reason={state.reason}
                      action={
                        definition.requires && canManageUsers ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            asChild
                          >
                            <Link to="/settings/integrations">Connect</Link>
                          </Button>
                        ) : null
                      }
                    />
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </aside>
  )
}

function DraggablePaletteItem({
  definition,
  onAdd,
}: {
  definition: WidgetDefinition
  onAdd: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: paletteDragId(definition.type),
    data: { kind: "palette", type: definition.type } satisfies PaletteDragData,
  })

  return (
    <PaletteCard
      ref={setNodeRef}
      definition={definition}
      draggable
      dragging={isDragging}
      handleProps={{ ...attributes, ...listeners }}
      action={
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={onAdd}
        >
          <PlusIcon className="size-3.5" />
          Add
        </Button>
      }
    />
  )
}

/**
 * One row in the palette. Also rendered inside the drag overlay, which is why
 * it is a plain presentational component with no hook of its own.
 */
export const PaletteCard = React.forwardRef<
  HTMLDivElement,
  {
    definition: WidgetDefinition
    draggable?: boolean
    dragging?: boolean
    locked?: boolean
    reason?: string
    handleProps?: React.HTMLAttributes<HTMLDivElement>
    action?: React.ReactNode
    className?: string
  }
>(function PaletteCard(
  {
    definition,
    draggable,
    dragging,
    locked,
    reason,
    handleProps,
    action,
    className,
  },
  ref
) {
  return (
    <div
      ref={ref}
      {...(draggable ? handleProps : {})}
      className={cn(
        "bg-background flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-[box-shadow,opacity,border-color] select-none",
        draggable &&
          "hover:border-primary/50 focus-visible:ring-ring cursor-grab touch-none outline-none hover:shadow-sm focus-visible:ring-2 active:cursor-grabbing",
        dragging && "opacity-40",
        locked && "bg-muted/40 text-muted-foreground",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center",
          locked ? "text-muted-foreground/60" : "text-muted-foreground"
        )}
      >
        {locked ? (
          <LockIcon className="size-3.5" />
        ) : (
          <GripVerticalIcon className="size-4" />
        )}
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="flex flex-wrap items-center gap-1.5 text-sm leading-tight font-medium">
          {definition.title}
          {definition.requires ? (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {getIntegrationLabel(definition.requires)}
            </Badge>
          ) : null}
        </p>
        <p className="text-muted-foreground line-clamp-2 text-xs">
          {locked && reason ? reason : definition.description}
        </p>
      </div>
      {action ? (
        <div
          className="shrink-0"
          // Stop the pointer from starting a drag when the button is pressed.
          onPointerDown={(event) => event.stopPropagation()}
        >
          {action}
        </div>
      ) : null}
    </div>
  )
})
