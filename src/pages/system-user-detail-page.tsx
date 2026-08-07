import * as React from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import {
  ArrowLeftIcon,
  ClockIcon,
  MailIcon,
  PencilIcon,
  ShieldIcon,
} from "lucide-react"

import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { EditAccessDialog } from "@/components/edit-access-dialog"
import { useSystemUsers } from "@/components/system-users-provider"
import { UserAvatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { removeAvatar, uploadAvatarFile } from "@/lib/avatar-upload"
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
import { ApiError } from "@/lib/api"
import {
  getActivityActionLabel,
  getActivitySectionLabel,
  getPermissionLabel,
} from "@/lib/panel-permissions"

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function SystemUserDetailPage() {
  const { userId } = useParams()
  const {
    getUser,
    getUserActivity,
    updateUser,
    deactivateUser,
    reactivateUser,
    resendInvite,
    syncUser,
    loading,
  } = useSystemUsers()
  const { user: currentUser, setUser: setCurrentUser } = useAuth()
  const [editAccessOpen, setEditAccessOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false)
  const avatarInputRef = React.useRef<HTMLInputElement>(null)

  const user = userId ? getUser(userId) : undefined

  if (!userId) {
    return <Navigate to="/settings/user-management" replace />
  }

  if (!user) {
    // The roster may still be in flight on a hard refresh of this URL.
    return loading ? (
      <div className="flex flex-col gap-4 px-4 py-6 lg:px-6">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    ) : (
      <Navigate to="/settings/user-management" replace />
    )
  }

  const activity = getUserActivity(user.id)
  const isSelf = currentUser?.id === user.id
  // Owners cannot be demoted or locked out, and nobody can lock themselves out.
  const canModify = user.role !== "owner" && !isSelf

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true)

    try {
      await action()
      toast.success(success)
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "That action failed"
      )
    } finally {
      setBusy(false)
    }
  }

  const onAvatarPicked = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    setUploadingAvatar(true)

    try {
      const updated = await uploadAvatarFile(file)
      setCurrentUser(updated)
      syncUser(updated)
      toast.success("Avatar updated")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not upload that image"
      )
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link to="/settings/user-management">
              <ArrowLeftIcon />
              Back to users
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-2">
                  <UserAvatar user={user} size="lg" />
                  {isSelf ? (
                    <div className="flex flex-wrap justify-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingAvatar}
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        {uploadingAvatar ? "Uploading…" : "Change photo"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={uploadingAvatar}
                        onClick={() =>
                          void removeAvatar()
                            .then((updated) => {
                              setCurrentUser(updated)
                              syncUser(updated)
                              toast.success("Photo removed")
                            })
                            .catch(() =>
                              toast.error("Could not remove your photo")
                            )
                        }
                      >
                        Remove
                      </Button>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => void onAvatarPicked(event)}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <CardTitle className="flex items-center gap-2">
                    {user.name}
                    <Badge variant="outline" className="capitalize">
                      {user.role}
                    </Badge>
                    {user.status === "deactivated" ? (
                      <Badge variant="outline">Deactivated</Badge>
                    ) : user.pendingInvite ? (
                      <Badge variant="secondary">Invite pending</Badge>
                    ) : null}
                  </CardTitle>
                  <CardDescription>
                    Panel user details and access permissions.
                  </CardDescription>
                </div>
              </div>

              {canModify ? (
                <div className="flex flex-wrap gap-2">
                  {user.pendingInvite ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => resendInvite(user.id),
                          "Invite resent"
                        )
                      }
                    >
                      Resend invite
                    </Button>
                  ) : null}

                  {user.status === "deactivated" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => reactivateUser(user.id),
                          `${user.name} can sign in again`
                        )
                      }
                    >
                      Reactivate
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => deactivateUser(user.id),
                          `${user.name} has been signed out and deactivated`
                        )
                      }
                    >
                      Deactivate
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-start gap-3 rounded-xl border p-4">
                <MailIcon className="mt-0.5 size-4 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{user.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border p-4">
                <ClockIcon className="mt-0.5 size-4 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">
                    {formatDate(user.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border p-4">
                <ShieldIcon className="mt-0.5 size-4 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Permissions</p>
                  <p className="text-sm font-medium">
                    {user.role === "member"
                      ? `${user.permissions.length} sections`
                      : "All sections"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Section access</p>
                {canModify && user.role === "member" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditAccessOpen(true)}
                  >
                    <PencilIcon />
                    Edit access
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {user.role !== "member" ? (
                  <p className="text-muted-foreground text-sm">
                    {user.role === "owner" ? "Owners" : "Admins"} have access to
                    every section.
                  </p>
                ) : user.permissions.length > 0 ? (
                  user.permissions.map((permission) => (
                    <Badge key={permission} variant="secondary">
                      {getPermissionLabel(permission)}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No sections assigned.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity log</CardTitle>
            <CardDescription>
              Recent actions this user took inside the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.length > 0 ? (
                    activity.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(entry.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getActivityActionLabel(entry.action)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getActivitySectionLabel(entry.section)}
                        </TableCell>
                        <TableCell>{entry.summary}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No activity logged yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <EditAccessDialog
        open={editAccessOpen}
        onOpenChange={setEditAccessOpen}
        user={user}
        onSave={(permissions) =>
          run(
            () => updateUser(user.id, { permissions }),
            "Section access updated"
          )
        }
      />
    </div>
  )
}
