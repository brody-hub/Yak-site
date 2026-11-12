import * as React from "react"
import { NavLink, Outlet } from "react-router-dom"
import { CircleUserRoundIcon, LogOutIcon } from "lucide-react"

import { AdminAccountDialog } from "@/components/admin/admin-account-dialog"
import { useAuth } from "@/components/auth-provider"
import { ModeToggle } from "@/components/mode-toggle"
import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const NAV = [
  { to: "/admin/accounts", label: "Accounts" },
  { to: "/admin/super-admins", label: "Super admins" },
]

/**
 * The super admin console. Deliberately separate from the customer panel's
 * sidebar: none of those sections exist for someone with no workspace.
 */
export function AdminLayout() {
  const { user, signOut } = useAuth()
  const [accountOpen, setAccountOpen] = React.useState(false)

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-6 border-b px-4 lg:px-6">
        <span className="text-base font-semibold">Yak admin</span>
        <nav className="flex items-center gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground",
                  isActive && "bg-muted text-foreground"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Account menu">
                <UserAvatar user={user} size="sm" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="grid text-sm leading-tight">
                  <span className="truncate font-medium">{user?.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setAccountOpen(true)}>
                <CircleUserRoundIcon />
                Account
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void signOut()}>
                <LogOutIcon />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <AdminAccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
    </div>
  )
}
