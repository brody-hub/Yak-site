import * as React from "react"
import { Link } from "react-router-dom"
import {
  CheckIcon,
  LayoutDashboardIcon,
  PlusIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
} from "lucide-react"

import { useAuth, useCurrentUser } from "@/components/auth-provider"
import { AddWidgetDialog } from "@/components/dashboard/add-widget-dialog"
import { ConfigureWidgetDialog } from "@/components/dashboard/configure-widget-dialog"
import {
  WidgetBody,
  widgetSubtitle,
} from "@/components/dashboard/widget-body"
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

/**
 * The dashboard.
 *
 * Everything on this page is real data: each tile reads from an API endpoint
 * that enforces the same section permission the widget declares. The layout is
 * per user and stored server side, so edit mode writes as you go rather than
 * asking anyone to remember to save.
 */
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
    addWidget,
    removeWidget,
    updateWidget,
    moveWidget,
    resetLayout,
    refreshData,
  } = useDashboard()

  const [editing, setEditing] = React.useState(false)
  const [addOpen, setAddOpen] = React.useState(false)
  const [configuring, setConfiguring] = React.useState<string | null>(null)

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

  if (status === "loading") {
    return (
      <div className="grid gap-4 px-4 py-4 @xl/main:grid-cols-4 md:gap-6 md:py-6 lg:px-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 @xl/main:col-span-2 @5xl/main:col-span-1" />
        ))}
        <Skeleton className="h-72 @xl/main:col-span-4" />
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
            {isDefaultLayout
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
                variant="outline"
                size="sm"
                onClick={() => setAddOpen(true)}
              >
                <PlusIcon />
                Add widget
              </Button>
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

      {widgets.length === 0 ? (
        <div className="px-4 lg:px-6">
          <EmptyDashboard
            anyWidgetAvailable={anyWidgetAvailable}
            canManageIntegrations={canManageUsers}
            onAdd={() => {
              setEditing(true)
              setAddOpen(true)
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 px-4 @xl/main:grid-cols-4 lg:px-6">
          {widgets.map((widget, index) => (
            <WidgetTile
              key={widget.id}
              widget={widget}
              editing={editing}
              isFirst={index === 0}
              isLast={index === widgets.length - 1}
              currentUserId={currentUser.id}
              sources={sources}
              onConfigure={() => setConfiguring(widget.id)}
              onRemove={() => removeWidget(widget.id)}
              onMove={(direction) => moveWidget(widget.id, direction)}
            />
          ))}
        </div>
      )}

      <AddWidgetDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={addWidget}
      />

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

function WidgetTile({
  widget,
  editing,
  isFirst,
  isLast,
  currentUserId,
  sources,
  onConfigure,
  onRemove,
  onMove,
}: {
  widget: DashboardWidget
  editing: boolean
  isFirst: boolean
  isLast: boolean
  currentUserId: string
  sources: ReturnType<typeof useDashboard>["sources"]
  onConfigure: () => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
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
