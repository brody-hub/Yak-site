import * as React from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeftIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { InvitePersonDialog } from "@/components/admin/invite-person-dialog"
import { TenantStatusBadge } from "@/components/admin/tenant-status-badge"
import {
  TemporaryPasswordDialog,
  type TemporaryPasswordDetails,
} from "@/components/temporary-password-dialog"
import { UserAvatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  adminApi,
  formatAdminDate,
  PLAN_TIERS,
  planLabel,
  type AdminTenant,
  type AdminUser,
} from "@/lib/admin"
import { ApiError, type PlanTierId } from "@/lib/api"

function errorMessage(caught: unknown, fallback: string) {
  return caught instanceof ApiError ? caught.message : fallback
}

export function AccountDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const navigate = useNavigate()

  const [tenant, setTenant] = React.useState<AdminTenant | null>(null)
  const [users, setUsers] = React.useState<AdminUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [name, setName] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [suspendOpen, setSuspendOpen] = React.useState(false)
  const [suspendReason, setSuspendReason] = React.useState("")
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [confirmSlug, setConfirmSlug] = React.useState("")
  const [addUserOpen, setAddUserOpen] = React.useState(false)
  const [credentials, setCredentials] =
    React.useState<TemporaryPasswordDetails | null>(null)

  React.useEffect(() => {
    if (!tenantId) {
      return
    }

    let cancelled = false

    adminApi
      .tenant(tenantId)
      .then((result) => {
        if (!cancelled) {
          setTenant(result.tenant)
          setName(result.tenant.name)
          setUsers(result.users)
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(errorMessage(caught, "Could not load this account"))
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
  }, [tenantId])

  if (loading) {
    return (
      <div className="flex flex-col gap-4 px-4 py-6 lg:px-6">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {error ?? "That account was not found."}
        </p>
        <Button variant="outline" asChild>
          <Link to="/admin/accounts">Back to accounts</Link>
        </Button>
      </div>
    )
  }

  const run = async (
    action: () => Promise<AdminTenant>,
    success: string
  ): Promise<boolean> => {
    setBusy(true)

    try {
      const updated = await action()
      setTenant(updated)
      setName(updated.name)
      toast.success(success)
      return true
    } catch (caught) {
      toast.error(errorMessage(caught, "That action failed"))
      return false
    } finally {
      setBusy(false)
    }
  }

  const rename = () => {
    const trimmed = name.trim()

    if (!trimmed || trimmed === tenant.name) {
      return
    }

    void run(() => adminApi.renameTenant(tenant.id, trimmed), "Account renamed")
  }

  const suspend = async () => {
    const done = await run(
      () =>
        adminApi.suspendTenant(tenant.id, suspendReason.trim() || undefined),
      `${tenant.name} suspended`
    )

    if (done) {
      setSuspendOpen(false)
      setSuspendReason("")
    }
  }

  const remove = async () => {
    setBusy(true)

    try {
      await adminApi.deleteTenant(tenant.id, confirmSlug)
      toast.success(`${tenant.name} deleted`)
      navigate("/admin/accounts", { replace: true })
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not delete this account"))
      setBusy(false)
    }
  }

  const resendInvite = async (user: AdminUser) => {
    setBusy(true)

    try {
      const result = await adminApi.resendTenantInvite(tenant.id, user.id)
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, pendingInvite: true } : item
        )
      )
      setCredentials({
        userName: user.name,
        userEmail: user.email,
        inviteEmailSent: result.inviteEmailSent,
        temporaryPassword: result.temporaryPassword,
      })
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not resend the invite"))
    } finally {
      setBusy(false)
    }
  }

  const suspended = tenant.status === "suspended"

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link to="/admin/accounts">
              <ArrowLeftIcon />
              Accounts
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                {tenant.name}
                <TenantStatusBadge tenant={tenant} />
                <Badge variant="secondary">{planLabel(tenant.plan)}</Badge>
              </CardTitle>
              <CardDescription>
                <span className="font-mono">{tenant.slug}</span> · created{" "}
                {formatAdminDate(tenant.createdAt)} · last active{" "}
                {formatAdminDate(tenant.lastActiveAt)}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="max-w-md space-y-2">
              <Label htmlFor="tenant-name">Account name</Label>
              <div className="flex gap-2">
                <Input
                  id="tenant-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <Button
                  type="button"
                  disabled={busy || !name.trim() || name.trim() === tenant.name}
                  onClick={rename}
                >
                  Save
                </Button>
              </div>
            </div>

            {/* Set by hand until Stripe drives it from the subscription. */}
            <div className="max-w-md space-y-2">
              <Label htmlFor="tenant-plan">Plan</Label>
              <Select
                value={tenant.plan}
                disabled={busy}
                onValueChange={(value) =>
                  void run(
                    () => adminApi.setPlan(tenant.id, value as PlanTierId),
                    `${tenant.name} moved to ${planLabel(value as PlanTierId)}`
                  )
                }
              >
                <SelectTrigger id="tenant-plan" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_TIERS.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      {tier.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Sets the tier the account is on. Billing by monthly active
                users is not connected yet, so this is the only place it
                changes.
              </p>
            </div>

            {suspended ? (
              <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Suspended {formatAdminDate(tenant.suspendedAt)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {tenant.suspendedReason ??
                      "No reason given. Its users cannot sign in to the panel and its API keys are refused."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () => adminApi.reactivateTenant(tenant.id),
                        `${tenant.name} reactivated`
                      )
                    }
                  >
                    Reactivate
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() => {
                      setConfirmSlug("")
                      setDeleteOpen(true)
                    }}
                  >
                    Delete account
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                <p className="max-w-md text-sm text-muted-foreground">
                  Suspending signs everyone out, blocks the panel, and refuses
                  the account&apos;s API keys. Data is kept, and it can be
                  reactivated at any time.
                </p>
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() => setSuspendOpen(true)}
                >
                  Suspend
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Apps</CardTitle>
            <CardDescription>
              What the account has connected. Owners add and manage apps from
              their panel; what those apps send is never visible here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tenant.apps.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No apps yet.
              </p>
            ) : (
              <ul className="divide-y rounded-xl border">
                {tenant.apps.map((app) => (
                  <li
                    key={app.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                  >
                    <span className="font-medium">{app.name}</span>
                    <Badge variant="outline">
                      {app.status === "archived" ? "Archived" : "Active"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle>Users</CardTitle>
              <CardDescription>
                People with access to this account&apos;s panel. Owners manage
                members and their sections from inside the panel. Yak staff
                can only add a login while the account has no active owner.
              </CardDescription>
            </div>
            {users.some(
              (user) => user.role === "owner" && user.status === "active"
            ) ? null : (
              <Button onClick={() => setAddUserOpen(true)}>
                <PlusIcon />
                Add user
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last sign in</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No users yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <UserAvatar user={user} size="sm" />
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell className="capitalize">
                          {user.role}
                        </TableCell>
                        <TableCell>
                          {user.status === "deactivated" ? (
                            <Badge variant="outline">Deactivated</Badge>
                          ) : user.pendingInvite ? (
                            <Badge variant="secondary">Invite pending</Badge>
                          ) : (
                            <Badge variant="outline">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatAdminDate(user.lastLoginAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {/* Once someone has chosen their own password, only
                              they can change it (from the sign in screen), so a
                              super admin can never sign in as them. */}
                          {user.status === "active" && user.pendingInvite ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              onClick={() => void resendInvite(user)}
                            >
                              Resend invite
                            </Button>
                          ) : null}
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

      <Dialog
        open={suspendOpen}
        onOpenChange={(open) => {
          setSuspendOpen(open)
          if (!open) {
            setSuspendReason("")
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Suspend {tenant.name}?</DialogTitle>
            <DialogDescription>
              Everyone in the account is signed out and its API keys stop
              working until you reactivate it. Nothing is deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="suspend-reason">Reason (optional)</Label>
            <Textarea
              id="suspend-reason"
              value={suspendReason}
              onChange={(event) => setSuspendReason(event.target.value)}
              placeholder="Unpaid invoice"
              maxLength={280}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => void suspend()}
            >
              Suspend account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete {tenant.name}?</DialogTitle>
            <DialogDescription>
              This permanently deletes the account and all of its data: users,
              reports, tasks, analytics, and connections. It cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-slug">
              Type <span className="font-mono">{tenant.slug}</span> to confirm
            </Label>
            <Input
              id="confirm-slug"
              value={confirmSlug}
              onChange={(event) => setConfirmSlug(event.target.value)}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy || confirmSlug !== tenant.slug}
              onClick={() => void remove()}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvitePersonDialog
        open={addUserOpen}
        onOpenChange={setAddUserOpen}
        title={`Add user to ${tenant.name}`}
        description="Creates an invite-only account in this workspace with a temporary password to share."
        withRole
        onInvite={async (input) => {
          const result = await adminApi.addTenantUser(tenant.id, input)
          setUsers((current) => [...current, result.user])
          return result
        }}
      />

      <TemporaryPasswordDialog
        open={Boolean(credentials)}
        onOpenChange={(open) => {
          if (!open) {
            setCredentials(null)
          }
        }}
        details={credentials}
      />
    </div>
  )
}
