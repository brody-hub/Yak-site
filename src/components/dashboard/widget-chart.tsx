import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatShortDate } from "@/lib/kpis"

export type ChartStyle = "area" | "line" | "bar"

export function asChartStyle(value: unknown): ChartStyle {
  return value === "line" || value === "bar" ? value : "area"
}

/**
 * One time series renderer for every trend tile.
 *
 * The tile picks the visual style; the series definitions and value formatting
 * come from the widget so a revenue chart shows currency and an event chart
 * shows counts.
 */
export function WidgetChart({
  data,
  config,
  series,
  height = 240,
  fill = false,
  formatValue,
  showLegend,
}: {
  data: Record<string, unknown>[]
  config: ChartConfig
  series: { key: string; style: ChartStyle }[]
  /** Fixed pixel height. Ignored when `fill` is set. */
  height?: number
  /** Stretch to the parent's height, for tiles the user can resize. */
  fill?: boolean
  formatValue?: (value: number) => string
  showLegend?: boolean
}) {
  const axes = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey="date"
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        minTickGap={24}
        tickFormatter={(value: string) => formatShortDate(value)}
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        width={52}
        tickFormatter={(value: number) =>
          formatValue ? formatValue(value) : String(value)
        }
      />
      <ChartTooltip
        content={
          <ChartTooltipContent
            labelFormatter={(label) => formatShortDate(String(label))}
            formatter={
              formatValue
                ? (value) => formatValue(Number(value))
                : undefined
            }
          />
        }
      />
      {showLegend ? <ChartLegend content={<ChartLegendContent />} /> : null}
    </>
  )

  // Recharts needs a single chart element type, so the style of the first
  // series decides the container and every series renders in that style.
  const style = series[0]?.style ?? "area"

  return (
    <ChartContainer
      config={config}
      style={fill ? { height: "100%" } : { height }}
      className={fill ? "aspect-auto h-full min-h-0 w-full" : "w-full"}
    >
      {style === "bar" ? (
        <BarChart data={data} accessibilityLayer>
          {axes}
          {series.map((entry) => (
            <Bar
              key={entry.key}
              dataKey={entry.key}
              fill={`var(--color-${entry.key})`}
              radius={4}
            />
          ))}
        </BarChart>
      ) : style === "line" ? (
        <LineChart data={data} accessibilityLayer>
          {axes}
          {series.map((entry) => (
            <Line
              key={entry.key}
              dataKey={entry.key}
              type="monotone"
              stroke={`var(--color-${entry.key})`}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      ) : (
        <AreaChart data={data} accessibilityLayer>
          {axes}
          {series.map((entry) => (
            <Area
              key={entry.key}
              dataKey={entry.key}
              type="natural"
              fill={`var(--color-${entry.key})`}
              fillOpacity={0.18}
              stroke={`var(--color-${entry.key})`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      )}
    </ChartContainer>
  )
}
