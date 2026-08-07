import * as React from "react"
import { useNavigate } from "react-router-dom"
import { PlusIcon } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { CreateSystemUserDialog } from "@/components/create-system-user-dialog"
import { useSystemUsers } from "@/components/system-users-provider"
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
import { getPermissionLabel } from "@/lib/panel-permissions"

export function UserManagementPage() {
  const navigate = useNavigate()
  const { users, loading, error, inviteUser } = useSystemUsers()
  const { user: currentUser } = useAuth()
  const [createOpen, setCreateOpen] = React.useState(false)

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle>User management</CardTitle>
              <CardDescription>
                Manage people who can access this panel and which sections they
                can see.
              </CardDescription>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              Add new
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, index) => (
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
                        className="text-destructive py-8 text-center"
                      >
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow
                        key={user.id}
                        className="cursor-pointer"
                        onClick={() =>
                          navigate(`/settings/user-management/${user.id}`)
                        }
                      >
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
                          {user.role === "member" ? (
                            <div className="flex flex-wrap gap-1.5">
                              {user.permissions.map((permission) => (
                                <Badge key={permission} variant="secondary">
                                  {getPermissionLabel(permission)}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              All sections
                            </span>
                          )}
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
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateSystemUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={inviteUser}
        canGrantAdmin={currentUser?.role === "owner"}
      />
    </div>
  )
}
