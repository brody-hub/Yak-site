import * as React from "react"
import { CheckIcon, ChevronsUpDownIcon, PlusIcon, SmartphoneIcon } from "lucide-react"

import { useApps } from "@/components/apps-provider"
import { useAuth } from "@/components/auth-provider"
import { CreateAppDialog } from "@/components/create-app-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

/**
 * Picks which of the workspace's apps the app-scoped pages show. Members can
 * switch; owners and admins can also add one from here.
 */
export function AppSwitcher() {
  const { isMobile } = useSidebar()
  const { canManageUsers } = useAuth()
  const { status, activeApps, currentApp, setCurrentApp } = useApps()
  const [createOpen, setCreateOpen] = React.useState(false)

  const label =
    status === "loading"
      ? "Loading apps…"
      : (currentApp?.name ?? "No app yet")

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={label}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <SmartphoneIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{label}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {currentApp ? "Current app" : "Apps"}
                </span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Apps
            </DropdownMenuLabel>
            {activeApps.length === 0 ? (
              <DropdownMenuItem disabled>
                {status === "loading" ? "Loading…" : "No active apps"}
              </DropdownMenuItem>
            ) : (
              activeApps.map((app) => (
                <DropdownMenuItem
                  key={app.id}
                  onSelect={() => setCurrentApp(app.id)}
                >
                  <span className="truncate">{app.name}</span>
                  {app.id === currentApp?.id ? (
                    <CheckIcon className="ml-auto size-4" />
                  ) : null}
                </DropdownMenuItem>
              ))
            )}
            {canManageUsers ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
                  <PlusIcon />
                  New app
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      {canManageUsers ? (
        <CreateAppDialog open={createOpen} onOpenChange={setCreateOpen} />
      ) : null}
    </SidebarMenu>
  )
}
