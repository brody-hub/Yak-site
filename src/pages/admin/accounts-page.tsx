import * as React from "react"
import { useNavigate } from "react-router-dom"
import { PlusIcon } from "lucide-react"

import { CreateAccountDialog } from "@/components/admin/create-account-dialog"
import { TenantStatusBadge } from "@/components/admin/tenant-status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  adminApi,
  formatAdminDate,
  planLabel,
  type AdminTenant,
} from "@/lib/admin"
import { ApiError } from "@/lib/api"

export function AccountsPage() {
  const navigate = useNavigate()
  const [tenants, setTenants] = React.useState<AdminTenant[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    adminApi
      .tenants()
      .then((rows) => {
        if (!cancelled) {
          setTenants(rows)
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(
            caught instanceof ApiError
              ? caught.message
              : "Could not load accounts"
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle>Accounts</CardTitle>
              <CardDescription>
                Every customer workspace on Yak. Open one to manage its owners
                or suspend it.
              </CardDescription>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              New account
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Owners</TableHead>
                    <TableHead className="text-right">Apps</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={9}>
                          <Skeleton className="h-8" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : error ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="py-8 text-center text-destructive"
                      >
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : tenants.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No accounts yet. Create the first one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tenants.map((tenant) => (
                      <TableRow
                        key={tenant.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/admin/accounts/${tenant.id}`)}
                      >
                        <TableCell className="font-medium">
                          {tenant.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {tenant.slug}
                        </TableCell>
                        <TableCell>
                          <TenantStatusBadge tenant={tenant} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {planLabel(tenant.plan)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tenant.owners.length > 0
                            ? tenant.owners
                                .map((owner) => owner.email)
                                .join(", ")
                            : "None"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {tenant.appCount}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {tenant.userCount}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatAdminDate(tenant.createdAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatAdminDate(tenant.lastActiveAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateAccountDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(tenant) => setTenants((current) => [tenant, ...current])}
      />
    </div>
  )
}
