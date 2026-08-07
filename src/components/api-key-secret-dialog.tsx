import * as React from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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

export type ApiKeySecretDetails = {
  name: string
  secret: string
  /** Distinguishes create vs rotate copy in the description. */
  mode: "created" | "rotated"
}

export function ApiKeySecretDialog({
  open,
  onOpenChange,
  details,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  details: ApiKeySecretDetails | null
}) {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setCopied(false)
    }
  }, [open])

  if (!details) {
    return null
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(details.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy to the clipboard")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {details.mode === "rotated"
              ? "API key rotated"
              : "API key created"}
          </DialogTitle>
          <DialogDescription>
            Copy the secret for <span className="font-medium">{details.name}</span>{" "}
            now. It is shown only once and cannot be recovered later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="api-key-secret">API key</Label>
          <div className="flex gap-2">
            <Input
              id="api-key-secret"
              readOnly
              value={details.secret}
              className="font-mono text-xs"
              onFocus={(event) => event.currentTarget.select()}
            />
            <Button type="button" variant="outline" onClick={() => void copy()}>
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Keep this server-side. Do not ship it in a mobile binary or web
            bundle — proxy through your own backend instead.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
