import * as React from "react"
import { toast } from "sonner"

import { useSystemUsers } from "@/components/system-users-provider"
import { useTasks } from "@/components/tasks-provider"
import { TicketStatusIcon } from "@/components/ticket-status-icon"
import { UserAvatar } from "@/components/user-avatar"
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
import { Textarea } from "@/components/ui/textarea"
import {
  BACKLOG_VIEW_ID,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/tasks"

type CreateTicketDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultViewId: string
}

export function CreateTicketDialog({
  open,
  onOpenChange,
  defaultViewId,
}: CreateTicketDialogProps) {
  const { users } = useSystemUsers()
  const { sprints, createTicket } = useTasks()
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [status, setStatus] = React.useState<TicketStatus>("todo")
  const [priority, setPriority] = React.useState<TicketPriority>("medium")
  const [sprintId, setSprintId] = React.useState(
    defaultViewId === BACKLOG_VIEW_ID ? BACKLOG_VIEW_ID : defaultViewId
  )
  const [assigneeId, setAssigneeId] = React.useState<string>("unassigned")

  React.useEffect(() => {
    if (open) {
      setSprintId(
        defaultViewId === BACKLOG_VIEW_ID ? BACKLOG_VIEW_ID : defaultViewId
      )
      setStatus(defaultViewId === BACKLOG_VIEW_ID ? "backlog" : "todo")
    }
  }, [defaultViewId, open])

  const reset = () => {
    setTitle("")
    setDescription("")
    setStatus(defaultViewId === BACKLOG_VIEW_ID ? "backlog" : "todo")
    setPriority("medium")
    setSprintId(
      defaultViewId === BACKLOG_VIEW_ID ? BACKLOG_VIEW_ID : defaultViewId
    )
    setAssigneeId("unassigned")
  }

  const [submitting, setSubmitting] = React.useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!title.trim()) {
      return
    }

    setSubmitting(true)

    try {
      await createTicket({
        title,
        description,
        status,
        priority,
        sprintId: sprintId === BACKLOG_VIEW_ID ? null : sprintId,
        assigneeId: assigneeId === "unassigned" ? null : assigneeId,
      })
      reset()
      onOpenChange(false)
    } catch {
      toast.error("Could not create that ticket")
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New ticket</DialogTitle>
          <DialogDescription>
            Create a ticket in backlog or a sprint, and assign a panel user.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="ticket-title">Title</Label>
            <Input
              id="ticket-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Improve report triage filters"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-description">Description</Label>
            <Textarea
              id="ticket-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What needs to get done?"
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as TicketStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_STATUSES.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      <span className="flex items-center gap-2">
                        <TicketStatusIcon status={item.id} />
                        {item.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as TicketPriority)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_PRIORITIES.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={sprintId} onValueChange={setSprintId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BACKLOG_VIEW_ID}>Backlog</SelectItem>
                  {sprints.map((sprint) => (
                    <SelectItem key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <span className="flex items-center gap-2">
                        <UserAvatar user={user} size="sm" />
                        {user.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button type="submit" disabled={!title.trim() || submitting}>
              {submitting ? "Creating…" : "Create ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
