import { cn } from "@/lib/utils"
import type { TicketStatus } from "@/lib/tasks"

type TicketStatusIconProps = {
  status: TicketStatus
  className?: string
  size?: number
}

const STATUS_COLORS: Record<TicketStatus, string> = {
  backlog: "#9ea1a9",
  todo: "#9ea1a9",
  in_progress: "#f2c94c",
  done: "#4cb782",
}

/** Linear-style pie progress: 0 empty, ~0.4 started, 1 complete */
const STATUS_PROGRESS: Record<TicketStatus, number> = {
  backlog: 0,
  todo: 0,
  in_progress: 0.4,
  done: 1,
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  }
}

function describePie(cx: number, cy: number, radius: number, progress: number) {
  if (progress <= 0) {
    return ""
  }

  if (progress >= 1) {
    return `M ${cx} ${cy} m -${radius}, 0 a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0`
  }

  const angle = progress * 360
  const start = polarToCartesian(cx, cy, radius, 0)
  const end = polarToCartesian(cx, cy, radius, angle)
  const largeArc = angle > 180 ? 1 : 0

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ")
}

export function TicketStatusIcon({
  status,
  className,
  size = 14,
}: TicketStatusIconProps) {
  const color = STATUS_COLORS[status]
  const progress = STATUS_PROGRESS[status]
  const cx = 8
  const cy = 8
  const radius = 6
  const strokeWidth = 1.5

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      {status === "backlog" ? (
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray="2.2 2.2"
          strokeLinecap="round"
        />
      ) : status === "todo" ? (
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
        />
      ) : status === "in_progress" ? (
        <>
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <path d={describePie(cx, cy, radius - 0.5, progress)} fill={color} />
        </>
      ) : (
        <>
          <circle cx={cx} cy={cy} r={radius + 0.5} fill={color} />
          <path
            d="M5.2 8.1 L7.1 10 L10.8 6.1"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  )
}
