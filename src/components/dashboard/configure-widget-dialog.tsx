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
import { ApiError, sideshiftApi } from "@/lib/api"
import {
  resolveWidgetOptions,
  widgetOptions,
  type DashboardWidget,
  type WidgetDefinition,
  type WidgetOption,
  type WidgetOptionValues,
} from "@/lib/dashboard"
import {
  decodeCreatorKeys,
  encodeCreatorKeys,
  formatCompact,
  platformLabel,
  type SideshiftCreatorRow,
} from "@/lib/sideshift"
import { cn } from "@/lib/utils"

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

              if (option.type === "remote-select") {
                return (
                  <CampaignField
                    key={option.key}
                    id={id}
                    option={option}
                    value={String(value ?? option.default)}
                    onChange={(next) =>
                      setDraft((current) => ({
                        ...current,
                        [option.key]: next,
                        // A new campaign has different creators.
                        ...Object.fromEntries(
                          options
                            .filter(
                              (entry) =>
                                entry.type === "remote-multi" &&
                                entry.dependsOn === option.key
                            )
                            .map((entry) => [entry.key, ""])
                        ),
                      }))
                    }
                  />
                )
              }

              if (option.type === "remote-multi") {
                return (
                  <CreatorsField
                    key={option.key}
                    option={option}
                    campaign={String(draft[option.dependsOn] ?? "all")}
                    value={String(value ?? "")}
                    onChange={(next) =>
                      setDraft((current) => ({ ...current, [option.key]: next }))
                    }
                  />
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

/* -------------------------------------------------------------------------- */
/* Remote lists                                                                */
/* -------------------------------------------------------------------------- */

type RemoteState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T }

function describeError(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

/** The tracked campaigns, with "all" first. */
function CampaignField({
  id,
  option,
  value,
  onChange,
}: {
  id: string
  option: Extract<WidgetOption, { type: "remote-select" }>
  value: string
  onChange: (next: string) => void
}) {
  const [state, setState] = React.useState<
    RemoteState<{ id: string; name: string }[]>
  >({ status: "loading" })

  React.useEffect(() => {
    let cancelled = false

    sideshiftApi
      .status()
      .then((status) => {
        if (!cancelled) {
          setState({
            status: "ready",
            data: status.campaigns
              .filter((campaign) => campaign.tracked)
              .map(({ id, name }) => ({ id, name })),
          })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: describeError(error, "Could not load campaigns"),
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const campaigns = state.status === "ready" ? state.data : []
  // A stored id the list no longer has still shows, so the choice is visible
  // rather than silently reset.
  const stale =
    value !== "all" && !campaigns.some((campaign) => campaign.id === value)

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{option.label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All tracked campaigns</SelectItem>
          {campaigns.map((campaign) => (
            <SelectItem key={campaign.id} value={campaign.id}>
              {campaign.name}
            </SelectItem>
          ))}
          {stale ? (
            <SelectItem value={value}>Campaign no longer tracked</SelectItem>
          ) : null}
        </SelectContent>
      </Select>
      {state.status === "error" ? (
        <p className="text-destructive text-xs">{state.message}</p>
      ) : option.help ? (
        <p className="text-muted-foreground text-xs">{option.help}</p>
      ) : null}
    </div>
  )
}

/** Creators within the chosen campaign, as a capped checkbox list. */
function CreatorsField({
  option,
  campaign,
  value,
  onChange,
}: {
  option: Extract<WidgetOption, { type: "remote-multi" }>
  campaign: string
  value: string
  onChange: (next: string) => void
}) {
  // The answer remembers which campaign it is for, so switching campaigns
  // reads as loading until the new list arrives without an extra render.
  const [loaded, setLoaded] = React.useState<{
    campaign: string
    result: RemoteState<SideshiftCreatorRow[]>
  } | null>(null)

  React.useEffect(() => {
    let cancelled = false

    sideshiftApi
      .analytics({ campaign, range: "all", sort: "views" })
      .then((analytics) => {
        if (!cancelled) {
          setLoaded({
            campaign,
            result: { status: "ready", data: analytics.creators },
          })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoaded({
            campaign,
            result: {
              status: "error",
              message: describeError(error, "Could not load creators"),
            },
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [campaign])

  const state: RemoteState<SideshiftCreatorRow[]> =
    loaded && loaded.campaign === campaign ? loaded.result : { status: "loading" }

  const selected = decodeCreatorKeys(value)
  const full = selected.length >= option.max

  const toggle = (key: string, checked: boolean) => {
    const next = checked
      ? [...selected.filter((entry) => entry !== key), key]
      : selected.filter((entry) => entry !== key)

    onChange(encodeCreatorKeys(next.slice(0, option.max)))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <Label>{option.label}</Label>
        <span className="text-muted-foreground text-xs tabular-nums">
          {selected.length} of {option.max}
        </span>
      </div>

      {state.status === "loading" ? (
        <p className="text-muted-foreground text-xs">Loading creators…</p>
      ) : state.status === "error" ? (
        <p className="text-destructive text-xs">{state.message}</p>
      ) : state.data.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          No creators have posted in this campaign yet.
        </p>
      ) : (
        <div className="max-h-56 space-y-0.5 overflow-y-auto rounded-lg border p-1">
          {state.data.map((creator) => {
            const checked = selected.includes(creator.key)
            const disabled = !checked && full

            return (
              <label
                key={creator.key}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2 py-1.5",
                  disabled
                    ? "text-muted-foreground cursor-not-allowed"
                    : "hover:bg-muted/50 cursor-pointer"
                )}
              >
                <Checkbox
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(next) => toggle(creator.key, next === true)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{creator.name}</span>
                  <span className="text-muted-foreground block text-xs">
                    {platformLabel(creator.platform)}
                    {creator.handle ? ` · ${creator.handle}` : ""}
                  </span>
                </span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {formatCompact(creator.views)} views
                </span>
              </label>
            )
          })}
        </div>
      )}

      {option.help ? (
        <p className="text-muted-foreground text-xs">{option.help}</p>
      ) : null}
    </div>
  )
}
