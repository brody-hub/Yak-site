import { Badge } from "@/components/ui/badge"
import type { AdminTenant } from "@/lib/admin"

export function TenantStatusBadge({
  tenant,
}: {
  tenant: Pick<AdminTenant, "status">
}) {
  return tenant.status === "suspended" ? (
    <Badge variant="destructive">Suspended</Badge>
  ) : (
    <Badge variant="outline">Active</Badge>
  )
}
