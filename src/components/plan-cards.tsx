import { CheckIcon } from "lucide-react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { BillingPlan } from "@/lib/api"
import {
  type BillingInterval,
  formatHistory,
  mauRange,
  priceLabel,
} from "@/lib/plans"
import { cn } from "@/lib/utils"

/** Monthly or annual, with the annual saving spelled out. */
export function IntervalToggle({
  value,
  onChange,
}: {
  value: BillingInterval
  onChange: (value: BillingInterval) => void
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={value}
      onValueChange={(next) => {
        if (next) {
          onChange(next as BillingInterval)
        }
      }}
    >
      <ToggleGroupItem value="monthly" className="px-3">
        Monthly
      </ToggleGroupItem>
      <ToggleGroupItem value="annual" className="px-3">
        Annual · 2 months free
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

/**
 * The tier ladder as cards. On the landing page each card carries its own
 * call to action; on sign up the cards are the choice itself.
 */
export function PlanCards({
  plans,
  interval,
  selected,
  onSelect,
  renderAction,
  className,
}: {
  plans: BillingPlan[]
  interval: BillingInterval
  selected?: BillingPlan["id"]
  onSelect?: (plan: BillingPlan) => void
  renderAction?: (plan: BillingPlan) => React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}
      role={onSelect ? "radiogroup" : undefined}
    >
      {plans.map((tier, index) => {
        const price = priceLabel(tier, interval)
        const isSelected = selected === tier.id
        const selectable = Boolean(onSelect) && tier.id !== "scale"

        const body = (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{tier.name}</span>
              {isSelected ? (
                <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full">
                  <CheckIcon className="size-3.5" />
                </span>
              ) : null}
            </div>
            <div>
              <span className="text-2xl font-semibold tabular-nums">
                {price.amount}
              </span>
              <p className="text-muted-foreground text-xs">{price.note}</p>
            </div>
            <ul className="text-muted-foreground space-y-1 text-sm">
              <li>{mauRange(tier, plans[index - 1])} monthly active users</li>
              <li>
                {tier.adminSeats === null
                  ? "Unlimited admin seats"
                  : `${tier.adminSeats} admin seat`}
              </li>
              <li>{formatHistory(tier.historyDays)} of history</li>
              <li>{tier.support === "email" ? "Email support" : "Docs support"}</li>
            </ul>
            {renderAction ? <div className="mt-auto pt-2">{renderAction(tier)}</div> : null}
          </>
        )

        const classes = cn(
          "bg-card flex flex-col gap-3 rounded-xl border p-4 text-left",
          selectable && "hover:border-primary/60 cursor-pointer transition-colors",
          isSelected && "border-primary ring-primary/30 ring-2",
          onSelect && !selectable && "opacity-60"
        )

        return selectable ? (
          <button
            key={tier.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={classes}
            onClick={() => onSelect?.(tier)}
          >
            {body}
          </button>
        ) : (
          <div key={tier.id} className={classes}>
            {body}
          </div>
        )
      })}
    </div>
  )
}
