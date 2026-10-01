import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useAuth } from "@/components/auth-provider"
import { ChangePasswordPage } from "@/pages/change-password-page"
import { permissionPath, type PanelPermissionId } from "@/lib/panel-permissions"

function FullPageSpinner() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <div
        className="border-muted border-t-primary size-6 animate-spin rounded-full border-2"
        role="status"
        aria-label="Loading"
      />
    </div>
  )
}

/**
 * Gate for everything inside the panel: requires a session, and blocks the
 * whole app behind the password change screen for freshly invited accounts.
 */
export function RequireAuth() {
  const { status, mustChangePassword } = useAuth()
  const location = useLocation()

  if (status === "loading") {
    return <FullPageSpinner />
  }

  if (status === "unauthenticated") {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    )
  }

  if (mustChangePassword) {
    return <ChangePasswordPage />
  }

  return <Outlet />
}

/**
 * Gate for a single section. Sends users without the permission to the first
 * page they can actually open rather than showing an error.
 */
export function RequirePermission({
  permission,
}: {
  permission: PanelPermissionId
}) {
  const { can, user } = useAuth()

  if (can(permission)) {
    return <Outlet />
  }

  const fallback = user?.effectivePermissions[0]

  if (!fallback) {
    return <NoAccessPage />
  }

  return <Navigate to={permissionPath(fallback)} replace />
}

/**
 * Gates owner/admin-only surfaces (API keys, etc.). Matches the server's
 * canMintApiKeys / canManageUsers checks rather than a panel permission.
 */
export function RequireCanManageUsers() {
  const { canManageUsers } = useAuth()

  if (canManageUsers) {
    return <Outlet />
  }

  // Rendered inside the panel layout, so the sidebar stays available. A
  // redirect here left members wondering why the page would not open.
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <h2 className="text-lg font-semibold">Owners and admins only</h2>
      <p className="text-muted-foreground max-w-sm text-sm">
        This page holds API keys and connected services. Ask an owner or admin
        to make the change, or to give you the admin role.
      </p>
    </div>
  )
}

function NoAccessPage() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold">No sections assigned</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        {user?.email} does not have access to any part of the panel yet. Ask an
        owner or admin to grant permissions.
      </p>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
        onClick={() => void signOut()}
      >
        Sign out
      </button>
    </div>
  )
}
