import * as React from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
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
import { ApiError, sideshiftApi } from "@/lib/api"
import type { SideshiftCampaign, SideshiftStatus } from "@/lib/sideshift"

/**
 * Picks which Sideshift campaigns appear in the panel. Newly picked campaigns
 * start syncing straight away, including a year of daily history.
 */
export function SideshiftCampaignsDialog({
  open,
  onOpenChange,
  campaigns,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaigns: SideshiftCampaign[]
  onSaved: (status: SideshiftStatus) => void
}) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setSelected(
        new Set(
          campaigns
            .filter((campaign) => campaign.tracked)
            .map((campaign) => campaign.id)
        )
      )
    }
  }, [open, campaigns])

  const toggle = (id: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current)

      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }

      return next
    })
  }

  const save = async () => {
    setSaving(true)

    try {
      const status = await sideshiftApi.saveCampaigns([...selected])
      onSaved(status)
      onOpenChange(false)
      toast.success("Campaigns updated")
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not save campaigns"
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose campaigns to show</DialogTitle>
          <DialogDescription>
            Picked campaigns appear on the Marketing tab. You can change this
            any time.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-1 overflow-y-auto rounded-xl border p-2">
          {campaigns.length === 0 ? (
            <p className="text-muted-foreground p-2 text-sm">
              No campaigns found in Sideshift yet.
            </p>
          ) : (
            campaigns.map((campaign) => (
              <label
                key={campaign.id}
                className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg p-2"
              >
                <Checkbox
                  checked={selected.has(campaign.id)}
                  onCheckedChange={(value) => toggle(campaign.id, value === true)}
                />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {campaign.name}
                </span>
                <Badge variant="outline" className="capitalize">
                  {campaign.status}
                </Badge>
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
