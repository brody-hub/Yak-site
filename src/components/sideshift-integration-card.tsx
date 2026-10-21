import * as React from "react"
import { Link } from "react-router-dom"
import { CheckCircle2Icon, ListChecksIcon, Loader2Icon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { SideshiftCampaignsDialog } from "@/components/sideshift-campaigns-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError, sideshiftApi } from "@/lib/api"
import { formatDateTime } from "@/lib/kpis"
import type { SideshiftStatus } from "@/lib/sideshift"

const STATUS_BADGES: Record<
  Exclude<SideshiftStatus["status"], "disconnected">,
  { label: string; variant: "secondary" | "destructive" | "outline" }
> = {
  connected: { label: "Connected", variant: "secondary" },
  needs_reconnect: { label: "Needs reconnect", variant: "destructive" },
  subscription_inactive: { label: "Subscription inactive", variant: "outline" },
}

/**
 * Sideshift connects with one click over OAuth, so unlike the key-based cards
 * there is no form: Connect sends the browser to Sideshift's consent screen
 * and Sideshift sends it back to the Marketing tab.
 */
export function SideshiftIntegrationCard({
  onChange,
}: {
  onChange: () => void | Promise<void>
}) {
  const [status, setStatus] = React.useState<SideshiftStatus | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState<"connect" | "disconnect" | null>(null)
  const [pickerOpen, setPickerOpen] = React.useState(false)

  const load = React.useCallback(async () => {
    try {
      setStatus(await sideshiftApi.status())
      setError(null)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load Sideshift status"
      )
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const connect = async () => {
    setBusy("connect")

    try {
      const { authorizeUrl } = await sideshiftApi.connect()
      window.location.assign(authorizeUrl)
    } catch (err) {
      setBusy(null)
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Could not start the Sideshift connection"
      )
    }
  }

  const disconnect = async () => {
    const confirmed = window.confirm(
      "Disconnect Sideshift? Campaign data is removed from this dashboard and access is revoked in Sideshift. You can reconnect at any time."
    )

    if (!confirmed) {
      return
    }

    setBusy("disconnect")

    try {
      setStatus(await sideshiftApi.disconnect())
      await onChange()
      toast.success("Sideshift disconnected")
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not disconnect Sideshift"
      )
    } finally {
      setBusy(null)
    }
  }

  const tracked = status?.campaigns.filter((campaign) => campaign.tracked) ?? []
  const badge =
    status && status.status !== "disconnected"
      ? STATUS_BADGES[status.status]
      : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            Sideshift
            {badge ? (
              <Badge variant={badge.variant}>
                {status?.status === "connected" ? (
                  <CheckCircle2Icon />
                ) : null}
                {badge.label}
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription>
            Shows each creator campaign’s views, engagement, creators and posts
            on the Marketing tab. Read-only: Yak only asks Sideshift for
            analytics access.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : !status ? (
          <Skeleton className="h-16" />
        ) : !status.connected ? (
          <Button
            type="button"
            disabled={busy !== null}
            onClick={() => void connect()}
          >
            {busy === "connect" ? <Loader2Icon className="animate-spin" /> : null}
            Connect Sideshift
          </Button>
        ) : (
          <>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground text-xs">Company</dt>
                <dd>{status.companyName ?? status.companyId ?? "Sideshift account"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Tracked campaigns</dt>
                <dd>
                  {tracked.length} of {status.campaigns.length}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Last synced</dt>
                <dd>
                  {status.lastSyncedAt
                    ? formatDateTime(status.lastSyncedAt)
                    : "Not yet"}
                </dd>
              </div>
            </dl>

            {status.lastError ? (
              <p className="text-destructive text-sm">
                {status.lastError}
                {status.lastErrorRequestId
                  ? ` (Sideshift request ID ${status.lastErrorRequestId})`
                  : null}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {status.status === "needs_reconnect" ? (
                <Button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void connect()}
                >
                  Reconnect Sideshift
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => setPickerOpen(true)}
              >
                <ListChecksIcon />
                Choose campaigns
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/marketing">Open Marketing</Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy !== null}
                onClick={() => void disconnect()}
              >
                <Trash2Icon />
                Disconnect
              </Button>
            </div>
          </>
        )}
      </CardContent>

      {status ? (
        <SideshiftCampaignsDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          campaigns={status.campaigns}
          onSaved={setStatus}
        />
      ) : null}
    </Card>
  )
}
