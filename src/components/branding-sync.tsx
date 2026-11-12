import * as React from "react"

import { useAuth } from "@/components/auth-provider"
import { useBranding } from "@/components/branding-provider"
import { usePrimaryColor } from "@/components/primary-color-provider"

/**
 * Loads the right brand for whoever is signed in. The branding providers sit
 * outside the router and auth provider, so this bridge runs inside them and
 * reloads whenever the session changes: the product brand when signed out or
 * for a super admin, the workspace's brand for an active tenant user.
 */
export function BrandingSync() {
  const { status, user } = useAuth()
  const { loadFor } = useBranding()
  const { setPrimaryColor } = usePrimaryColor()

  const session =
    status === "authenticated" &&
    user &&
    !user.isSuperAdmin &&
    user.tenant?.status === "active"
      ? "tenant"
      : "public"

  // Keyed by tenant too, so switching accounts in one tab reloads the brand.
  const tenantId = session === "tenant" ? user?.tenant?.id : null

  React.useEffect(() => {
    if (status === "loading") {
      return
    }

    void loadFor(session).then((color) => {
      if (color) {
        setPrimaryColor(color)
      }
    })
  }, [status, session, tenantId, loadFor, setPrimaryColor])

  return null
}
