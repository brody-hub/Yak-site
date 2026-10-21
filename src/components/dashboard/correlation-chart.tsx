import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
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

export type CorrelationRow = { date: string } & Record<string, number | string | null>

/**
 * One series as bars on the left axis with any number of lines on the right.
 *
 * The two measures have different units, so this is deliberately a two-axis
 * chart: its job is to show whether the shapes move together, and the tooltip
 * carries the real values for both.
 */
export function CorrelationChart({
  data,
  config,
  barKey,
  lineKeys,
  formatBar,
  formatLine,
}: {
  data: CorrelationRow[]
  config: ChartConfig
  /** Null when the bar series is unavailable; the lines still draw. */
  barKey: string | null
  lineKeys: string[]
  formatBar: (value: number) => string
  formatLine: (value: number) => string
}) {
  const formatFor = (key: string) => (key === barKey ? formatBar : formatLine)

  return (
    <ChartContainer
      config={config}
      style={{ height: "100%" }}
      className="aspect-auto h-full min-h-0 w-full"
    >
      <ComposedChart data={data} accessibilityLayer barCategoryGap="20%">
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(value: string) => formatShortDate(value)}
        />
        {barKey ? (
          <YAxis
            yAxisId="bars"
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(value: number) => formatBar(value)}
          />
        ) : null}
        <YAxis
          yAxisId="lines"
          orientation="right"
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(value: number) => formatLine(value)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => formatShortDate(String(label))}
              formatter={(value, name, item) => {
                const key = String(name)
                const label = config[key]?.label ?? key

                return (
                  <>
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{ background: item.color }}
                    />
                    <span className="text-muted-foreground flex-1">{label}</span>
                    <span className="text-foreground font-mono font-medium tabular-nums">
                      {formatFor(key)(Number(value))}
                    </span>
                  </>
                )
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {barKey ? (
          <Bar
            yAxisId="bars"
            dataKey={barKey}
            fill={`var(--color-${barKey})`}
            fillOpacity={0.45}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        ) : null}
        {lineKeys.map((key) => (
          <Line
            key={key}
            yAxisId="lines"
            dataKey={key}
            type="monotone"
            stroke={`var(--color-${key})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
            isAnimationActive={false}
          />
        ))}
      </ComposedChart>
    </ChartContainer>
  )
}
