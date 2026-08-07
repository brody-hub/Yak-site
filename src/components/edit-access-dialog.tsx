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
import { Label } from "@/components/ui/label"
import {
  PANEL_PERMISSIONS,
  type PanelPermissionId,
  type SystemUser,
} from "@/lib/panel-permissions"

type EditAccessDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: SystemUser
  onSave: (permissions: PanelPermissionId[]) => void
}

const permissionGroups = ["Main", "Support", "Settings"] as const

export function EditAccessDialog({
  open,
  onOpenChange,
  user,
  onSave,
}: EditAccessDialogProps) {
  const [permissions, setPermissions] = React.useState<PanelPermissionId[]>(
    user.permissions
  )

  React.useEffect(() => {
    if (open) {
      setPermissions(user.permissions)
    }
  }, [open, user.permissions])

  const togglePermission = (id: PanelPermissionId, checked: boolean) => {
    setPermissions((current) =>
      checked ? [...current, id] : current.filter((item) => item !== id)
    )
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    if (permissions.length === 0) {
      return
    }

    onSave(permissions)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit access</DialogTitle>
          <DialogDescription>
            Choose which sections {user.name} can access in the panel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Section access</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setPermissions(
                    permissions.length === PANEL_PERMISSIONS.length
                      ? []
                      : PANEL_PERMISSIONS.map((permission) => permission.id)
                  )
                }
              >
                {permissions.length === PANEL_PERMISSIONS.length
                  ? "Clear all"
                  : "Select all"}
              </Button>
            </div>

            <div className="space-y-4 rounded-xl border p-4">
              {permissionGroups.map((group) => {
                const groupPermissions = PANEL_PERMISSIONS.filter(
                  (permission) => permission.group === group
                )

                return (
                  <div key={group} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {group}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {groupPermissions.map((permission) => {
                        const checked = permissions.includes(permission.id)

                        return (
                          <label
                            key={permission.id}
                            htmlFor={`edit-permission-${permission.id}`}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted/50"
                          >
                            <Checkbox
                              id={`edit-permission-${permission.id}`}
                              checked={checked}
                              onCheckedChange={(value) =>
                                togglePermission(permission.id, value === true)
                              }
                            />
                            <span>{permission.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={permissions.length === 0}>
              Save access
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
