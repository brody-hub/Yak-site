import * as React from "react"
import {
  BugIcon,
  CircleHelpIcon,
  FlagIcon,
  InboxIcon,
  LightbulbIcon,
  SearchIcon,
} from "lucide-react"
import { toast } from "sonner"

import { useSystemUsers } from "@/components/system-users-provider"
import { UserAvatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { reportsApi, type ReportCounts } from "@/lib/api"
import {
  formatReportDate,
  formatReportDateShort,
  getReportPriorityLabel,
  getReportStatusLabel,
  getReportTypeLabel,
  REPORT_PRIORITIES,
  REPORT_STATUSES,
  REPORT_TYPES,
  type ReportPriority,
  type ReportStatus,
  type ReportType,
  type ReportTypeFilter,
  type SupportReport,
} from "@/lib/reports"
import { cn } from "@/lib/utils"

const typeIcons: Record<ReportTypeFilter, React.ReactNode> = {
  all: <InboxIcon className="size-4" />,
  bug: <BugIcon className="size-4" />,
  suggestion: <LightbulbIcon className="size-4" />,
  support: <CircleHelpIcon className="size-4" />,
  report: <FlagIcon className="size-4" />,
}

const priorityStyles: Record<ReportPriority, string> = {
  urgent: "border-red-500/40 text-red-500",
  high: "border-orange-500/40 text-orange-500",
  medium: "border-border text-muted-foreground",
  low: "border-border text-muted-foreground",
}

export function ReportsPage() {
  const { users } = useSystemUsers()
  const [reports, setReports] = React.useState<SupportReport[]>([])
  const [counts, setCounts] = React.useState<ReportCounts | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [typeFilter, setTypeFilter] = React.useState<ReportTypeFilter>("all")
  const [statusFilter, setStatusFilter] = React.useState<ReportStatus | "all">(
    "all"
  )
  const [query, setQuery] = React.useState("")
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const trimmedQuery = query.trim()
  const selected = reports.find((report) => report.id === selectedId) ?? null

  // Filtering and search run server side so the inbox scales past what the
  // browser could reasonably hold.
  React.useEffect(() => {
    let cancelled = false
    setLoading(true)

    const timer = setTimeout(() => {
      reportsApi
        .list({
          type: typeFilter === "all" ? undefined : typeFilter,
          status: statusFilter === "all" ? undefined : statusFilter,
          search: trimmedQuery || undefined,
          limit: 100,
        })
        .then((page) => {
          if (!cancelled) {
            setReports(page.data)
            setError(null)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError("Could not load reports.")
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false)
          }
        })
    }, trimmedQuery ? 250 : 0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [typeFilter, statusFilter, trimmedQuery])

  const refreshCounts = React.useCallback(() => {
    reportsApi
      .counts()
      .then(setCounts)
      .catch(() => undefined)
  }, [])

  React.useEffect(() => {
    refreshCounts()
  }, [refreshCounts])

  /** Replaces the row in the list with whatever the server returned. */
  const applyServerReport = React.useCallback(
    (updated: SupportReport) => {
      setReports((current) =>
        current.map((report) =>
          report.id === updated.id ? updated : report
        )
      )
      refreshCounts()
    },
    [refreshCounts]
  )

  const updateReport = React.useCallback(
    async (
      reportId: string,
      patch: Partial<Pick<SupportReport, "status" | "priority" | "assigneeId">>
    ) => {
      try {
        applyServerReport(await reportsApi.update(reportId, patch))
      } catch {
        toast.error("Could not update that ticket")
      }
    },
    [applyServerReport]
  )

  const replyToReport = React.useCallback(
    async (reportId: string, body: string) => {
      const trimmed = body.trim()

      if (!trimmed) {
        return
      }

      try {
        applyServerReport(await reportsApi.reply(reportId, { body: trimmed }))
        toast.success("Reply sent")
      } catch {
        toast.error("Could not send that reply")
      }
    },
    [applyServerReport]
  )

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="w-full shrink-0 border-b md:w-56 md:border-r md:border-b-0">
        <div className="flex flex-col gap-1 p-3 md:sticky md:top-0 md:py-4">
          <div className="px-2 pb-2">
            <p className="text-sm font-medium">Reports</p>
            <p className="text-xs text-muted-foreground">
              Customer service inbox
            </p>
          </div>
          <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {REPORT_TYPES.map((item) => {
              const active = typeFilter === item.id
              const count = counts?.[item.id]

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTypeFilter(item.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm whitespace-nowrap transition-colors",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {typeIcons[item.id]}
                  <span className="flex-1">{item.label}</span>
                  <span
                    className={cn(
                      "tabular-nums text-xs",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {count ?? ""}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-col gap-3 border-b px-4 py-4 lg:px-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">
              {REPORT_TYPES.find((item) => item.id === typeFilter)?.label ??
                "Inbox"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {
                REPORT_TYPES.find((item) => item.id === typeFilter)
                  ?.description
              }
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search subject, user, ID…"
                className="pl-8"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as ReportStatus | "all")
              }
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {REPORT_STATUSES.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && reports.length === 0 ? (
            <div className="space-y-3 p-4 lg:px-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="text-destructive flex h-48 items-center justify-center px-4 text-sm">
              {error}
            </div>
          ) : reports.length > 0 ? (
            <ul className="divide-y">
              {reports.map((report) => {
                const assignee = users.find(
                  (user) => user.id === report.assigneeId
                )

                return (
                  <li key={report.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(report.id)}
                      className={cn(
                        "flex w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50 lg:px-6",
                        selectedId === report.id && "bg-muted/60"
                      )}
                    >
                      <div className="mt-0.5 text-muted-foreground">
                        {typeIcons[report.type]}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            #{report.number}
                          </span>
                          <TypeBadge type={report.type} />
                          <Badge
                            variant="outline"
                            className={priorityStyles[report.priority]}
                          >
                            {getReportPriorityLabel(report.priority)}
                          </Badge>
                          <StatusBadge status={report.status} />
                        </div>
                        <p
                          className={cn(
                            "truncate text-sm",
                            report.status === "open"
                              ? "font-semibold"
                              : "font-medium"
                          )}
                        >
                          {report.subject}
                        </p>
                        <p className="line-clamp-1 text-sm text-muted-foreground">
                          {report.body}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            {report.userEmail
                              ? `${report.userName} · ${report.userEmail}`
                              : report.userName}
                          </span>
                          {report.platform ? (
                            <span className="capitalize">{report.platform}</span>
                          ) : null}
                          {assignee ? (
                            <span className="inline-flex items-center gap-1">
                              <UserAvatar user={assignee} size="sm" />
                              {assignee.name}
                            </span>
                          ) : (
                            <span>Unassigned</span>
                          )}
                          <span>{formatReportDateShort(report.updatedAt)}</span>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="flex h-48 items-center justify-center px-4 text-sm text-muted-foreground">
              No tickets match these filters.
            </div>
          )}
        </div>
      </div>

      <ReportDetailSheet
        report={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null)
          }
        }}
        onUpdate={updateReport}
        onReply={replyToReport}
      />
    </div>
  )
}

function ReportDetailSheet({
  report,
  open,
  onOpenChange,
  onUpdate,
  onReply,
}: {
  report: SupportReport | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (
    reportId: string,
    patch: Partial<Pick<SupportReport, "status" | "priority" | "assigneeId">>
  ) => Promise<void>
  onReply: (reportId: string, body: string) => Promise<void>
}) {
  const { users } = useSystemUsers()
  const [reply, setReply] = React.useState("")
  const [sending, setSending] = React.useState(false)

  React.useEffect(() => {
    setReply("")
  }, [report?.id, open])

  const sendReply = async () => {
    if (!report) {
      return
    }

    setSending(true)

    try {
      await onReply(report.id, reply)
      setReply("")
    } finally {
      setSending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        {report ? (
          <>
            <SheetHeader>
              <SheetDescription className="font-mono">
                #{report.number} · {getReportTypeLabel(report.type)}
              </SheetDescription>
              <SheetTitle>{report.subject}</SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-6 px-4 pb-6">
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge type={report.type} />
                <Badge
                  variant="outline"
                  className={priorityStyles[report.priority]}
                >
                  {getReportPriorityLabel(report.priority)}
                </Badge>
                <StatusBadge status={report.status} />
                {report.platform ? (
                  <Badge variant="outline" className="capitalize">
                    {report.platform}
                  </Badge>
                ) : null}
              </div>

              <div className="rounded-xl border p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{report.userName}</p>
                    <p className="text-muted-foreground">
                      {report.userEmail ?? "No email on file"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-1 text-muted-foreground">
                  <p>Created {formatReportDate(report.createdAt)}</p>
                  <p>Updated {formatReportDate(report.updatedAt)}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={report.status}
                    onValueChange={(value) =>
                      void onUpdate(report.id, {
                        status: value as ReportStatus,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_STATUSES.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={report.priority}
                    onValueChange={(value) =>
                      void onUpdate(report.id, {
                        priority: value as ReportPriority,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_PRIORITIES.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Select
                    value={report.assigneeId ?? "unassigned"}
                    onValueChange={(value) =>
                      void onUpdate(report.id, {
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

              <div className="space-y-3">
                <Label>Conversation</Label>
                <div className="space-y-3 rounded-xl border p-3">
                  {report.messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm",
                        message.authorType === "agent"
                          ? "bg-primary/10"
                          : "bg-muted/60"
                      )}
                    >
                      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium">
                          {message.authorName}
                          {message.authorType === "agent" ? (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              Agent
                            </span>
                          ) : null}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatReportDateShort(message.createdAt)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-foreground/90">
                        {message.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="report-reply">Reply</Label>
                <Textarea
                  id="report-reply"
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  rows={4}
                  placeholder="Write a reply to the customer…"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      void onUpdate(report.id, { status: "resolved" })
                    }
                  >
                    Mark resolved
                  </Button>
                  <Button
                    type="button"
                    disabled={!reply.trim() || sending}
                    onClick={() => void sendReply()}
                  >
                    {sending ? "Sending…" : "Send reply"}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <SheetHeader>
            <SheetTitle>Ticket not found</SheetTitle>
            <SheetDescription>
              This report may have been removed.
            </SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  )
}

function TypeBadge({ type }: { type: ReportType }) {
  return (
    <Badge variant="secondary" className="gap-1 capitalize">
      <span className="opacity-70">{typeIcons[type]}</span>
      {type === "report" ? "Report" : getReportTypeLabel(type).replace(/s$/, "")}
    </Badge>
  )
}

function StatusBadge({ status }: { status: ReportStatus }) {
  if (status === "open") {
    return <Badge>{getReportStatusLabel(status)}</Badge>
  }

  if (status === "in_progress") {
    return <Badge variant="outline">{getReportStatusLabel(status)}</Badge>
  }

  if (status === "waiting") {
    return <Badge variant="secondary">{getReportStatusLabel(status)}</Badge>
  }

  return (
    <Badge variant="outline" className="text-muted-foreground">
      {getReportStatusLabel(status)}
    </Badge>
  )
}
