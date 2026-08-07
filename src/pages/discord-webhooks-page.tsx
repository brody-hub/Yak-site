import * as React from "react"
import { CircleHelpIcon } from "lucide-react"
import { toast } from "sonner"

import { useDiscordWebhooks } from "@/components/discord-webhooks-provider"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DISCORD_TRIGGERS,
  isValidDiscordWebhookUrl,
  type DiscordTriggerId,
} from "@/lib/discord-webhooks"
import { cn } from "@/lib/utils"

export function DiscordWebhooksPage() {
  const { loading, error } = useDiscordWebhooks()
  const [helpOpen, setHelpOpen] = React.useState(false)

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Discord webhooks</CardTitle>
              <CardDescription>
                Enable triggers and paste a webhook URL for each action. When
                that action happens, Stand posts a message to Discord.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="How to create a Discord webhook"
              onClick={() => setHelpOpen(true)}
            >
              <CircleHelpIcon />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : loading ? (
              <div className="space-y-4">
                {DISCORD_TRIGGERS.map((trigger) => (
                  <Skeleton key={trigger.id} className="h-40 rounded-xl" />
                ))}
              </div>
            ) : (
              DISCORD_TRIGGERS.map((trigger) => (
                <TriggerRow
                  key={trigger.id}
                  id={trigger.id}
                  label={trigger.label}
                  description={trigger.description}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <DiscordWebhookHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  )
}

/**
 * The saved URL is write-only: the server keeps it encrypted and only returns
 * a redacted hint. So the field starts empty and only submits when the user
 * actually types a replacement.
 */
function TriggerRow({
  id,
  label,
  description,
}: {
  id: DiscordTriggerId
  label: string
  description: string
}) {
  const { getTrigger, updateTrigger, testTrigger } = useDiscordWebhooks()
  const config = getTrigger(id)

  const configured = config?.configured ?? false
  const enabled = config?.enabled ?? false

  const [draftUrl, setDraftUrl] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [testing, setTesting] = React.useState(false)

  const trimmed = draftUrl.trim()
  const showInvalid = trimmed.length > 0 && !isValidDiscordWebhookUrl(trimmed)

  const save = async (patch: {
    enabled?: boolean
    webhookUrl?: string | null
  }) => {
    setSaving(true)

    try {
      await updateTrigger(id, patch)
    } catch {
      toast.error(`Could not update ${label.toLowerCase()}`)
    } finally {
      setSaving(false)
    }
  }

  const saveUrl = async () => {
    if (!trimmed || showInvalid) {
      return
    }

    await save({ webhookUrl: trimmed })
    setDraftUrl("")
    toast.success("Webhook URL saved")
  }

  const clearUrl = async () => {
    await save({ webhookUrl: null, enabled: false })
    setDraftUrl("")
    toast.success("Webhook URL removed")
  }

  const runTest = async () => {
    setTesting(true)

    try {
      await testTrigger(id, trimmed || undefined)
      toast.success("Test message sent to Discord")
    } catch {
      toast.error("Discord rejected the test message")
    } finally {
      setTesting(false)
    }
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border p-4",
        enabled && "border-primary/30 bg-muted/20"
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id={`discord-trigger-${id}`}
          checked={enabled}
          disabled={saving || (!configured && !enabled)}
          onCheckedChange={(checked) => void save({ enabled: checked === true })}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <Label
            htmlFor={`discord-trigger-${id}`}
            className="text-sm font-medium"
          >
            {label}
          </Label>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        {config?.lastFiredAt ? (
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            Last fired {new Date(config.lastFiredAt).toLocaleDateString()}
          </span>
        ) : null}
      </div>

      <div className="space-y-2 pl-7">
        <Label htmlFor={`discord-url-${id}`}>Webhook URL</Label>
        <div className="flex gap-2">
          <Input
            id={`discord-url-${id}`}
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder={
              configured
                ? (config?.webhookUrlHint ?? "Saved — paste a new URL to replace")
                : "https://discord.com/api/webhooks/…"
            }
            value={draftUrl}
            onChange={(event) => setDraftUrl(event.target.value)}
            aria-invalid={showInvalid || undefined}
          />
          <Button
            type="button"
            onClick={() => void saveUrl()}
            disabled={saving || !trimmed || showInvalid}
          >
            Save
          </Button>
        </div>

        {showInvalid && (
          <p className="text-destructive text-xs">
            Enter a valid Discord webhook URL (discord.com/api/webhooks/…).
          </p>
        )}

        {config?.lastError ? (
          <p className="text-destructive text-xs">
            Last delivery failed: {config.lastError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {configured ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void runTest()}
                disabled={testing}
              >
                {testing ? "Sending…" : "Send test"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void clearUrl()}
                disabled={saving}
              >
                Remove URL
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground text-xs">
              Save a webhook URL to enable this trigger.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function DiscordWebhookHelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>How to get a Discord webhook</DialogTitle>
          <DialogDescription>
            Create a channel webhook in Discord, then paste the URL into the
            trigger you want to notify.
          </DialogDescription>
        </DialogHeader>

        <ol className="list-decimal space-y-3 pl-5 text-sm">
          <li>
            Open Discord and go to the server where you want notifications.
          </li>
          <li>
            Open <span className="font-medium">Server Settings</span> →{" "}
            <span className="font-medium">Integrations</span> →{" "}
            <span className="font-medium">Webhooks</span>, or right-click a
            channel → <span className="font-medium">Edit Channel</span> →{" "}
            <span className="font-medium">Integrations</span> →{" "}
            <span className="font-medium">Webhooks</span>.
          </li>
          <li>
            Click <span className="font-medium">New Webhook</span> (or{" "}
            <span className="font-medium">Create Webhook</span>).
          </li>
          <li>
            Name it (for example, “Stand alerts”), pick the channel, then click{" "}
            <span className="font-medium">Copy Webhook URL</span>.
          </li>
          <li>
            Paste that URL into the trigger row in Stand and enable the
            checkbox.
          </li>
        </ol>

        <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          Tip: Use a different webhook (or channel) per trigger if you want
          alerts separated. Keep webhook URLs private — anyone with the link can
          post to that channel.
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
