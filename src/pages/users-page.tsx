import * as React from "react"
import { SearchIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { appUsersApi } from "@/lib/api"
import {
  formatUserDate,
  getPlanLabel,
  getPlatformLabel,
  getSubscriptionLabel,
  type AppUser,
} from "@/lib/app-users"
import {
  formatReportDateShort,
  getReportPriorityLabel,
  getReportStatusLabel,
  getReportTypeLabel,
  type ReportPriority,
  type SupportReport,
} from "@/lib/reports"
import { cn } from "@/lib/utils"

const priorityStyles: Record<ReportPriority, string> = {
  urgent: "border-red-500/40 text-red-500",
  high: "border-orange-500/40 text-orange-500",
  medium: "border-border text-muted-foreground",
  low: "border-border text-muted-foreground",
}

export function UsersPage() {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<AppUser[]>([])
  // Size of the whole roster. Null until the first response arrives.
  const [total, setTotal] = React.useState<number | null>(null)
  const [searching, setSearching] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const trimmed = query.trim()
  const hasQuery = trimmed.length > 0

  // With no query the API returns the most recently added users, so the page
  // shows the sync is working before anyone types. A typed search is debounced
  // so a request is not fired on every keystroke.
  React.useEffect(() => {
    setSearching(true)
    const controller = new AbortController()

    const timer = setTimeout(
      () => {
        appUsersApi
          .list(trimmed)
          .then((response) => {
            if (!controller.signal.aborted) {
              setResults(response.users)
              setTotal(response.total)
              setError(null)
            }
          })
          .catch(() => {
            if (!controller.signal.aborted) {
              setError(
                hasQuery
                  ? "Search failed. Try again."
                  : "Could not load users. Try again."
              )
            }
          })
          .finally(() => {
            if (!controller.signal.aborted) {
              setSearching(false)
            }
          })
      },
      hasQuery ? 250 : 0
    )

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [trimmed, hasQuery])

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 lg:px-6">
        <div className="space-y-1 text-center sm:text-left">
          <h2 className="text-lg font-semibold tracking-tight">Users</h2>
          <p className="text-sm text-muted-foreground">
            Search by name, email, or user ID.
            {total !== null && total > 0
              ? ` ${formatUserCount(total)} synced from your app.`
              : null}
          </p>
        </div>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users…"
            className="h-11 pl-9 text-base md:text-sm"
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="space-y-2">
          {error ? (
            <p className="text-destructive py-10 text-center text-sm">
              {error}
            </p>
          ) : searching && results.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              {hasQuery
                ? `No users match “${trimmed}”.`
                : total === 0
                  ? "No users have been synced yet. They appear here once your app calls the user sync endpoint."
                  : "Start typing to find a user."}
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {hasQuery
                  ? `${results.length} result${results.length === 1 ? "" : "s"}`
                  : "Recently added"}
              </p>
              <ul className="divide-y overflow-hidden rounded-xl border">
                {results.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(user.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <img
                        src={user.avatar}
                        alt=""
                        className="size-9 rounded-full bg-muted"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{user.name}</div>
                        <div className="truncate text-sm text-muted-foreground">
                          {user.email ?? "No email on file"}
                        </div>
                        <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                          {user.id}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant="outline">
                          {getPlanLabel(user.plan)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          <span className="capitalize">{user.status}</span>
                          {user.platform
                            ? ` · ${getPlatformLabel(user.platform)}`
                            : null}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <UserDetailSheet
        userId={selectedId}
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null)
          }
        }}
      />
    </div>
  )
}

function formatUserCount(total: number) {
  return `${new Intl.NumberFormat().format(total)} user${total === 1 ? "" : "s"}`
}

function UserDetailSheet({
  userId,
  open,
  onOpenChange,
}: {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [user, setUser] = React.useState<AppUser | null>(null)
  const [supportHistory, setSupportHistory] = React.useState<SupportReport[]>(
    []
  )
  const [loading, setLoading] = React.useState(false)

  // Support history lives on the detail endpoint, so the sheet loads its own
  // data rather than reusing the search result.
  React.useEffect(() => {
    if (!userId) {
      return
    }

    let cancelled = false
    setLoading(true)
    setUser(null)

    appUsersApi
      .detail(userId)
      .then((detail) => {
        if (!cancelled) {
          setUser(detail.user)
          setSupportHistory(detail.reports)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null)
          setSupportHistory([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {loading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : user ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3 pr-8">
                <img
                  src={user.avatar}
                  alt=""
                  className="size-12 rounded-full bg-muted"
                />
                <div className="min-w-0">
                  <SheetTitle>{user.name}</SheetTitle>
                  <SheetDescription className="truncate">
                    {user.email ?? "No email on file"}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-6 px-4 pb-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Subscription</h3>
                <div className="space-y-3 rounded-xl border p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-medium">
                      {getSubscriptionLabel(user)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline" className="capitalize">
                      {user.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Product</span>
                    <span>{getPlanLabel(user.plan)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Platform</span>
                    <span>{getPlatformLabel(user.platform)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">
                      {user.status === "trialing"
                        ? "Trial ends"
                        : user.renewsAt
                          ? "Renews"
                          : "Billing"}
                    </span>
                    <span>
                      {user.renewsAt
                        ? formatUserDate(user.renewsAt)
                        : "No active subscription"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Member since</span>
                    <span>{formatUserDate(user.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">User ID</span>
                    <span className="font-mono text-xs">{user.id}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">Support history</h3>
                  <span className="text-xs text-muted-foreground">
                    {supportHistory.length} ticket
                    {supportHistory.length === 1 ? "" : "s"}
                  </span>
                </div>

                {supportHistory.length > 0 ? (
                  <ul className="divide-y overflow-hidden rounded-xl border">
                    {supportHistory.map((report) => (
                      <SupportHistoryItem key={report.id} report={report} />
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">
                    No support tickets for this user.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <SheetHeader>
            <SheetTitle>User not found</SheetTitle>
            <SheetDescription>
              This user may no longer exist.
            </SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  )
}

function SupportHistoryItem({ report }: { report: SupportReport }) {
  return (
    <li className="space-y-1.5 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">
          #{report.number}
        </span>
        <Badge variant="secondary" className="capitalize">
          {getReportTypeLabel(report.type).replace(/s$/, "")}
        </Badge>
        <Badge variant="outline" className={cn(priorityStyles[report.priority])}>
          {getReportPriorityLabel(report.priority)}
        </Badge>
        <Badge variant="outline">{getReportStatusLabel(report.status)}</Badge>
      </div>
      <p className="text-sm font-medium">{report.subject}</p>
      <p className="line-clamp-2 text-sm text-muted-foreground">{report.body}</p>
      <p className="text-xs text-muted-foreground">
        Updated {formatReportDateShort(report.updatedAt)}
      </p>
    </li>
  )
}
