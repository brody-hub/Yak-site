import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreVerticalIcon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Chrome shared by every dashboard tile: the title, the per-tile menu, and the
 * loading, error, and empty states so no individual widget has to repeat them.
 */
export function WidgetShell({
  title,
  subtitle,
  editing,
  onConfigure,
  onRemove,
  onMove,
  canMoveUp,
  canMoveDown,
  className,
  children,
}: {
  title: string
  subtitle?: string | null
  editing: boolean
  onConfigure: () => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
  canMoveUp: boolean
  canMoveDown: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card className={cn("@container/card flex flex-col", className)}>
      <CardHeader className="gap-1 pb-2">
        <CardDescription className="line-clamp-1">{title}</CardDescription>
        {subtitle ? (
          <p className="text-muted-foreground text-xs">{subtitle}</p>
        ) : null}
        {editing ? (
          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={`Configure ${title}`}
                >
                  <MoreVerticalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onConfigure}>
                  <SettingsIcon />
                  Configure
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!canMoveUp}
                  onSelect={() => onMove(-1)}
                >
                  <ChevronLeftIcon />
                  Move earlier
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!canMoveDown}
                  onSelect={() => onMove(1)}
                >
                  <ChevronRightIcon />
                  Move later
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={onRemove}>
                  <Trash2Icon />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
    </Card>
  )
}

export function WidgetLoading({ lines = 2 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className="h-6 w-full" />
      ))}
    </div>
  )
}

export function WidgetMessage({
  message,
  tone = "muted",
}: {
  message: string
  tone?: "muted" | "error"
}) {
  return (
    <p
      className={cn(
        "text-sm",
        tone === "error" ? "text-destructive" : "text-muted-foreground"
      )}
    >
      {message}
    </p>
  )
}

/** Big number plus a caption, the shape most tiles reduce to. */
export function WidgetStat({
  value,
  hint,
}: {
  value: string
  hint?: string | null
}) {
  return (
    <div className="space-y-1">
      <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
        {value}
      </CardTitle>
      {hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  )
}

/** Compact label/value rows used by the breakdown tiles. */
export function WidgetRows({
  rows,
}: {
  rows: { label: string; value: string; hint?: string }[]
}) {
  return (
    <dl className="divide-y">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0"
        >
          <dt className="text-sm">
            {row.label}
            {row.hint ? (
              <span className="text-muted-foreground ml-2 text-xs">
                {row.hint}
              </span>
            ) : null}
          </dt>
          <dd className="text-sm font-medium tabular-nums">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
