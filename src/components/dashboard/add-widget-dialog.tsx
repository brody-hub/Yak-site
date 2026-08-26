import * as React from "react"
import { Link } from "react-router-dom"
import { LockIcon, PlusIcon } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { useIntegrations } from "@/components/integrations-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  widgetAvailability,
  WIDGET_CATEGORIES,
  WIDGET_DEFINITIONS,
  type WidgetDefinition,
} from "@/lib/dashboard"
import { getIntegrationLabel } from "@/lib/integrations"
import { cn } from "@/lib/utils"

/**
 * The widget picker.
 *
 * Every widget in the catalogue is listed regardless of whether it can be used,
 * so people can see what the dashboard is capable of and what it would take to
 * unlock it. Anything unavailable is disabled with the specific reason — a
 * missing section permission, or an integration that has not been connected.
 */
export function AddWidgetDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (type: string) => void
}) {
  const { can, canManageUsers } = useAuth()
  const { connected } = useIntegrations()

  const availability = React.useMemo(() => {
    const entries = new Map<string, ReturnType<typeof widgetAvailability>>()

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

  const add = (definition: WidgetDefinition) => {
    onAdd(definition.type)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a widget</DialogTitle>
          <DialogDescription>
            Widgets read from the sections you have access to. Anything greyed
            out tells you what it needs first.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-6 mt-4 max-h-[55vh] space-y-6 overflow-y-auto px-6">
          {WIDGET_CATEGORIES.map((category) => {
            const definitions = WIDGET_DEFINITIONS.filter(
              (definition) => definition.category === category
            )

            if (definitions.length === 0) {
              return null
            }

            return (
              <section key={category} className="space-y-2">
                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {category}
                </h3>
                <div className="grid gap-2">
                  {definitions.map((definition) => {
                    const state = availability.get(definition.type)
                    const available = state?.available ?? false

                    return (
                      <div
                        key={definition.type}
                        className={cn(
                          "flex items-start justify-between gap-4 rounded-xl border p-3",
                          !available && "bg-muted/40"
                        )}
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="flex items-center gap-2 text-sm font-medium">
                            {definition.title}
                            {definition.requires ? (
                              <Badge variant="secondary">
                                {getIntegrationLabel(definition.requires)}
                              </Badge>
                            ) : null}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {definition.description}
                          </p>
                          {!available && state && !state.available ? (
                            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                              <LockIcon className="size-3" />
                              {state.reason}
                            </p>
                          ) : null}
                        </div>

                        {available ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => add(definition)}
                          >
                            <PlusIcon />
                            Add
                          </Button>
                        ) : definition.requires && canManageUsers ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            asChild
                          >
                            <Link
                              to="/settings/integrations"
                              onClick={() => onOpenChange(false)}
                            >
                              Connect
                            </Link>
                          </Button>
                        ) : (
                          <Button type="button" size="sm" variant="ghost" disabled>
                            Unavailable
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
