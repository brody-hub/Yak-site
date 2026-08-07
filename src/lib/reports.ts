export type ReportType = "bug" | "suggestion" | "support" | "report"

export type ReportStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed"

export type ReportPriority = "low" | "medium" | "high" | "urgent"

export type ReportMessage = {
  id: string
  authorType: "user" | "agent"
  authorName: string
  body: string
  createdAt: string
}

export type SupportReport = {
  id: string
  number: number
  type: ReportType
  status: ReportStatus
  priority: ReportPriority
  subject: string
  body: string
  userName: string
  userEmail: string
  platform: "ios" | "android" | "web"
  assigneeId: string | null
  createdAt: string
  updatedAt: string
  messages: ReportMessage[]
}

export type ReportTypeFilter = ReportType | "all"

export const REPORT_TYPES: {
  id: ReportTypeFilter
  label: string
  description: string
}[] = [
  {
    id: "all",
    label: "All inbox",
    description: "Everything from customers",
  },
  {
    id: "bug",
    label: "Bugs",
    description: "Crashes and product defects",
  },
  {
    id: "suggestion",
    label: "Suggestions",
    description: "Feature ideas and feedback",
  },
  {
    id: "support",
    label: "Support",
    description: "Account and how-to help",
  },
  {
    id: "report",
    label: "Reports",
    description: "User and content reports",
  },
]

export const REPORT_STATUSES: {
  id: ReportStatus
  label: string
}[] = [
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "waiting", label: "Waiting on user" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed" },
]

export const REPORT_PRIORITIES: {
  id: ReportPriority
  label: string
}[] = [
  { id: "urgent", label: "Urgent" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
]

export const DEMO_REPORTS: SupportReport[] = [
  {
    id: "r1",
    number: 2401,
    type: "bug",
    status: "open",
    priority: "urgent",
    subject: "App crashes when opening workout history",
    body: "Every time I tap History on iOS 18, the app freezes for a second then closes. Happens on Wi‑Fi and cellular.",
    userName: "Maya Chen",
    userEmail: "maya@example.com",
    platform: "ios",
    assigneeId: null,
    createdAt: "2026-08-06T18:40:00.000Z",
    updatedAt: "2026-08-06T18:40:00.000Z",
    messages: [
      {
        id: "m1",
        authorType: "user",
        authorName: "Maya Chen",
        body: "Every time I tap History on iOS 18, the app freezes for a second then closes. Happens on Wi‑Fi and cellular.",
        createdAt: "2026-08-06T18:40:00.000Z",
      },
    ],
  },
  {
    id: "r2",
    number: 2398,
    type: "support",
    status: "in_progress",
    priority: "high",
    subject: "Can't restore my Pro subscription",
    body: "I switched phones and Restore Purchases says nothing to restore. Receipt is under the same Apple ID.",
    userName: "Noah Patel",
    userEmail: "noah@example.com",
    platform: "ios",
    assigneeId: "2",
    createdAt: "2026-08-06T15:12:00.000Z",
    updatedAt: "2026-08-06T16:05:00.000Z",
    messages: [
      {
        id: "m2",
        authorType: "user",
        authorName: "Noah Patel",
        body: "I switched phones and Restore Purchases says nothing to restore. Receipt is under the same Apple ID.",
        createdAt: "2026-08-06T15:12:00.000Z",
      },
      {
        id: "m3",
        authorType: "agent",
        authorName: "Alex Rivera",
        body: "Thanks Noah — checking your RevenueCat customer ID now. Can you confirm the email on the Apple receipt?",
        createdAt: "2026-08-06T16:05:00.000Z",
      },
    ],
  },
  {
    id: "r3",
    number: 2394,
    type: "suggestion",
    status: "open",
    priority: "medium",
    subject: "Add dark mode schedule based on sunset",
    body: "Would love automatic dark mode that follows sunrise/sunset instead of only system setting.",
    userName: "Sofia Alvarez",
    userEmail: "sofia@example.com",
    platform: "android",
    assigneeId: null,
    createdAt: "2026-08-05T21:30:00.000Z",
    updatedAt: "2026-08-05T21:30:00.000Z",
    messages: [
      {
        id: "m4",
        authorType: "user",
        authorName: "Sofia Alvarez",
        body: "Would love automatic dark mode that follows sunrise/sunset instead of only system setting.",
        createdAt: "2026-08-05T21:30:00.000Z",
      },
    ],
  },
  {
    id: "r4",
    number: 2391,
    type: "report",
    status: "waiting",
    priority: "high",
    subject: "Reported spam in community feed",
    body: "User @shredbot99 is posting affiliate links in every comment thread.",
    userName: "Liam Brooks",
    userEmail: "liam@example.com",
    platform: "web",
    assigneeId: "3",
    createdAt: "2026-08-05T19:05:00.000Z",
    updatedAt: "2026-08-06T10:20:00.000Z",
    messages: [
      {
        id: "m5",
        authorType: "user",
        authorName: "Liam Brooks",
        body: "User @shredbot99 is posting affiliate links in every comment thread.",
        createdAt: "2026-08-05T19:05:00.000Z",
      },
      {
        id: "m6",
        authorType: "agent",
        authorName: "Jordan Lee",
        body: "Thanks — we temporarily hid the posts. Can you share a couple of links/screenshots if you still see them?",
        createdAt: "2026-08-06T10:20:00.000Z",
      },
    ],
  },
  {
    id: "r5",
    number: 2387,
    type: "bug",
    status: "resolved",
    priority: "medium",
    subject: "Timer keeps running after finishing a set",
    body: "Rest timer doesn't stop when I mark the set complete on Android 14.",
    userName: "Ava Nguyen",
    userEmail: "ava@example.com",
    platform: "android",
    assigneeId: "1",
    createdAt: "2026-08-04T14:00:00.000Z",
    updatedAt: "2026-08-05T11:45:00.000Z",
    messages: [
      {
        id: "m7",
        authorType: "user",
        authorName: "Ava Nguyen",
        body: "Rest timer doesn't stop when I mark the set complete on Android 14.",
        createdAt: "2026-08-04T14:00:00.000Z",
      },
      {
        id: "m8",
        authorType: "agent",
        authorName: "Admin",
        body: "Fixed in 2.14.1 — please update from the Play Store and let us know if it still happens.",
        createdAt: "2026-08-05T11:45:00.000Z",
      },
    ],
  },
  {
    id: "r6",
    number: 2382,
    type: "support",
    status: "open",
    priority: "low",
    subject: "How do I export my workout data?",
    body: "Looking for a CSV export of the last 90 days for my coach.",
    userName: "Ethan Cole",
    userEmail: "ethan@example.com",
    platform: "web",
    assigneeId: null,
    createdAt: "2026-08-04T09:18:00.000Z",
    updatedAt: "2026-08-04T09:18:00.000Z",
    messages: [
      {
        id: "m9",
        authorType: "user",
        authorName: "Ethan Cole",
        body: "Looking for a CSV export of the last 90 days for my coach.",
        createdAt: "2026-08-04T09:18:00.000Z",
      },
    ],
  },
  {
    id: "r7",
    number: 2379,
    type: "suggestion",
    status: "closed",
    priority: "low",
    subject: "Apple Watch complications for streak",
    body: "A watch face complication showing current streak would be awesome.",
    userName: "Harper Diaz",
    userEmail: "harper@example.com",
    platform: "ios",
    assigneeId: "2",
    createdAt: "2026-08-02T17:40:00.000Z",
    updatedAt: "2026-08-03T13:10:00.000Z",
    messages: [
      {
        id: "m10",
        authorType: "user",
        authorName: "Harper Diaz",
        body: "A watch face complication showing current streak would be awesome.",
        createdAt: "2026-08-02T17:40:00.000Z",
      },
      {
        id: "m11",
        authorType: "agent",
        authorName: "Alex Rivera",
        body: "Logged for the roadmap — closing this ticket and tracking it as a product request. Thanks!",
        createdAt: "2026-08-03T13:10:00.000Z",
      },
    ],
  },
  {
    id: "r8",
    number: 2375,
    type: "report",
    status: "open",
    priority: "urgent",
    subject: "Harassment in DMs",
    body: "Receiving threatening messages from another user after a leaderboard comment.",
    userName: "Owen Kim",
    userEmail: "owen@example.com",
    platform: "ios",
    assigneeId: null,
    createdAt: "2026-08-06T20:02:00.000Z",
    updatedAt: "2026-08-06T20:02:00.000Z",
    messages: [
      {
        id: "m12",
        authorType: "user",
        authorName: "Owen Kim",
        body: "Receiving threatening messages from another user after a leaderboard comment.",
        createdAt: "2026-08-06T20:02:00.000Z",
      },
    ],
  },
]

export function getReportTypeLabel(type: ReportType) {
  return REPORT_TYPES.find((item) => item.id === type)?.label ?? type
}

export function getReportStatusLabel(status: ReportStatus) {
  return REPORT_STATUSES.find((item) => item.id === status)?.label ?? status
}

export function getReportPriorityLabel(priority: ReportPriority) {
  return (
    REPORT_PRIORITIES.find((item) => item.id === priority)?.label ?? priority
  )
}

export function formatReportDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function formatReportDateShort(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

export function getReportsForUserEmail(
  reports: SupportReport[],
  email: string
) {
  return reports
    .filter(
      (report) => report.userEmail.toLowerCase() === email.toLowerCase()
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
}

export function countOpenByType(reports: SupportReport[]) {
  return reports.reduce(
    (acc, report) => {
      if (report.status === "resolved" || report.status === "closed") {
        return acc
      }

      acc.all += 1
      acc[report.type] += 1
      return acc
    },
    { all: 0, bug: 0, suggestion: 0, support: 0, report: 0 }
  )
}
