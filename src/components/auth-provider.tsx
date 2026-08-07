/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

import { ApiError, authApi, meApi, type CurrentUser } from "@/lib/api"
import type { PanelPermissionId } from "@/lib/panel-permissions"

type AuthStatus = "loading" | "authenticated" | "unauthenticated"

type AuthContextValue = {
  status: AuthStatus
  user: CurrentUser | null
  /** True while the account still holds the temporary password from an invite. */
  mustChangePassword: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>
  refresh: () => Promise<void>
  setUser: (user: CurrentUser) => void
  can: (permission: PanelPermissionId) => boolean
  canManageUsers: boolean
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>("loading")
  const [user, setUserState] = React.useState<CurrentUser | null>(null)

  const load = React.useCallback(async () => {
    try {
      const current = await meApi.get()
      setUserState(current)
      setStatus("authenticated")
    } catch (error) {
      // A 401 is the normal signed-out case, not a failure worth surfacing.
      if (!(error instanceof ApiError) || error.isUnauthorized) {
        setUserState(null)
        setStatus("unauthenticated")
        return
      }

      // A forbidden response still means the session is valid, so keep the
      // user signed in and let the route guards decide what they can see.
      if (error.isForbidden) {
        setStatus("authenticated")
        return
      }

      setUserState(null)
      setStatus("unauthenticated")
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const signIn = React.useCallback(
    async (email: string, password: string) => {
      await authApi.signIn(email, password)
      await load()
    },
    [load]
  )

  const signOut = React.useCallback(async () => {
    await authApi.signOut()
    setUserState(null)
    setStatus("unauthenticated")
  }, [])

  const changePassword = React.useCallback(
    async (currentPassword: string, newPassword: string) => {
      const updated = await meApi.changePassword(currentPassword, newPassword)
      setUserState(updated)
    },
    []
  )

  const can = React.useCallback(
    (permission: PanelPermissionId) =>
      user?.effectivePermissions.includes(permission) ?? false,
    [user]
  )

  const value = React.useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      mustChangePassword: user?.mustChangePassword ?? false,
      signIn,
      signOut,
      changePassword,
      refresh: load,
      setUser: setUserState,
      can,
      canManageUsers: user?.role === "owner" || user?.role === "admin",
    }),
    [status, user, signIn, signOut, changePassword, load, can]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}

/** Throws if called before a session exists. Use inside authenticated routes. */
export function useCurrentUser(): CurrentUser {
  const { user } = useAuth()

  if (!user) {
    throw new Error("useCurrentUser requires an authenticated session")
  }

  return user
}
