import * as React from "react"
import { Link } from "react-router-dom"
import { CheckIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { API_URL } from "@/lib/api"
import { cn } from "@/lib/utils"

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "authentication", label: "Authentication" },
  { id: "reports", label: "Reports" },
  { id: "events", label: "Events" },
  { id: "users", label: "Users" },
  { id: "webhooks", label: "Webhooks" },
  { id: "errors", label: "Errors" },
  { id: "rate-limits", label: "Rate limits" },
] as const

export function DocumentationPage() {
  const { canManageUsers } = useAuth()
  const [activeId, setActiveId] = React.useState<string>(TOC[0].id)

  React.useEffect(() => {
    const headings = TOC.map((item) => document.getElementById(item.id)).filter(
      (node): node is HTMLElement => node !== null
    )

    if (headings.length === 0) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.25, 0.5, 1] }
    )

    for (const heading of headings) {
      observer.observe(heading)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
          <aside className="mb-6 lg:sticky lg:top-4 lg:mb-0 lg:self-start">
            <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
              On this page
            </p>
            <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
              {TOC.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={cn(
                    "text-muted-foreground hover:text-foreground shrink-0 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    activeId === item.id &&
                      "bg-muted text-foreground font-medium"
                  )}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          <article className="max-w-3xl space-y-10">
            <header className="space-y-3 border-b pb-8">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Ingest API
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">
                Integration documentation
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Send support reports, analytics events, and user sync into Stand
                from your app. Everything below uses the ingest API under{" "}
                <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                  /api/v1
                </code>
                , authenticated with an API key. This is separate from the
                panel API, which uses session cookies.
              </p>
              {canManageUsers ? (
                <p className="text-sm">
                  Create or rotate keys in{" "}
                  <Link
                    to="/settings/integrations"
                    className="underline underline-offset-4"
                  >
                    Settings → Integrations
                  </Link>
                  .
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Ask an owner or admin to create an API key under Settings →
                  Integrations.
                </p>
              )}
            </header>

            <DocSection id="overview" title="Overview">
              <p>
                Base URL for examples on this deployment:
              </p>
              <CodeBlock language="text" code={API_URL} />
              <p>
                Keys look like{" "}
                <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                  yak_live_…
                </code>
                . Treat them as server-side secrets — proxy through your own
                backend instead of shipping keys in a mobile binary or web
                bundle.
              </p>
              <DocTable
                headers={["Scope", "Grants"]}
                rows={[
                  ["reports:write", "Create reports, append reporter messages"],
                  ["reports:read", "Read report status and conversation"],
                  ["events:write", "Send analytics events"],
                  ["users:write", "Create and update app users"],
                ]}
              />
            </DocSection>

            <DocSection id="authentication" title="Authentication">
              <p>Send the key on every request, either way:</p>
              <CodeBlock
                language="http"
                code={`Authorization: Bearer yak_live_xxxxxxxx`}
              />
              <CodeBlock
                language="http"
                code={`X-API-Key: yak_live_xxxxxxxx`}
              />
            </DocSection>

            <DocSection id="reports" title="Reports">
              <h4 className="font-medium">File a report</h4>
              <p>
                <MethodBadge method="POST" />{" "}
                <code className="font-mono text-xs">/api/v1/reports</code> —
                scope <ScopeBadge>reports:write</ScopeBadge>
              </p>
              <CodeBlock
                language="bash"
                code={`curl -X POST ${API_URL}/api/v1/reports \\
  -H "Authorization: Bearer $YAK_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "bug",
    "subject": "App crashes when opening workout history",
    "body": "Tapping History on iOS 18 freezes then closes the app.",
    "priority": "high",
    "reporter": {
      "name": "Maya Chen",
      "email": "maya@example.com",
      "externalUserId": "u_1842"
    },
    "platform": "ios",
    "appVersion": "2.14.1",
    "metadata": { "device": "iPhone 15 Pro", "buildNumber": 4120 }
  }'`}
              />
              <DocTable
                headers={["Field", "Required", "Notes"]}
                rows={[
                  ["type", "yes", "bug, suggestion, support, or report"],
                  ["subject", "yes", "Up to 200 characters"],
                  ["body", "yes", "Up to 10,000 characters"],
                  [
                    "priority",
                    "no",
                    "urgent, high, medium, low (default medium)",
                  ],
                  ["reporter.name", "yes", ""],
                  ["reporter.email", "yes", "Links to support history"],
                  ["reporter.externalUserId", "no", "Your own user id"],
                  ["platform", "no", "ios, android, web (default web)"],
                  ["appVersion", "no", ""],
                  ["metadata", "no", "Arbitrary JSON"],
                ]}
              />
              <p>
                The response includes a <code className="font-mono text-xs">token</code>.
                Store it — it is the handle for status and reply calls.
              </p>
              <CodeBlock
                language="json"
                code={`{
  "data": {
    "id": "0c0a…",
    "number": 1001,
    "token": "8Kd2mXq…",
    "status": "open",
    "messages": [ … ]
  }
}`}
              />

              <h4 className="pt-2 font-medium">Check status and show replies</h4>
              <p>
                <MethodBadge method="GET" />{" "}
                <code className="font-mono text-xs">
                  /api/v1/reports/{"{token}"}
                </code>{" "}
                — scope <ScopeBadge>reports:read</ScopeBadge>
              </p>
              <p>
                Returns the report with its conversation, minus internal notes.
                Use it for an in-app “my support requests” screen.
              </p>

              <h4 className="pt-2 font-medium">Let the user reply</h4>
              <p>
                <MethodBadge method="POST" />{" "}
                <code className="font-mono text-xs">
                  /api/v1/reports/{"{token}"}/messages
                </code>{" "}
                — scope <ScopeBadge>reports:write</ScopeBadge>
              </p>
              <CodeBlock
                language="json"
                code={`{ "body": "Still happening on 2.14.2." }`}
              />
              <p>
                A reply moves a report that was <code className="font-mono text-xs">waiting</code>{" "}
                back to <code className="font-mono text-xs">open</code>. Replying
                to a closed report returns <code className="font-mono text-xs">400</code>.
              </p>

              <h4 className="pt-2 font-medium">List a user&apos;s reports</h4>
              <p>
                <MethodBadge method="GET" />{" "}
                <code className="font-mono text-xs">
                  /api/v1/reports?email=maya@example.com
                </code>{" "}
                — scope <ScopeBadge>reports:read</ScopeBadge>
              </p>
              <p>
                Accepts <code className="font-mono text-xs">email</code> or{" "}
                <code className="font-mono text-xs">externalUserId</code>, plus
                an optional <code className="font-mono text-xs">limit</code>{" "}
                (default 25).
              </p>
            </DocSection>

            <DocSection id="events" title="Events">
              <p>
                <MethodBadge method="POST" />{" "}
                <code className="font-mono text-xs">/api/v1/events</code> —
                scope <ScopeBadge>events:write</ScopeBadge>
              </p>
              <p>Single event:</p>
              <CodeBlock
                language="json"
                code={`{
  "name": "purchase_completed",
  "userId": "u_1842",
  "userName": "Maya Chen",
  "platform": "ios",
  "appVersion": "2.14.1",
  "properties": { "product": "pro_annual", "price": 79.99 },
  "timestamp": "2026-08-06T21:14:00.000Z"
}`}
              />
              <p>Batch, up to 200 per request:</p>
              <CodeBlock
                language="json"
                code={`{ "events": [ { "name": "screen_viewed", "userId": "u_1842" }, … ] }`}
              />
              <ul className="text-muted-foreground list-disc space-y-1.5 pl-5 text-sm">
                <li>
                  <code className="font-mono text-xs">name</code> may contain
                  letters, numbers, and{" "}
                  <code className="font-mono text-xs">_ . : -</code> only.
                </li>
                <li>
                  Property values must be strings, numbers, or booleans — no
                  nested objects.
                </li>
                <li>
                  Timestamps more than a day in the future or 30 days old are
                  replaced with receipt time.
                </li>
                <li>
                  Success returns{" "}
                  <code className="font-mono text-xs">202 Accepted</code> with{" "}
                  <code className="font-mono text-xs">
                    {"{ \"data\": { \"accepted\": n } }"}
                  </code>
                  .
                </li>
                <li>
                  Validation is all-or-nothing per request so you can fix and
                  retry instead of silently losing data.
                </li>
              </ul>
            </DocSection>

            <DocSection id="users" title="Users">
              <p>
                <MethodBadge method="PUT" />{" "}
                <code className="font-mono text-xs">/api/v1/users</code> —
                scope <ScopeBadge>users:write</ScopeBadge>
              </p>
              <p>
                Idempotent on <code className="font-mono text-xs">externalId</code>
                , so it is safe to call on every sign-in.
              </p>
              <CodeBlock
                language="bash"
                code={`curl -X PUT ${API_URL}/api/v1/users \\
  -H "Authorization: Bearer $YAK_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "externalId": "u_1842",
    "name": "Maya Chen",
    "email": "maya@example.com",
    "plan": "pro",
    "billingPeriod": "annual",
    "platform": "ios",
    "status": "active",
    "renewsAt": "2026-11-12T10:00:00.000Z"
  }'`}
              />
              <p>
                This powers panel user search and subscription details. It also
                drives Discord triggers:{" "}
                <code className="font-mono text-xs">new_user</code> on first
                insert, and{" "}
                <code className="font-mono text-xs">new_subscription</code> when
                a user moves off the free plan.
              </p>
            </DocSection>

            <DocSection id="webhooks" title="Webhooks">
              <p>
                Outbound webhooks notify your backend when reports change.
                Register an endpoint with a signing secret of the form{" "}
                <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                  whsec_…
                </code>
                .
              </p>
              <p>
                Events:{" "}
                <code className="font-mono text-xs">report.created</code>,{" "}
                <code className="font-mono text-xs">report.updated</code>,{" "}
                <code className="font-mono text-xs">report.status_changed</code>,{" "}
                <code className="font-mono text-xs">report.replied</code>,{" "}
                <code className="font-mono text-xs">report.resolved</code>.
              </p>
              <CodeBlock
                language="http"
                code={`X-Yak-Event: report.status_changed
X-Yak-Delivery: 6f1c…
X-Yak-Timestamp: 1786000000
X-Yak-Signature: v1=<hex>`}
              />
              <p>
                Signature is{" "}
                <code className="font-mono text-xs">
                  HMAC-SHA256(&quot;{"{timestamp}"}.{"{rawBody}"}&quot;, secret)
                </code>
                . Verify against the raw body before parsing:
              </p>
              <CodeBlock
                language="ts"
                code={`import { createHmac, timingSafeEqual } from "node:crypto"

function verify(rawBody: string, headers: Record<string, string>, secret: string) {
  const timestamp = headers["x-yak-timestamp"]
  const received = headers["x-yak-signature"].replace(/^v1=/, "")

  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    return false
  }

  const expected = createHmac("sha256", secret)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest("hex")

  return timingSafeEqual(Buffer.from(expected), Buffer.from(received))
}`}
              />
              <p>
                Respond <code className="font-mono text-xs">2xx</code> to
                acknowledge. Non-2xx retries up to three times with backoff;{" "}
                <code className="font-mono text-xs">4xx</code> other than{" "}
                <code className="font-mono text-xs">429</code> is permanent.
              </p>
            </DocSection>

            <DocSection id="errors" title="Errors">
              <p>Every error uses the same envelope:</p>
              <CodeBlock
                language="json"
                code={`{
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "details": [{ "field": "reporter.email", "message": "Invalid email" }]
  }
}`}
              />
              <DocTable
                headers={["Status", "Code", "Meaning"]}
                rows={[
                  ["400", "bad_request", "Malformed request"],
                  [
                    "401",
                    "unauthorized",
                    "Missing, invalid, revoked, or expired key",
                  ],
                  ["403", "forbidden", "Key lacks the required scope"],
                  ["404", "not_found", "Unknown token or id"],
                  [
                    "422",
                    "validation_error",
                    "Body failed schema validation",
                  ],
                  ["429", "rate_limited", "Slow down and retry"],
                  ["500", "internal_error", "Our fault — requestId included"],
                ]}
              />
            </DocSection>

            <DocSection id="rate-limits" title="Rate limits">
              <p>
                Limits are keyed per API key, not per IP, so one integration
                cannot starve another.
              </p>
              <DocTable
                headers={["Endpoint group", "Limit"]}
                rows={[
                  ["Reports and users", "600 requests/minute"],
                  [
                    "Events",
                    "300 requests/minute (batch to raise throughput)",
                  ],
                ]}
              />
              <p>
                Responses carry standard{" "}
                <code className="font-mono text-xs">RateLimit-*</code> headers.
              </p>
            </DocSection>
          </article>
        </div>
      </div>
    </div>
  )
}

function DocSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-6 space-y-3">
      <h3 className="border-b pb-2 text-lg font-semibold tracking-tight">
        {title}
      </h3>
      <div className="space-y-3 text-sm leading-relaxed [&_h4]:text-foreground">
        {children}
      </div>
    </section>
  )
}

function MethodBadge({ method }: { method: string }) {
  return (
    <span className="bg-muted inline-flex rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide">
      {method}
    </span>
  )
}

function ScopeBadge({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
      {children}
    </code>
  )
}

function DocTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: string[][]
}) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b last:border-0">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={cn(
                    "text-muted-foreground px-3 py-2 align-top",
                    cellIndex === 0 && "text-foreground font-mono text-xs"
                  )}
                >
                  {cell || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = React.useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy to the clipboard")
    }
  }

  return (
    <div className="bg-muted/60 relative overflow-hidden rounded-xl border">
      <div className="text-muted-foreground flex items-center justify-between border-b px-3 py-1.5 text-[11px] tracking-wide uppercase">
        <span>{language}</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={() => void copy()}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  )
}
