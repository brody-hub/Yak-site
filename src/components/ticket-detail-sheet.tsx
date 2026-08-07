import * as React from "react"
import { ChevronDownIcon, HistoryIcon } from "lucide-react"

import { toast } from "sonner"

import { useSystemUsers } from "@/components/system-users-provider"
import { useTasks } from "@/components/tasks-provider"
import { TicketStatusIcon } from "@/components/ticket-status-icon"
import { UserAvatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  BACKLOG_VIEW_ID,
  formatSprintRange,
  getPriorityLabel,
  getStatusLabel,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketHistoryEntry,
  type TicketHistoryField,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/tasks"

type TicketDetailSheetProps = {
  ticketId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function fieldLabel(field: TicketHistoryField) {
  switch (field) {
    case "status":
      return "Status"
    case "priority":
      return "Priority"
    case "assigneeId":
      return "Assignee"
    case "sprintId":
      return "Location"
    case "title":
      return "Title"
    case "description":
      return "Description"
  }
}

export function TicketDetailSheet({
  ticketId,
  open,
  onOpenChange,
}: TicketDetailSheetProps) {
  const { users } = useSystemUsers()
  const { getTicket, getSprint, sprints, updateTicket, getTicketHistory } =
    useTasks()
  const ticket = ticketId ? getTicket(ticketId) : undefined
  const sprint = ticket ? getSprint(ticket.sprintId) : undefined
  const assignee = users.find((user) => user.id === ticket?.assigneeId)
  const history = ticketId ? getTicketHistory(ticketId) : []

  /** The server records who made the change and fires Discord triggers. */
  const applyPatch = (patch: Parameters<typeof updateTicket>[1]) => {
    if (!ticket) {
      return
    }

    void updateTicket(ticket.id, patch).catch(() => {
      toast.error("Could not save that change")
    })
  }

  const [description, setDescription] = React.useState("")
  const [historyOpen, setHistoryOpen] = React.useState(false)

  React.useEffect(() => {
    if (ticket) {
      setDescription(ticket.description)
    }
    // Reset draft only when opening a different ticket.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [ticketId, open])

  React.useEffect(() => {
    if (!open) {
      setHistoryOpen(false)
    }
  }, [open])

  const formatHistoryValue = (
    field: TicketHistoryField,
    value: string | null | undefined
  ) => {
    if (value === null || value === undefined || value === "") {
      if (field === "assigneeId") {
        return "Unassigned"
      }

      if (field === "sprintId") {
        return "Backlog"
      }

      if (field === "description") {
        return "Empty"
      }

      return "None"
    }

    if (field === "status") {
      return getStatusLabel(value as TicketStatus)
    }

    if (field === "priority") {
      return getPriorityLabel(value as TicketPriority)
    }

    if (field === "assigneeId") {
      return users.find((user) => user.id === value)?.name ?? "Unknown user"
    }

    if (field === "sprintId") {
      return getSprint(value)?.name ?? "Unknown sprint"
    }

    if (field === "description") {
      const trimmed = value.trim()
      if (trimmed.length <= 48) {
        return trimmed
      }

      return `${trimmed.slice(0, 48)}…`
    }

    return value
  }

  const commitDescription = () => {
    if (!ticket) {
      return
    }

    if (description.trim() === ticket.description.trim()) {
      return
    }

    applyPatch({ description })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {ticket ? (
          <>
            <SheetHeader>
              <SheetDescription>STAND-{ticket.number}</SheetDescription>
              <SheetTitle>{ticket.title}</SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-6 px-4 pb-6">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium">
                  <TicketStatusIcon status={ticket.status} />
                  {getStatusLabel(ticket.status)}
                </div>
                <Badge variant="outline">
                  {getPriorityLabel(ticket.priority)}
                </Badge>
                <Badge variant="outline">
                  {sprint
                    ? `${sprint.name} · ${formatSprintRange(sprint)}`
                    : "Backlog"}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticket-detail-description">Description</Label>
                <Textarea
                  id="ticket-detail-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  onBlur={commitDescription}
                  rows={5}
                  placeholder="Add details..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={ticket.status}
                    onValueChange={(value) =>
                      applyPatch({ status: value as TicketStatus })
                    }
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
                    value={ticket.priority}
                    onValueChange={(value) =>
                      applyPatch({ priority: value as TicketPriority })
                    }
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
                  <Select
                    value={ticket.sprintId ?? BACKLOG_VIEW_ID}
                    onValueChange={(value) =>
                      applyPatch({
                        sprintId: value === BACKLOG_VIEW_ID ? null : value,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={BACKLOG_VIEW_ID}>Backlog</SelectItem>
                      {sprints.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Select
                    value={ticket.assigneeId ?? "unassigned"}
                    onValueChange={(value) =>
                      applyPatch({
                        assigneeId: value === "unassigned" ? null : value,
                      })
                    }
                  >
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

              <div className="space-y-2 rounded-xl border p-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Assignee</span>
                  {assignee ? (
                    <span className="flex items-center gap-2 font-medium">
                      <UserAvatar user={assignee} size="sm" />
                      {assignee.name}
                    </span>
                  ) : (
                    <span className="font-medium">Unassigned</span>
                  )}
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDate(ticket.createdAt)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Updated</span>
                  <span>{formatDate(ticket.updatedAt)}</span>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-between rounded-none px-4 py-3 hover:bg-muted/50"
                  onClick={() => setHistoryOpen((current) => !current)}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <HistoryIcon className="size-4" />
                    History
                    <span className="text-muted-foreground font-normal">
                      ({history.length})
                    </span>
                  </span>
                  <ChevronDownIcon
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      historyOpen && "rotate-180"
                    )}
                  />
                </Button>

                {historyOpen && (
                  <div className="border-t px-4 py-3">
                    {history.length > 0 ? (
                      <ol className="space-y-4">
                        {history.map((entry) => (
                          <HistoryItem
                            key={entry.id}
                            entry={entry}
                            actor={
                              entry.actorId
                                ? (users.find(
                                    (user) => user.id === entry.actorId
                                  ) ?? null)
                                : null
                            }
                            formatHistoryValue={formatHistoryValue}
                          />
                        ))}
                      </ol>
                    ) : (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        No history yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <SheetHeader>
            <SheetTitle>Ticket not found</SheetTitle>
            <SheetDescription>
              This ticket may have been removed.
            </SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  )
}

function HistoryItem({
  entry,
  actor,
  formatHistoryValue,
}: {
  entry: TicketHistoryEntry
  actor: ReturnType<typeof useSystemUsers>["users"][number] | null
  formatHistoryValue: (
    field: TicketHistoryField,
    value: string | null | undefined
  ) => string
}) {
  return (
    <li className="flex gap-3">
      <div className="mt-0.5">
        {actor ? (
          <UserAvatar user={actor} size="sm" />
        ) : (
          <div className="bg-muted size-6 rounded-full" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-sm">
            <span className="font-medium">{actor?.name ?? "Someone"}</span>{" "}
            {entry.type === "created" ? (
              <span className="text-muted-foreground">created this ticket</span>
            ) : entry.field === "status" ? (
              <span className="text-muted-foreground">changed status</span>
            ) : entry.field ? (
              <span className="text-muted-foreground">
                updated {fieldLabel(entry.field).toLowerCase()}
              </span>
            ) : (
              <span className="text-muted-foreground">updated this ticket</span>
            )}
          </p>
          <time className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(entry.createdAt)}
          </time>
        </div>

        {entry.type === "updated" && entry.field && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {entry.field === "status" ? (
              <>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  {entry.from && (
                    <TicketStatusIcon status={entry.from as TicketStatus} />
                  )}
                  {formatHistoryValue(entry.field, entry.from)}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  {entry.to && (
                    <TicketStatusIcon status={entry.to as TicketStatus} />
                  )}
                  {formatHistoryValue(entry.field, entry.to)}
                </span>
              </>
            ) : (
              <>
                <span className="text-muted-foreground line-through">
                  {formatHistoryValue(entry.field, entry.from)}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">
                  {formatHistoryValue(entry.field, entry.to)}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
