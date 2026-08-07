export type AnalyticsEvent = {
  id: string
  name: string
  userId: string
  userName: string
  platform: "ios" | "android" | "web"
  properties: Record<string, string | number | boolean>
  createdAt: string
}

export type EventNameStat = {
  name: string
  count: number
  uniqueUsers: number
  change: number
}

export type DailyEventPoint = {
  date: string
  events: number
  users: number
}

export const DEMO_EVENT_SUMMARY = {
  totalEvents7d: 128_440,
  uniqueUsers7d: 6_812,
  eventsToday: 18_902,
  eventsChange: 9.4,
  topEvent: "screen_viewed",
}

export const DEMO_EVENT_TREND: DailyEventPoint[] = [
  { date: "2026-07-31", events: 15240, users: 920 },
  { date: "2026-08-01", events: 16880, users: 1012 },
  { date: "2026-08-02", events: 14110, users: 874 },
  { date: "2026-08-03", events: 18940, users: 1188 },
  { date: "2026-08-04", events: 17620, users: 1095 },
  { date: "2026-08-05", events: 20150, users: 1240 },
  { date: "2026-08-06", events: 25500, users: 1483 },
]

export const DEMO_EVENT_STATS: EventNameStat[] = [
  {
    name: "screen_viewed",
    count: 42_180,
    uniqueUsers: 5_420,
    change: 6.2,
  },
  {
    name: "button_tapped",
    count: 28_940,
    uniqueUsers: 4_110,
    change: 11.8,
  },
  {
    name: "paywall_shown",
    count: 9_640,
    uniqueUsers: 3_880,
    change: 4.1,
  },
  {
    name: "trial_started",
    count: 1_240,
    uniqueUsers: 1_180,
    change: 14.5,
  },
  {
    name: "purchase_completed",
    count: 486,
    uniqueUsers: 462,
    change: 8.9,
  },
  {
    name: "onboarding_completed",
    count: 2_110,
    uniqueUsers: 2_040,
    change: -2.3,
  },
  {
    name: "push_opened",
    count: 3_720,
    uniqueUsers: 2_650,
    change: 19.2,
  },
  {
    name: "search_performed",
    count: 5_890,
    uniqueUsers: 1_970,
    change: 3.4,
  },
]

export const DEMO_RECENT_EVENTS: AnalyticsEvent[] = [
  {
    id: "e1",
    name: "purchase_completed",
    userId: "u_1842",
    userName: "Maya Chen",
    platform: "ios",
    properties: { product: "pro_annual", price: 79.99 },
    createdAt: "2026-08-06T21:14:00.000Z",
  },
  {
    id: "e2",
    name: "paywall_shown",
    userId: "u_2091",
    userName: "Noah Patel",
    platform: "android",
    properties: { placement: "home_banner", variant: "A" },
    createdAt: "2026-08-06T21:12:00.000Z",
  },
  {
    id: "e3",
    name: "button_tapped",
    userId: "u_773",
    userName: "Sofia Alvarez",
    platform: "ios",
    properties: { button: "start_workout", screen: "home" },
    createdAt: "2026-08-06T21:11:00.000Z",
  },
  {
    id: "e4",
    name: "trial_started",
    userId: "u_3301",
    userName: "Liam Brooks",
    platform: "web",
    properties: { product: "pro_monthly", source: "onboarding" },
    createdAt: "2026-08-06T21:08:00.000Z",
  },
  {
    id: "e5",
    name: "screen_viewed",
    userId: "u_1190",
    userName: "Ava Nguyen",
    platform: "ios",
    properties: { screen: "stats", tab: "weekly" },
    createdAt: "2026-08-06T21:06:00.000Z",
  },
  {
    id: "e6",
    name: "push_opened",
    userId: "u_552",
    userName: "Ethan Cole",
    platform: "android",
    properties: { campaign: "streak_reminder" },
    createdAt: "2026-08-06T21:03:00.000Z",
  },
  {
    id: "e7",
    name: "onboarding_completed",
    userId: "u_4410",
    userName: "Harper Diaz",
    platform: "ios",
    properties: { steps: 5, duration_sec: 142 },
    createdAt: "2026-08-06T20:58:00.000Z",
  },
  {
    id: "e8",
    name: "search_performed",
    userId: "u_882",
    userName: "Owen Kim",
    platform: "web",
    properties: { query: "hiit", results: 18 },
    createdAt: "2026-08-06T20:55:00.000Z",
  },
  {
    id: "e9",
    name: "button_tapped",
    userId: "u_2091",
    userName: "Noah Patel",
    platform: "android",
    properties: { button: "subscribe", screen: "paywall" },
    createdAt: "2026-08-06T20:52:00.000Z",
  },
  {
    id: "e10",
    name: "screen_viewed",
    userId: "u_1842",
    userName: "Maya Chen",
    platform: "ios",
    properties: { screen: "profile" },
    createdAt: "2026-08-06T20:49:00.000Z",
  },
]

export function formatEventCount(value: number) {
  return new Intl.NumberFormat(undefined).format(value)
}

export function formatEventPercent(value: number) {
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

export function formatEventTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function formatProperties(properties: AnalyticsEvent["properties"]) {
  return Object.entries(properties)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(" · ")
}
