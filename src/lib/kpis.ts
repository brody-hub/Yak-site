export type KpiSectionId =
  | "overview"
  | "subscribers"
  | "trials"
  | "active"
  | "churn"
  | "revenue"
  | "connection"

export type KpiProviderId = "revenuecat" | "superwall"

export type KpiConnection = {
  provider: KpiProviderId
  apiKey: string
  connectedAt: string | null
}

export type KpiConnections = Record<KpiProviderId, KpiConnection>

export type DailyMetricPoint = {
  date: string
  subscribers: number
  trials: number
  revenue: number
  churn: number
}

export type SubscriberEvent = {
  id: string
  name: string
  email: string
  product: string
  plan: string
  status: "active" | "trialing" | "cancelled" | "expired"
  amount: number
  startedAt: string
}

export type TrialEvent = {
  id: string
  name: string
  email: string
  product: string
  daysLeft: number
  converted: boolean | null
  startedAt: string
}

export const KPI_SECTIONS: {
  id: KpiSectionId
  label: string
  description: string
}[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Snapshot of subscription health",
  },
  {
    id: "subscribers",
    label: "New subscribers",
    description: "Recent paid conversions",
  },
  {
    id: "trials",
    label: "Trials",
    description: "Trial starts and conversions",
  },
  {
    id: "active",
    label: "Active subscriptions",
    description: "Current paying customers",
  },
  {
    id: "churn",
    label: "Churn",
    description: "Cancellations and expirations",
  },
  {
    id: "revenue",
    label: "Revenue",
    description: "MRR, ARR, and proceeds",
  },
  {
    id: "connection",
    label: "Connection",
    description: "API keys for RevenueCat & Superwall",
  },
]

export const DEFAULT_KPI_CONNECTIONS: KpiConnections = {
  revenuecat: {
    provider: "revenuecat",
    apiKey: "rc_demo_sk_stand_8f3a2c91",
    connectedAt: "2026-08-01T12:00:00.000Z",
  },
  superwall: {
    provider: "superwall",
    apiKey: "",
    connectedAt: null,
  },
}

export const KPI_CONNECTIONS_STORAGE_KEY = "kpi-connections"

export const DEMO_SUMMARY = {
  mrr: 48250,
  arr: 579000,
  activeSubscriptions: 3842,
  newSubscribers7d: 186,
  newSubscribersChange: 12.4,
  trialsStarted7d: 412,
  trialConversionRate: 28.6,
  churnRate: 3.2,
  churned7d: 47,
  refunds7d: 9,
  revenue7d: 18420,
  revenueChange: 8.1,
}

export const DEMO_TREND: DailyMetricPoint[] = [
  { date: "2026-07-31", subscribers: 22, trials: 48, revenue: 2100, churn: 6 },
  { date: "2026-08-01", subscribers: 28, trials: 52, revenue: 2450, churn: 5 },
  { date: "2026-08-02", subscribers: 19, trials: 41, revenue: 1980, churn: 8 },
  { date: "2026-08-03", subscribers: 31, trials: 63, revenue: 2890, churn: 4 },
  { date: "2026-08-04", subscribers: 27, trials: 58, revenue: 2640, churn: 7 },
  { date: "2026-08-05", subscribers: 35, trials: 71, revenue: 3120, churn: 9 },
  { date: "2026-08-06", subscribers: 24, trials: 79, revenue: 3240, churn: 8 },
]

export const DEMO_SUBSCRIBERS: SubscriberEvent[] = [
  {
    id: "s1",
    name: "Maya Chen",
    email: "maya@example.com",
    product: "Stand Pro",
    plan: "Annual",
    status: "active",
    amount: 79.99,
    startedAt: "2026-08-06T14:22:00.000Z",
  },
  {
    id: "s2",
    name: "Noah Patel",
    email: "noah@example.com",
    product: "Stand Pro",
    plan: "Monthly",
    status: "active",
    amount: 9.99,
    startedAt: "2026-08-06T11:05:00.000Z",
  },
  {
    id: "s3",
    name: "Sofia Alvarez",
    email: "sofia@example.com",
    product: "Stand Plus",
    plan: "Monthly",
    status: "active",
    amount: 4.99,
    startedAt: "2026-08-05T20:41:00.000Z",
  },
  {
    id: "s4",
    name: "Liam Brooks",
    email: "liam@example.com",
    product: "Stand Pro",
    plan: "Annual",
    status: "active",
    amount: 79.99,
    startedAt: "2026-08-05T16:18:00.000Z",
  },
  {
    id: "s5",
    name: "Ava Nguyen",
    email: "ava@example.com",
    product: "Stand Plus",
    plan: "Annual",
    status: "active",
    amount: 39.99,
    startedAt: "2026-08-04T09:55:00.000Z",
  },
  {
    id: "s6",
    name: "Ethan Cole",
    email: "ethan@example.com",
    product: "Stand Pro",
    plan: "Monthly",
    status: "active",
    amount: 9.99,
    startedAt: "2026-08-03T22:10:00.000Z",
  },
]

export const DEMO_TRIALS: TrialEvent[] = [
  {
    id: "tr1",
    name: "Harper Diaz",
    email: "harper@example.com",
    product: "Stand Pro",
    daysLeft: 5,
    converted: null,
    startedAt: "2026-08-06T08:12:00.000Z",
  },
  {
    id: "tr2",
    name: "Owen Kim",
    email: "owen@example.com",
    product: "Stand Plus",
    daysLeft: 2,
    converted: null,
    startedAt: "2026-08-05T19:40:00.000Z",
  },
  {
    id: "tr3",
    name: "Isla Freya",
    email: "isla@example.com",
    product: "Stand Pro",
    daysLeft: 0,
    converted: true,
    startedAt: "2026-07-30T13:00:00.000Z",
  },
  {
    id: "tr4",
    name: "Jack Morgan",
    email: "jack@example.com",
    product: "Stand Pro",
    daysLeft: 0,
    converted: false,
    startedAt: "2026-07-29T10:25:00.000Z",
  },
  {
    id: "tr5",
    name: "Nora Wells",
    email: "nora@example.com",
    product: "Stand Plus",
    daysLeft: 6,
    converted: null,
    startedAt: "2026-08-06T15:33:00.000Z",
  },
  {
    id: "tr6",
    name: "Caleb Stone",
    email: "caleb@example.com",
    product: "Stand Pro",
    daysLeft: 1,
    converted: null,
    startedAt: "2026-08-04T07:48:00.000Z",
  },
]

export const DEMO_CHURN: SubscriberEvent[] = [
  {
    id: "c1",
    name: "Riley Quinn",
    email: "riley@example.com",
    product: "Stand Pro",
    plan: "Monthly",
    status: "cancelled",
    amount: 9.99,
    startedAt: "2026-08-06T10:00:00.000Z",
  },
  {
    id: "c2",
    name: "Sam Ortiz",
    email: "sam@example.com",
    product: "Stand Plus",
    plan: "Annual",
    status: "expired",
    amount: 39.99,
    startedAt: "2026-08-05T18:20:00.000Z",
  },
  {
    id: "c3",
    name: "Taylor Reed",
    email: "taylor@example.com",
    product: "Stand Pro",
    plan: "Monthly",
    status: "cancelled",
    amount: 9.99,
    startedAt: "2026-08-04T12:45:00.000Z",
  },
  {
    id: "c4",
    name: "Jamie Fox",
    email: "jamie@example.com",
    product: "Stand Plus",
    plan: "Monthly",
    status: "cancelled",
    amount: 4.99,
    startedAt: "2026-08-03T21:05:00.000Z",
  },
]

export function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value)
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined).format(value)
}

export function formatPercent(value: number) {
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function maskApiKey(key: string) {
  if (!key) {
    return ""
  }

  if (key.length <= 8) {
    return "••••••••"
  }

  return `${key.slice(0, 6)}${"•".repeat(Math.min(12, key.length - 10))}${key.slice(-4)}`
}

export function isConnected(connection: KpiConnection) {
  return Boolean(connection.apiKey.trim() && connection.connectedAt)
}
