import * as React from "react"
import { CalendarPlusIcon, PlusIcon, XIcon } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { CreateSprintDialog } from "@/components/create-sprint-dialog"
import { CreateTicketDialog } from "@/components/create-ticket-dialog"
import { useSystemUsers } from "@/components/system-users-provider"
import { useTasks } from "@/components/tasks-provider"
import { TicketDetailSheet } from "@/components/ticket-detail-sheet"
import { TicketStatusIcon } from "@/components/ticket-status-icon"
import { UserAvatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BACKLOG_VIEW_ID,
  DEFAULT_TICKET_FILTERS,
  filterTickets,
  formatSprintRange,
  getPriorityLabel,
  getStatusLabel,
  hasActiveFilters,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type Ticket,
  type TicketFilters,
  type TicketPriority,
} from "@/lib/tasks"

const priorityStyles: Record<TicketPriority, string> = {
  urgent: "border-red-500/40 text-red-500",
  high: "border-orange-500/40 text-orange-500",
  medium: "border-border text-muted-foreground",
  low: "border-border text-muted-foreground",
}

export function TasksPage() {
  const { users } = useSystemUsers()
  const { user: currentUser } = useAuth()
  const {
    sprints,
    tickets: allTickets,
    activeViewId,
    setActiveViewId,
    getSprint,
    getTicketsForView,
  } = useTasks()
  const [tab, setTab] = React.useState("tasks")
  const [createTicketOpen, setCreateTicketOpen] = React.useState(false)
  const [createSprintOpen, setCreateSprintOpen] = React.useState(false)
  const [selectedTicketId, setSelectedTicketId] = React.useState<string | null>(
    null
  )
  const [filters, setFilters] = React.useState<TicketFilters>(
    DEFAULT_TICKET_FILTERS
  )

  const isBacklog = activeViewId === BACKLOG_VIEW_ID
  const activeSprint = isBacklog ? undefined : getSprint(activeViewId)
  const isMyTasks = tab === "my-tasks"

  const myFilters: TicketFilters = {
    ...filters,
    assigneeId: currentUser?.id ?? "unassigned",
  }

  const tickets = isMyTasks
    ? filterTickets(
        [...allTickets].sort((a, b) => b.number - a.number),
        myFilters
      )
    : getTicketsForView(activeViewId, filters)

  const filtersActive = isMyTasks
    ? filters.status !== "all" || filters.priority !== "all"
    : hasActiveFilters(filters)

  const getAssignee = (assigneeId: string | null) => {
    if (!assigneeId) {
      return null
    }

    return users.find((user) => user.id === assigneeId) ?? null
  }

  const getLocationLabel = (ticket: Ticket) => {
    if (!ticket.sprintId) {
      return "Backlog"
    }

    return getSprint(ticket.sprintId)?.name ?? "Unknown sprint"
  }

  const updateFilter = <K extends keyof TicketFilters>(
    key: K,
    value: TicketFilters[K]
  ) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <Card>
          <Tabs value={tab} onValueChange={setTab}>
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <CardTitle>Tasks</CardTitle>
                    <CardDescription>
                      {isMyTasks
                        ? `Tickets assigned to ${currentUser?.name ?? "you"} across backlog and sprints.`
                        : "Linear-style ticket board with backlog, 1–2 week sprints, and filters."}
                    </CardDescription>
                  </div>
                  <TabsList>
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="my-tasks">My tasks</TabsTrigger>
                  </TabsList>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCreateSprintOpen(true)}
                  >
                    <CalendarPlusIcon />
                    New sprint
                  </Button>
                  <Button onClick={() => setCreateTicketOpen(true)}>
                    <PlusIcon />
                    New ticket
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {!isMyTasks && (
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <Select
                        value={activeViewId}
                        onValueChange={setActiveViewId}
                      >
                        <SelectTrigger className="w-[220px]">
                          <SelectValue placeholder="Select view" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={BACKLOG_VIEW_ID}>
                            Backlog
                          </SelectItem>
                          {sprints.map((sprint) => (
                            <SelectItem key={sprint.id} value={sprint.id}>
                              {sprint.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="text-sm text-muted-foreground">
                        {isBacklog
                          ? "Unscheduled tickets"
                          : activeSprint
                            ? `${activeSprint.durationWeeks} week${activeSprint.durationWeeks > 1 ? "s" : ""} · ${formatSprintRange(activeSprint)}`
                            : null}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
                      {filtersActive ? " matched" : ""}
                    </div>
                  </div>
                )}

                {isMyTasks && (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {currentUser && (
                        <>
                          <UserAvatar user={currentUser} size="sm" />
                          <span>Assigned to {currentUser.name}</span>
                        </>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
                      {filtersActive ? " matched" : ""}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={filters.status}
                    onValueChange={(value) =>
                      updateFilter("status", value as TicketFilters["status"])
                    }
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
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

                  <Select
                    value={filters.priority}
                    onValueChange={(value) =>
                      updateFilter(
                        "priority",
                        value as TicketFilters["priority"]
                      )
                    }
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All priorities</SelectItem>
                      {TICKET_PRIORITIES.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {!isMyTasks && (
                    <Select
                      value={filters.assigneeId}
                      onValueChange={(value) =>
                        updateFilter(
                          "assigneeId",
                          value as TicketFilters["assigneeId"]
                        )
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All assignees</SelectItem>
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
                  )}

                  {filtersActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilters(DEFAULT_TICKET_FILTERS)}
                    >
                      <XIcon />
                      Clear filters
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <TabsContent value="tasks" className="mt-0">
                <TicketTable
                  tickets={tickets}
                  showAssignee
                  emptyMessage={
                    filtersActive
                      ? "No tickets match these filters."
                      : isBacklog
                        ? "Backlog is empty. Create a ticket to park work here."
                        : "No tickets in this sprint yet. Create one to get started."
                  }
                  getAssignee={getAssignee}
                  getLocationLabel={getLocationLabel}
                  onSelect={setSelectedTicketId}
                />
              </TabsContent>

              <TabsContent value="my-tasks" className="mt-0">
                <TicketTable
                  tickets={tickets}
                  showAssignee={false}
                  emptyMessage={
                    filtersActive
                      ? "No tickets match these filters."
                      : "You have no assigned tickets yet."
                  }
                  getAssignee={getAssignee}
                  getLocationLabel={getLocationLabel}
                  onSelect={setSelectedTicketId}
                />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      <CreateTicketDialog
        open={createTicketOpen}
        onOpenChange={setCreateTicketOpen}
        defaultViewId={activeViewId}
      />
      <CreateSprintDialog
        open={createSprintOpen}
        onOpenChange={setCreateSprintOpen}
      />
      <TicketDetailSheet
        ticketId={selectedTicketId}
        open={selectedTicketId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTicketId(null)
          }
        }}
      />
    </div>
  )
}

function TicketTable({
  tickets,
  showAssignee,
  emptyMessage,
  getAssignee,
  getLocationLabel,
  onSelect,
}: {
  tickets: Ticket[]
  showAssignee: boolean
  emptyMessage: string
  getAssignee: (
    assigneeId: string | null
  ) => ReturnType<typeof useSystemUsers>["users"][number] | null
  getLocationLabel: (ticket: Ticket) => string
  onSelect: (ticketId: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Ticket</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            {showAssignee ? (
              <TableHead>Assignee</TableHead>
            ) : (
              <TableHead>Location</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.length > 0 ? (
            tickets.map((ticket) => {
              const assignee = getAssignee(ticket.assigneeId)

              return (
                <TableRow
                  key={ticket.id}
                  className="cursor-pointer"
                  onClick={() => onSelect(ticket.id)}
                >
                  <TableCell className="font-mono text-muted-foreground">
                    STAND-{ticket.number}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium">
                      <TicketStatusIcon status={ticket.status} />
                      {ticket.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <TicketStatusIcon status={ticket.status} />
                      {getStatusLabel(ticket.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={priorityStyles[ticket.priority]}
                    >
                      {getPriorityLabel(ticket.priority)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {showAssignee ? (
                      assignee ? (
                        <div className="flex items-center gap-2">
                          <UserAvatar user={assignee} size="sm" />
                          <span>{assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          Unassigned
                        </span>
                      )
                    ) : (
                      <span className="text-muted-foreground">
                        {getLocationLabel(ticket)}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-28 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
