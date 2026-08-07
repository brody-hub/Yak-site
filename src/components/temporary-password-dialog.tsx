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

export type TemporaryPasswordDetails = {
  userName: string
  userEmail: string
  inviteEmailSent: boolean
  temporaryPassword: string
}

export function TemporaryPasswordDialog({
  open,
  onOpenChange,
  details,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  details: TemporaryPasswordDetails | null
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
      await navigator.clipboard.writeText(details.temporaryPassword)
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
          <DialogTitle>Share this temporary password</DialogTitle>
          <DialogDescription>
            {details.inviteEmailSent
              ? `An invite was also emailed to ${details.userEmail}. You can still copy the password and send it yourself — it is shown only once.`
              : `No invite email was sent (email is not configured). Give ${details.userName} this password — it is shown only once.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="temporary-password">Temporary password</Label>
          <div className="flex gap-2">
            <Input
              id="temporary-password"
              readOnly
              value={details.temporaryPassword}
              className="font-mono"
              onFocus={(event) => event.currentTarget.select()}
            />
            <Button type="button" variant="outline" onClick={() => void copy()}>
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            They will be asked to choose their own password when they sign in.
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
