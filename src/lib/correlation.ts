import type { SideshiftSeriesPoint } from "@/lib/sideshift"

/**
 * Pure helpers for the dashboard's views-vs-revenue tile.
 */

/**
 * Line colours for the overlays, in the order they are assigned. Both modes
 * were validated together (lightness band, chroma, colour-vision separation,
 * contrast) so a creator keeps the same hue in light and dark. Each slot is a
 * fixed hue: the first overlay is always orange, whatever else is shown.
 */
export const OVERLAY_COLORS: { light: string; dark: string }[] = [
  { light: "#eb6834", dark: "#d95926" },
  { light: "#1baf7a", dark: "#199e70" },
  { light: "#6250d6", dark: "#9085e9" },
  { light: "#e87ba4", dark: "#d55181" },
]

/**
 * Sums daily views into the calendar's buckets. Each calendar date opens a
 * bucket that runs until the next one, so a daily calendar maps one to one
 * and a weekly or monthly one collects every day it covers. Days before the
 * first bucket are dropped.
 */
export function bucketByCalendar(
  calendar: string[],
  daily: SideshiftSeriesPoint[]
): number[] {
  const sums = calendar.map(() => 0)
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date))
  let bucket = 0

  for (const point of sorted) {
    if (point.date < (calendar[0] ?? "")) {
      continue
    }

    while (
      bucket + 1 < calendar.length &&
      point.date >= (calendar[bucket + 1] ?? "")
    ) {
      bucket += 1
    }

    sums[bucket] = (sums[bucket] ?? 0) + point.views
  }

  return sums
}
