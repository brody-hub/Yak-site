import * as React from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  resolveWidgetOptions,
  widgetOptions,
  type DashboardWidget,
  type WidgetDefinition,
  type WidgetOptionValues,
} from "@/lib/dashboard"

/**
 * Per-tile configuration.
 *
 * The form is generated from the widget definition's option list, so adding a
 * new knob to a widget means adding one entry to its definition rather than
 * touching this dialog.
 */
export function ConfigureWidgetDialog({
  widget,
  definition,
  onOpenChange,
  onSave,
}: {
  widget: DashboardWidget | null
  definition: WidgetDefinition | null
  onOpenChange: (open: boolean) => void
  onSave: (id: string, options: WidgetOptionValues) => void
}) {
  const [draft, setDraft] = React.useState<WidgetOptionValues>({})

  React.useEffect(() => {
    if (widget && definition) {
      setDraft(resolveWidgetOptions(definition, widget.options))
    }
  }, [widget, definition])

  if (!widget || !definition) {
    return null
  }

  const options = widgetOptions(definition)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    onSave(widget.id, draft)
    onOpenChange(false)
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{definition.title}</DialogTitle>
            <DialogDescription>{definition.description}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {options.map((option) => {
              const id = `${widget.id}-${option.key}`
              const value = draft[option.key]

              if (option.type === "select") {
                return (
                  <div key={option.key} className="space-y-2">
                    <Label htmlFor={id}>{option.label}</Label>
                    <Select
                      value={String(value ?? option.default)}
                      onValueChange={(next) =>
                        setDraft((current) => ({
                          ...current,
                          [option.key]: next,
                        }))
                      }
                    >
                      <SelectTrigger id={id} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {option.choices.map((choice) => (
                          <SelectItem key={choice.value} value={choice.value}>
                            {choice.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {option.help ? (
                      <p className="text-muted-foreground text-xs">
                        {option.help}
                      </p>
                    ) : null}
                  </div>
                )
              }

              if (option.type === "number") {
                return (
                  <div key={option.key} className="space-y-2">
                    <Label htmlFor={id}>{option.label}</Label>
                    <Input
                      id={id}
                      type="number"
                      min={option.min}
                      max={option.max}
                      value={String(value ?? option.default)}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          [option.key]: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                )
              }

              if (option.type === "boolean") {
                return (
                  <label
                    key={option.key}
                    className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg p-2"
                  >
                    <Checkbox
                      checked={value === true}
                      onCheckedChange={(checked) =>
                        setDraft((current) => ({
                          ...current,
                          [option.key]: checked === true,
                        }))
                      }
                      className="mt-0.5"
                    />
                    <span className="space-y-0.5">
                      <span className="block text-sm">{option.label}</span>
                      {option.help ? (
                        <span className="text-muted-foreground block text-xs">
                          {option.help}
                        </span>
                      ) : null}
                    </span>
                  </label>
                )
              }

              return (
                <div key={option.key} className="space-y-2">
                  <Label htmlFor={id}>{option.label}</Label>
                  <Input
                    id={id}
                    maxLength={option.maxLength}
                    placeholder={definition.title}
                    value={String(value ?? "")}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        [option.key]: event.target.value,
                      }))
                    }
                  />
                  {option.help ? (
                    <p className="text-muted-foreground text-xs">
                      {option.help}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save widget</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
