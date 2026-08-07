import { useLocation } from "react-router-dom"

import { ModeToggle } from "@/components/mode-toggle"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/kpis": "KPIs",
  "/tasks": "Tasks",
  "/users": "Users",
  "/reports": "Reports",
  "/analytics": "Analytics",
  "/settings/user-management": "User management",
  "/settings/theme": "Theme",
  "/settings/discord": "Discord",
  "/settings/integrations": "Integrations",
  "/settings/documentation": "Documentation",
}

function getTitle(pathname: string) {
  if (pathname.startsWith("/settings/user-management/")) {
    return "User details"
  }

  return titles[pathname] ?? "Dashboard"
}

export function SiteHeader() {
  const location = useLocation()
  const title = getTitle(location.pathname)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto">
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
