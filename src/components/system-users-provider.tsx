/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

import {
  activityApi,
  systemUsersApi,
  type InviteResult,
  type ServerActivityEntry,
  type ServerSystemUser,
  type UserRole,
} from "@/lib/api"
import type { PanelPermissionId } from "@/lib/panel-permissions"

type SystemUsersProviderProps = {
  children: React.ReactNode
}

type InviteInput = {
  name: string
  email: string
  role: UserRole
  permissions: PanelPermissionId[]
}

type SystemUsersProviderState = {
  users: ServerSystemUser[]
  activityLog: ServerActivityEntry[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  inviteUser: (input: InviteInput) => Promise<InviteResult>
  updateUser: (
    userId: string,
    patch: {
      name?: string
      role?: UserRole
      permissions?: PanelPermissionId[]
    }
  ) => Promise<ServerSystemUser>
  deactivateUser: (userId: string, reason?: string) => Promise<void>
  reactivateUser: (userId: string) => Promise<void>
  resendInvite: (userId: string) => Promise<{
    inviteEmailSent: boolean
    temporaryPassword?: string
  }>
  removeUser: (userId: string) => Promise<void>
  getUser: (id: string) => ServerSystemUser | undefined
  getUserActivity: (userId: string) => ServerActivityEntry[]
  /** Merges a fresher user record into the roster (e.g. after avatar upload). */
  syncUser: (user: ServerSystemUser) => void
}

const SystemUsersContext = React.createContext<
  SystemUsersProviderState | undefined
>(undefined)

export function SystemUsersProvider({ children }: SystemUsersProviderProps) {
  const [users, setUsers] = React.useState<ServerSystemUser[]>([])
  const [activityLog, setActivityLog] = React.useState<ServerActivityEntry[]>(
    []
  )
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    try {
      const nextUsers = await systemUsersApi.list()
      setUsers(nextUsers)
      setError(null)

      // Members without the user-management permission can still read the
      // roster (assignee pickers need it) but not the audit log.
      try {
        const activity = await activityApi.list({ limit: 200 })
        setActivityLog(activity.data)
      } catch {
        setActivityLog([])
      }
    } catch {
      setError("Could not load panel users.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const syncUser = React.useCallback((updated: ServerSystemUser) => {
    setUsers((current) =>
      current.map((user) => (user.id === updated.id ? updated : user))
    )
  }, [])

  const inviteUser = React.useCallback(async (input: InviteInput) => {
    const result = await systemUsersApi.invite(input)
    setUsers((current) => [result.user, ...current])
    return result
  }, [])

  const updateUser = React.useCallback(
    async (
      userId: string,
      patch: {
        name?: string
        role?: UserRole
        permissions?: PanelPermissionId[]
      }
    ) => {
      const updated = await systemUsersApi.update(userId, patch)
      syncUser(updated)
      return updated
    },
    [syncUser]
  )

  const deactivateUser = React.useCallback(
    async (userId: string, reason?: string) => {
      syncUser(await systemUsersApi.deactivate(userId, reason))
    },
    [syncUser]
  )

  const reactivateUser = React.useCallback(
    async (userId: string) => {
      syncUser(await systemUsersApi.reactivate(userId))
    },
    [syncUser]
  )

  const resendInvite = React.useCallback(
    (userId: string) => systemUsersApi.resendInvite(userId),
    []
  )

  const removeUser = React.useCallback(async (userId: string) => {
    await systemUsersApi.remove(userId)
    setUsers((current) => current.filter((user) => user.id !== userId))
  }, [])

  const getUser = React.useCallback(
    (id: string) => users.find((user) => user.id === id),
    [users]
  )

  const getUserActivity = React.useCallback(
    (userId: string) =>
      activityLog.filter((entry) => entry.userId === userId),
    [activityLog]
  )

  const value = React.useMemo(
    () => ({
      users,
      activityLog,
      loading,
      error,
      refresh,
      inviteUser,
      updateUser,
      deactivateUser,
      reactivateUser,
      resendInvite,
      removeUser,
      getUser,
      getUserActivity,
      syncUser,
    }),
    [
      users,
      activityLog,
      loading,
      error,
      refresh,
      inviteUser,
      updateUser,
      deactivateUser,
      reactivateUser,
      resendInvite,
      removeUser,
      getUser,
      getUserActivity,
      syncUser,
    ]
  )

  return (
    <SystemUsersContext.Provider value={value}>
      {children}
    </SystemUsersContext.Provider>
  )
}

export function useSystemUsers() {
  const context = React.useContext(SystemUsersContext)

  if (context === undefined) {
    throw new Error("useSystemUsers must be used within a SystemUsersProvider")
  }

  return context
}
