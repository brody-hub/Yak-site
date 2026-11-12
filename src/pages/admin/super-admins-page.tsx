import * as React from "react"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { InvitePersonDialog } from "@/components/admin/invite-person-dialog"
import { useAuth } from "@/components/auth-provider"
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { adminApi, formatAdminDate, type AdminUser } from "@/lib/admin"
import { ApiError } from "@/lib/api"

export function SuperAdminsPage() {
  const { user: currentUser } = useAuth()
  const [admins, setAdmins] = React.useState<AdminUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [removingId, setRemovingId] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false

    adminApi
      .superAdmins()
      .then((rows) => {
        if (!cancelled) {
          setAdmins(rows)
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(
            caught instanceof ApiError
              ? caught.message
              : "Could not load super admins"
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

  const remove = async (admin: AdminUser) => {
    if (!window.confirm(`Remove ${admin.name} as a super admin?`)) {
      return
    }

    setRemovingId(admin.id)

    try {
      await adminApi.removeSuperAdmin(admin.id)
      setAdmins((current) => current.filter((item) => item.id !== admin.id))
      toast.success(`${admin.name} removed`)
    } catch (caught) {
      toast.error(
        caught instanceof ApiError ? caught.message : "Could not remove them"
      )
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle>Super admins</CardTitle>
              <CardDescription>
                Yak staff who can create and manage customer accounts. Super
                admins cannot open a customer&apos;s panel or data.
              </CardDescription>
            </div>
            <Button onClick={() => setInviteOpen(true)}>
              <PlusIcon />
              Invite
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last sign in</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 2 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={5}>
                          <Skeleton className="h-8" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : error ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-8 text-center text-destructive"
                      >
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : (
                    admins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <UserAvatar user={admin} size="sm" />
                            <span className="font-medium">{admin.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {admin.email}
                        </TableCell>
                        <TableCell>
                          {admin.pendingInvite ? (
                            <Badge variant="secondary">Invite pending</Badge>
                          ) : (
                            <Badge variant="outline">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatAdminDate(admin.lastLoginAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {admin.id === currentUser?.id ? (
                            <span className="text-xs text-muted-foreground">
                              You
                            </span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={removingId === admin.id}
                              onClick={() => void remove(admin)}
                            >
                              Remove
                            </Button>
                          )}
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

      <InvitePersonDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="Invite super admin"
        description="They get full control of every customer account. Only invite Yak staff."
        onInvite={async (input) => {
          const result = await adminApi.inviteSuperAdmin({
            name: input.name,
            email: input.email,
          })
          setAdmins((current) => [...current, result.user])
          return result
        }}
      />
    </div>
  )
}
