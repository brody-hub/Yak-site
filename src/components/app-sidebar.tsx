import * as React from "react"
import { Link } from "react-router-dom"
import {
  ActivityIcon,
  BookOpenIcon,
  ChartBarIcon,
  CommandIcon,
  HeadphonesIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  MessageCircleIcon,
  PaletteIcon,
  UsersIcon,
  UsersRoundIcon,
} from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { useBranding } from "@/components/branding-provider"
import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import type { PanelPermissionId } from "@/lib/panel-permissions"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navMain = [
  {
    title: "Dashboard",
    url: "/",
    icon: <LayoutDashboardIcon />,
    permission: "dashboard",
    // TEMP: remove when real data is wired up
    badge: "[DEMO DATA]",
  },
  {
    title: "KPIs",
    url: "/kpis",
    icon: <ChartBarIcon />,
    permission: "kpis",
    // TEMP: remove when real data is wired up
    badge: "[DEMO DATA]",
  },
  {
    title: "Tasks",
    url: "/tasks",
    icon: <ListChecksIcon />,
    permission: "tasks",
  },
] satisfies {
  title: string
  url: string
  icon: React.ReactNode
  permission: PanelPermissionId
  badge?: string
}[]

const support = [
  {
    name: "Users",
    url: "/users",
    icon: <UsersIcon />,
    permission: "users",
  },
  {
    name: "Reports",
    url: "/reports",
    icon: <HeadphonesIcon />,
    permission: "reports",
  },
  {
    name: "Analytics",
    url: "/analytics",
    icon: <ActivityIcon />,
    permission: "analytics",
  },
] satisfies { name: string; url: string; icon: React.ReactNode; permission: PanelPermissionId }[]

type SettingsNavItem = {
  name: string
  url: string
  icon: React.ReactNode
  /** Panel section permission. Omit for pages open to every signed-in user. */
  permission?: PanelPermissionId
  /** Owner/admin only — matches server API-key management. */
  requireManageUsers?: boolean
}

const settings = [
  {
    name: "User management",
    url: "/settings/user-management",
    icon: <UsersRoundIcon />,
    permission: "user-management",
  },
  {
    name: "Theme",
    url: "/settings/theme",
    icon: <PaletteIcon />,
    permission: "theme",
  },
  {
    name: "Discord",
    url: "/settings/discord",
    icon: <MessageCircleIcon />,
    permission: "discord",
  },
  {
    name: "Integrations",
    url: "/settings/integrations",
    icon: <KeyRoundIcon />,
    requireManageUsers: true,
  },
  {
    name: "Documentation",
    url: "/settings/documentation",
    icon: <BookOpenIcon />,
  },
] satisfies SettingsNavItem[]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { name, logo } = useBranding()
  const { user, can, canManageUsers } = useAuth()

  // Sections the signed-in user cannot open are hidden rather than disabled;
  // the route guards enforce the same rule if someone types the URL.
  const visibleMain = navMain.filter((item) => can(item.permission))
  const visibleSupport = support.filter((item) => can(item.permission))
  const visibleSettings = settings.filter((item) => {
    if (item.requireManageUsers) {
      return canManageUsers
    }

    if (item.permission) {
      return can(item.permission)
    }

    return true
  })

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link to="/">
                {logo ? (
                  <img
                    src={logo}
                    alt={`${name} logo`}
                    className="size-5! rounded-sm object-cover"
                  />
                ) : (
                  <CommandIcon className="size-5!" />
                )}
                <span className="text-base font-semibold">{name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {visibleMain.length > 0 ? <NavMain items={visibleMain} /> : null}
        {visibleSupport.length > 0 ? (
          <NavDocuments items={visibleSupport} label="Support" />
        ) : null}
        {visibleSettings.length > 0 ? (
          <NavDocuments items={visibleSettings} label="Settings" />
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        {user ? (
          <NavUser
            user={{
              name: user.name,
              email: user.email,
              avatar: user.avatar,
            }}
          />
        ) : null}
      </SidebarFooter>
    </Sidebar>
  )
}
