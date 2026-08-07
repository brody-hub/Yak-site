export type SprintDurationWeeks = 1 | 2

export type TicketStatus = "backlog" | "todo" | "in_progress" | "done"
export type TicketPriority = "urgent" | "high" | "medium" | "low"

export const BACKLOG_VIEW_ID = "backlog"

export type Sprint = {
  id: string
  name: string
  durationWeeks: SprintDurationWeeks
  startDate: string
  endDate: string
}

export type Ticket = {
  id: string
  number: number
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  sprintId: string | null
  assigneeId: string | null
  createdAt: string
  updatedAt: string
}

export type TicketHistoryField =
  | "status"
  | "priority"
  | "assigneeId"
  | "sprintId"
  | "title"
  | "description"

export type TicketHistoryEntry = {
  id: string
  ticketId: string
  type: "created" | "updated"
  field?: TicketHistoryField
  from?: string | null
  to?: string | null
  actorId: string | null
  createdAt: string
}

export type TicketFilters = {
  status: TicketStatus | "all"
  priority: TicketPriority | "all"
  assigneeId: string | "all" | "unassigned"
}

export const DEFAULT_TICKET_FILTERS: TicketFilters = {
  status: "all",
  priority: "all",
  assigneeId: "all",
}

export const TICKET_STATUSES: {
  id: TicketStatus
  label: string
}[] = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "Todo" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
]

export const TICKET_PRIORITIES: {
  id: TicketPriority
  label: string
}[] = [
  { id: "urgent", label: "Urgent" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
]

function addDays(isoDate: string, days: number) {
  const date = new Date(isoDate)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString()
}

export function createSprintDates(
  startDate: string,
  durationWeeks: SprintDurationWeeks
) {
  return {
    startDate,
    endDate: addDays(startDate, durationWeeks * 7 - 1),
  }
}

export const DEMO_SPRINTS: Sprint[] = [
  {
    id: "sprint-1",
    name: "Sprint 12",
    durationWeeks: 2,
    ...createSprintDates("2026-07-28T00:00:00.000Z", 2),
  },
  {
    id: "sprint-2",
    name: "Sprint 13",
    durationWeeks: 1,
    ...createSprintDates("2026-08-11T00:00:00.000Z", 1),
  },
]

export const DEMO_TICKETS: Ticket[] = [
  {
    id: "t1",
    number: 101,
    title: "Polish dashboard KPI cards",
    description:
      "Tighten spacing and make trend badges match the primary color system.",
    status: "in_progress",
    priority: "high",
    sprintId: "sprint-2",
    assigneeId: "2",
    createdAt: "2026-08-04T14:00:00.000Z",
    updatedAt: "2026-08-06T10:20:00.000Z",
  },
  {
    id: "t2",
    number: 102,
    title: "Add report triage filters",
    description:
      "Allow filtering reports by status and severity in the support inbox.",
    status: "todo",
    priority: "medium",
    sprintId: "sprint-2",
    assigneeId: "3",
    createdAt: "2026-08-05T09:30:00.000Z",
    updatedAt: "2026-08-05T09:30:00.000Z",
  },
  {
    id: "t3",
    number: 103,
    title: "Ship theme branding upload",
    description:
      "Logo upload and app name should persist locally for the demo.",
    status: "done",
    priority: "high",
    sprintId: "sprint-1",
    assigneeId: "1",
    createdAt: "2026-07-29T11:00:00.000Z",
    updatedAt: "2026-08-03T16:45:00.000Z",
  },
  {
    id: "t4",
    number: 104,
    title: "Define sprint capacity view",
    description: "Show assigned ticket count per system user for the sprint.",
    status: "backlog",
    priority: "low",
    sprintId: null,
    assigneeId: null,
    createdAt: "2026-08-06T12:00:00.000Z",
    updatedAt: "2026-08-06T12:00:00.000Z",
  },
  {
    id: "t5",
    number: 105,
    title: "Improve user activity log",
    description: "Group activity by day and add filter chips for action type.",
    status: "todo",
    priority: "urgent",
    sprintId: "sprint-2",
    assigneeId: "1",
    createdAt: "2026-08-06T13:15:00.000Z",
    updatedAt: "2026-08-06T13:15:00.000Z",
  },
  {
    id: "t6",
    number: 106,
    title: "Notification digests for assignees",
    description: "Email a daily digest when assigned tickets change status.",
    status: "backlog",
    priority: "medium",
    sprintId: null,
    assigneeId: "2",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
  },
  {
    id: "t7",
    number: 107,
    title: "Bulk permission editing",
    description: "Select multiple panel users and apply section permissions.",
    status: "todo",
    priority: "high",
    sprintId: null,
    assigneeId: null,
    createdAt: "2026-08-02T15:20:00.000Z",
    updatedAt: "2026-08-02T15:20:00.000Z",
  },
]

export const DEMO_TICKET_HISTORY: TicketHistoryEntry[] = [
  {
    id: "th1",
    ticketId: "t1",
    type: "created",
    actorId: "1",
    createdAt: "2026-08-04T14:00:00.000Z",
  },
  {
    id: "th2",
    ticketId: "t1",
    type: "updated",
    field: "status",
    from: "todo",
    to: "in_progress",
    actorId: "2",
    createdAt: "2026-08-05T09:10:00.000Z",
  },
  {
    id: "th3",
    ticketId: "t1",
    type: "updated",
    field: "assigneeId",
    from: null,
    to: "2",
    actorId: "1",
    createdAt: "2026-08-05T09:12:00.000Z",
  },
  {
    id: "th4",
    ticketId: "t1",
    type: "updated",
    field: "priority",
    from: "medium",
    to: "high",
    actorId: "1",
    createdAt: "2026-08-06T10:20:00.000Z",
  },
  {
    id: "th5",
    ticketId: "t3",
    type: "created",
    actorId: "1",
    createdAt: "2026-07-29T11:00:00.000Z",
  },
  {
    id: "th6",
    ticketId: "t3",
    type: "updated",
    field: "status",
    from: "todo",
    to: "in_progress",
    actorId: "1",
    createdAt: "2026-07-30T15:00:00.000Z",
  },
  {
    id: "th7",
    ticketId: "t3",
    type: "updated",
    field: "status",
    from: "in_progress",
    to: "done",
    actorId: "1",
    createdAt: "2026-08-03T16:45:00.000Z",
  },
  {
    id: "th8",
    ticketId: "t5",
    type: "created",
    actorId: "1",
    createdAt: "2026-08-06T13:15:00.000Z",
  },
  {
    id: "th9",
    ticketId: "t5",
    type: "updated",
    field: "priority",
    from: "high",
    to: "urgent",
    actorId: "1",
    createdAt: "2026-08-06T13:40:00.000Z",
  },
  {
    id: "th10",
    ticketId: "t2",
    type: "created",
    actorId: "3",
    createdAt: "2026-08-05T09:30:00.000Z",
  },
  {
    id: "th11",
    ticketId: "t2",
    type: "updated",
    field: "sprintId",
    from: null,
    to: "sprint-2",
    actorId: "1",
    createdAt: "2026-08-05T11:00:00.000Z",
  },
]

export function formatSprintRange(sprint: Sprint) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  })

  return `${formatter.format(new Date(sprint.startDate))} – ${formatter.format(new Date(sprint.endDate))}`
}

export function getStatusLabel(status: TicketStatus) {
  return TICKET_STATUSES.find((item) => item.id === status)?.label ?? status
}

export function getPriorityLabel(priority: TicketPriority) {
  return (
    TICKET_PRIORITIES.find((item) => item.id === priority)?.label ?? priority
  )
}

export function filterTickets(tickets: Ticket[], filters: TicketFilters) {
  return tickets.filter((ticket) => {
    if (filters.status !== "all" && ticket.status !== filters.status) {
      return false
    }

    if (filters.priority !== "all" && ticket.priority !== filters.priority) {
      return false
    }

    if (filters.assigneeId === "unassigned" && ticket.assigneeId !== null) {
      return false
    }

    if (
      filters.assigneeId !== "all" &&
      filters.assigneeId !== "unassigned" &&
      ticket.assigneeId !== filters.assigneeId
    ) {
      return false
    }

    return true
  })
}

export function hasActiveFilters(filters: TicketFilters) {
  return (
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.assigneeId !== "all"
  )
}
