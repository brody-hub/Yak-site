/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

import { tasksApi } from "@/lib/api"
import {
  BACKLOG_VIEW_ID,
  filterTickets,
  type Sprint,
  type SprintDurationWeeks,
  type Ticket,
  type TicketFilters,
  type TicketHistoryEntry,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/tasks"

type CreateTicketInput = {
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  sprintId: string | null
  assigneeId: string | null
}

type CreateSprintInput = {
  name: string
  durationWeeks: SprintDurationWeeks
  startDate: string
}

type TicketPatch = Partial<CreateTicketInput>

type TasksProviderState = {
  sprints: Sprint[]
  tickets: Ticket[]
  history: TicketHistoryEntry[]
  loading: boolean
  error: string | null
  activeViewId: string
  setActiveViewId: (viewId: string) => void
  refresh: () => Promise<void>
  createSprint: (input: CreateSprintInput) => Promise<Sprint>
  deleteSprint: (sprintId: string) => Promise<void>
  createTicket: (input: CreateTicketInput) => Promise<Ticket>
  updateTicket: (ticketId: string, patch: TicketPatch) => Promise<void>
  deleteTicket: (ticketId: string) => Promise<void>
  getTicket: (ticketId: string) => Ticket | undefined
  getSprint: (sprintId: string | null | undefined) => Sprint | undefined
  getTicketHistory: (ticketId: string) => TicketHistoryEntry[]
  getTicketsForView: (viewId: string, filters?: TicketFilters) => Ticket[]
}

const TasksContext = React.createContext<TasksProviderState | undefined>(
  undefined
)

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [sprints, setSprints] = React.useState<Sprint[]>([])
  const [tickets, setTickets] = React.useState<Ticket[]>([])
  const [history, setHistory] = React.useState<TicketHistoryEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeViewId, setActiveViewId] = React.useState(BACKLOG_VIEW_ID)

  // Set once, so a later refresh cannot yank the board out from under someone
  // who has already picked a sprint.
  const viewInitialized = React.useRef(false)

  const refresh = React.useCallback(async () => {
    try {
      const [nextSprints, nextTickets, nextHistory] = await Promise.all([
        tasksApi.sprints(),
        tasksApi.tickets(),
        tasksApi.history(),
      ])

      setSprints(nextSprints)
      setTickets(nextTickets)
      setHistory(nextHistory)
      setError(null)

      if (!viewInitialized.current) {
        viewInitialized.current = true
        setActiveViewId(nextSprints[0]?.id ?? BACKLOG_VIEW_ID)
      }
    } catch {
      setError("Could not load tasks. Try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const createSprint = React.useCallback(async (input: CreateSprintInput) => {
    const sprint = await tasksApi.createSprint(input)
    setSprints((current) => [sprint, ...current])
    setActiveViewId(sprint.id)
    return sprint
  }, [])

  const deleteSprint = React.useCallback(
    async (sprintId: string) => {
      await tasksApi.deleteSprint(sprintId)
      setSprints((current) => current.filter((item) => item.id !== sprintId))
      // Tickets are moved to the backlog server side rather than deleted.
      setTickets((current) =>
        current.map((ticket) =>
          ticket.sprintId === sprintId ? { ...ticket, sprintId: null } : ticket
        )
      )
      setActiveViewId((current) =>
        current === sprintId ? BACKLOG_VIEW_ID : current
      )
    },
    []
  )

  const createTicket = React.useCallback(async (input: CreateTicketInput) => {
    const ticket = await tasksApi.createTicket({
      ...input,
      title: input.title.trim(),
      description: input.description.trim(),
    })

    setTickets((current) => [ticket, ...current])

    // The server writes the "created" entry, so pull it back rather than
    // reconstructing it here.
    void tasksApi
      .ticketHistory(ticket.id)
      .then((entries) => setHistory((current) => [...entries, ...current]))
      .catch(() => undefined)

    return ticket
  }, [])

  const updateTicket = React.useCallback(
    async (ticketId: string, patch: TicketPatch) => {
      const previous = tickets.find((ticket) => ticket.id === ticketId)

      // Optimistic, because status changes come from dragging cards and the
      // board should not stutter while the request is in flight.
      setTickets((current) =>
        current.map((ticket) =>
          ticket.id === ticketId ? { ...ticket, ...patch } : ticket
        )
      )

      try {
        const updated = await tasksApi.updateTicket(ticketId, patch)

        setTickets((current) =>
          current.map((ticket) => (ticket.id === ticketId ? updated : ticket))
        )

        const entries = await tasksApi.ticketHistory(ticketId)
        setHistory((current) => [
          ...entries,
          ...current.filter((entry) => entry.ticketId !== ticketId),
        ])
      } catch (caught) {
        if (previous) {
          setTickets((current) =>
            current.map((ticket) =>
              ticket.id === ticketId ? previous : ticket
            )
          )
        }

        throw caught
      }
    },
    [tickets]
  )

  const deleteTicket = React.useCallback(async (ticketId: string) => {
    await tasksApi.deleteTicket(ticketId)
    setTickets((current) => current.filter((ticket) => ticket.id !== ticketId))
    setHistory((current) =>
      current.filter((entry) => entry.ticketId !== ticketId)
    )
  }, [])

  const getTicket = React.useCallback(
    (ticketId: string) => tickets.find((ticket) => ticket.id === ticketId),
    [tickets]
  )

  const getSprint = React.useCallback(
    (sprintId: string | null | undefined) =>
      sprintId ? sprints.find((sprint) => sprint.id === sprintId) : undefined,
    [sprints]
  )

  const getTicketHistory = React.useCallback(
    (ticketId: string) =>
      history
        .filter((entry) => entry.ticketId === ticketId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [history]
  )

  const getTicketsForView = React.useCallback(
    (viewId: string, filters?: TicketFilters) => {
      const scoped =
        viewId === BACKLOG_VIEW_ID
          ? tickets.filter((ticket) => ticket.sprintId === null)
          : tickets.filter((ticket) => ticket.sprintId === viewId)

      const sorted = [...scoped].sort((a, b) => b.number - a.number)
      return filters ? filterTickets(sorted, filters) : sorted
    },
    [tickets]
  )

  const value = React.useMemo(
    () => ({
      sprints,
      tickets,
      history,
      loading,
      error,
      activeViewId,
      setActiveViewId,
      refresh,
      createSprint,
      deleteSprint,
      createTicket,
      updateTicket,
      deleteTicket,
      getTicket,
      getSprint,
      getTicketHistory,
      getTicketsForView,
    }),
    [
      sprints,
      tickets,
      history,
      loading,
      error,
      activeViewId,
      refresh,
      createSprint,
      deleteSprint,
      createTicket,
      updateTicket,
      deleteTicket,
      getTicket,
      getSprint,
      getTicketHistory,
      getTicketsForView,
    ]
  )

  return (
    <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
  )
}

export function useTasks() {
  const context = React.useContext(TasksContext)

  if (context === undefined) {
    throw new Error("useTasks must be used within a TasksProvider")
  }

  return context
}
