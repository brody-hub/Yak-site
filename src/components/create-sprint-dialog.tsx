import * as React from "react"
import { toast } from "sonner"

import { useTasks } from "@/components/tasks-provider"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SprintDurationWeeks } from "@/lib/tasks"

type CreateSprintDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateSprintDialog({
  open,
  onOpenChange,
}: CreateSprintDialogProps) {
  const { createSprint } = useTasks()
  const [name, setName] = React.useState("")
  const [durationWeeks, setDurationWeeks] =
    React.useState<SprintDurationWeeks>(2)
  const [startDate, setStartDate] = React.useState(
    () => new Date().toISOString().slice(0, 10)
  )

  const reset = () => {
    setName("")
    setDurationWeeks(2)
    setStartDate(new Date().toISOString().slice(0, 10))
  }

  const [submitting, setSubmitting] = React.useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!name.trim() || !startDate) {
      return
    }

    setSubmitting(true)

    try {
      await createSprint({
        name,
        durationWeeks,
        startDate: new Date(`${startDate}T00:00:00.000Z`).toISOString(),
      })
      reset()
      onOpenChange(false)
    } catch {
      toast.error("Could not create that sprint")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          reset()
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New sprint</DialogTitle>
          <DialogDescription>
            Create a 1 or 2 week sprint for upcoming tickets.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="sprint-name">Name</Label>
            <Input
              id="sprint-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Sprint 14"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={String(durationWeeks)}
                onValueChange={(value) =>
                  setDurationWeeks(Number(value) as SprintDurationWeeks)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 week</SelectItem>
                  <SelectItem value="2">2 weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sprint-start">Start date</Label>
              <Input
                id="sprint-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
              />
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
            <Button type="submit" disabled={!name.trim() || submitting}>
              Create sprint
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
