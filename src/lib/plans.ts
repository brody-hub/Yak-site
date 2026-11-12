import type { BillingPlan } from "@/lib/api"

/** Formatting shared by the landing page, sign up and Billing. */

export type BillingInterval = "monthly" | "annual"

export function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value)
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatHistory(days: number | null) {
  if (days === null) {
    return "Custom"
  }

  if (days < 365) {
    return `${days} days`
  }

  const months = Math.round(days / 30.4)
  return months % 12 === 0 ? `${months / 12} year${months === 12 ? "" : "s"}` : `${months} months`
}

/** "Up to 500", "2,501 to 10,000", "500,001+". */
export function mauRange(tier: BillingPlan, previous: BillingPlan | undefined) {
  if (tier.mauCap === null) {
    return `${formatNumber((previous?.mauCap ?? 0) + 1)}+`
  }

  return previous?.mauCap
    ? `${formatNumber(previous.mauCap + 1)} to ${formatNumber(tier.mauCap)}`
    : `Up to ${formatNumber(tier.mauCap)}`
}

/** Tiers a customer can pay for online; Scale is arranged with the team. */
export function isCheckoutPlan(tier: BillingPlan) {
  return tier.id !== "free" && tier.id !== "scale" && tier.monthlyPrice !== null
}

/** The headline price for a tier, per month, on the chosen interval. */
export function priceLabel(tier: BillingPlan, interval: BillingInterval) {
  if (tier.monthlyPrice === null) {
    return { amount: "Custom", note: "Talk to us" }
  }

  if (tier.monthlyPrice === 0) {
    return { amount: "$0", note: "Free forever" }
  }

  if (interval === "annual" && tier.annualPrice !== null) {
    return {
      amount: formatPrice(Math.round(tier.annualPrice / 12)),
      note: `per month, ${formatPrice(tier.annualPrice)} billed yearly`,
    }
  }

  return { amount: formatPrice(tier.monthlyPrice), note: "per month" }
}

export function planName(plans: BillingPlan[], id: BillingPlan["id"]) {
  return plans.find((tier) => tier.id === id)?.name ?? id
}
