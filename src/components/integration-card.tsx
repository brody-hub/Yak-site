import * as React from "react"
import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  EyeOffIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError, integrationsApi, type ServerIntegration } from "@/lib/api"
import type { IntegrationProvider } from "@/lib/integrations"
import { formatDateTime } from "@/lib/kpis"

/**
 * Connect, verify, and remove a metrics provider.
 *
 * The credential is deliberately one-way: it is posted once, and from then on
 * the panel only ever sees a hint such as `sk_ab…9f21`. There is no reveal
 * control because there is nothing to reveal — the server has no endpoint that
 * returns a stored key. Replacing means pasting a new one.
 */
export function IntegrationCard({
  provider,
  integration,
  onChange,
}: {
  provider: IntegrationProvider
  integration: ServerIntegration | undefined
  onChange: () => void | Promise<void>
}) {
  const connected = integration?.connected ?? false

  const [apiKey, setApiKey] = React.useState("")
  const [replacing, setReplacing] = React.useState(false)
  const [busy, setBusy] = React.useState<"connect" | "test" | "remove" | null>(
    null
  )

  const showForm = !connected || replacing

  const connect = async (event: React.FormEvent) => {
    event.preventDefault()

    const trimmed = apiKey.trim()

    if (!trimmed) {
      toast.error(`Paste your ${provider.label} key first`)
      return
    }

    setBusy("connect")

    try {
      const result = await integrationsApi.connectRevenueCat({ apiKey: trimmed })
      // Cleared immediately so the plaintext does not linger in a form field.
      setApiKey("")
      setReplacing(false)
      await onChange()
      toast.success(
        result.projectName
          ? `Connected to ${result.projectName}`
          : `${provider.label} connected`
      )
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : `Could not connect ${provider.label}`
      )
    } finally {
      setBusy(null)
    }
  }

  const test = async () => {
    setBusy("test")

    try {
      const result = await integrationsApi.testRevenueCat()
      await onChange()
      toast.success(
        `Connection is healthy · ${result.metricsAvailable} metrics in ${result.currency}`
      )
    } catch (err) {
      await onChange()
      toast.error(
        err instanceof ApiError ? err.message : "Connection check failed"
      )
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    const confirmed = window.confirm(
      `Remove the ${provider.label} connection? Widgets and KPIs that depend on it will stop showing data. The stored key is deleted and cannot be recovered — you will need a new one to reconnect.`
    )

    if (!confirmed) {
      return
    }

    setBusy("remove")

    try {
      await integrationsApi.disconnectRevenueCat()
      setReplacing(false)
      setApiKey("")
      await onChange()
      toast.success(`${provider.label} removed`)
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : `Could not remove ${provider.label}`
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            {provider.label}
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground"
              aria-label={`${provider.label} documentation`}
            >
              <ExternalLinkIcon className="size-3.5" />
            </a>
          </CardTitle>
          <CardDescription>{provider.blurb}</CardDescription>
        </div>
        <Badge variant={connected ? "default" : "outline"}>
          {connected ? "Connected" : "Not connected"}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        {connected && integration ? (
          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span className="flex items-center gap-2">
                <EyeOffIcon className="text-muted-foreground size-4" />
                <span className="text-muted-foreground">Stored key</span>
                <code className="font-mono">
                  {integration.apiKeyHint ?? "hidden"}
                </code>
              </span>
              {integration.projectName ? (
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground">Project</span>
                  <span className="font-medium">{integration.projectName}</span>
                </span>
              ) : null}
            </div>

            <p className="text-muted-foreground text-xs">
              The full key is never displayed again and cannot be read back out
              of Stand.
              {integration.connectedAt
                ? ` Connected ${formatDateTime(integration.connectedAt)}.`
                : null}
              {integration.lastCheckedAt
                ? ` Last checked ${formatDateTime(integration.lastCheckedAt)}.`
                : null}
            </p>

            {integration.lastError ? (
              <p className="text-destructive text-xs">
                Last check failed: {integration.lastError}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy !== null}
                onClick={() => void test()}
              >
                <CheckCircle2Icon />
                {busy === "test" ? "Checking…" : "Test connection"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy !== null}
                onClick={() => setReplacing((current) => !current)}
              >
                {replacing ? "Cancel replace" : "Replace key"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={busy !== null}
                onClick={() => void remove()}
              >
                <Trash2Icon />
                {busy === "remove" ? "Removing…" : "Remove"}
              </Button>
            </div>
          </div>
        ) : null}

        {showForm ? (
          <>
            <div className="space-y-3">
              <h3 className="text-sm font-medium">
                How to create and upload your {provider.label} key
              </h3>
              <ol className="space-y-3">
                {provider.steps.map((step, index) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="bg-muted text-muted-foreground mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium">
                        {step.title}
                      </span>
                      <span className="text-muted-foreground block text-sm">
                        {step.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-2 rounded-xl border p-4">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheckIcon className="size-4" />
                How Stand keeps it safe
              </h3>
              <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
                {provider.security.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>

            <form onSubmit={(event) => void connect(event)} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor={`${provider.id}-api-key`}>
                  {provider.keyLabel}
                </Label>
                <Input
                  id={`${provider.id}-api-key`}
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={provider.keyPlaceholder}
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Verified against {provider.label} before it is saved, then
                  encrypted at rest. It is write-only from this point on.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy !== null}>
                  {busy === "connect"
                    ? "Verifying…"
                    : connected
                      ? "Replace key"
                      : "Connect"}
                </Button>
                {connected ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setReplacing(false)
                      setApiKey("")
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          </>
        ) : (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">What this unlocks</h3>
            <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
              {provider.unlocks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
