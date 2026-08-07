import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom"

import { AuthProvider } from "@/components/auth-provider"
import { DiscordWebhooksProvider } from "@/components/discord-webhooks-provider"
import { KpisProvider } from "@/components/kpis-provider"
import { RequireAuth, RequirePermission } from "@/components/route-guards"
import { SystemUsersProvider } from "@/components/system-users-provider"
import { TasksProvider } from "@/components/tasks-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DashboardLayout } from "@/layouts/dashboard-layout"
import { DashboardPage } from "@/pages/dashboard-page"
import { AnalyticsPage } from "@/pages/analytics-page"
import { KpisPage } from "@/pages/kpis-page"
import { LoginPage } from "@/pages/login-page"
import { ReportsPage } from "@/pages/reports-page"
import { ResetPasswordPage } from "@/pages/reset-password-page"
import { TasksPage } from "@/pages/tasks-page"
import { SystemUserDetailPage } from "@/pages/system-user-detail-page"
import { DiscordWebhooksPage } from "@/pages/discord-webhooks-page"
import { ThemePage } from "@/pages/theme-page"
import { UserManagementPage } from "@/pages/user-management-page"
import { UsersPage } from "@/pages/users-page"

/**
 * Providers that load data from the API. They sit inside the auth guard so a
 * signed-out visitor never triggers a request that would just 401.
 *
 * The panel roster is needed almost everywhere (assignee pickers, avatars), so
 * it is global. Tasks and Discord are scoped to their own routes.
 */
function PanelProviders() {
  return (
    <SystemUsersProvider>
      <KpisProvider>
        <Outlet />
      </KpisProvider>
    </SystemUsersProvider>
  )
}

function TasksRoute() {
  return (
    <TasksProvider>
      <Outlet />
    </TasksProvider>
  )
}

function DiscordRoute() {
  return (
    <DiscordWebhooksProvider>
      <Outlet />
    </DiscordWebhooksProvider>
  )
}

export function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route element={<RequireAuth />}>
              <Route element={<PanelProviders />}>
                <Route element={<DashboardLayout />}>
                  <Route element={<RequirePermission permission="dashboard" />}>
                    <Route index element={<DashboardPage />} />
                  </Route>
                  <Route element={<RequirePermission permission="users" />}>
                    <Route path="users" element={<UsersPage />} />
                  </Route>
                  <Route element={<RequirePermission permission="reports" />}>
                    <Route path="reports" element={<ReportsPage />} />
                  </Route>
                  <Route element={<RequirePermission permission="analytics" />}>
                    <Route path="analytics" element={<AnalyticsPage />} />
                  </Route>
                  <Route element={<RequirePermission permission="kpis" />}>
                    <Route path="kpis" element={<KpisPage />} />
                  </Route>
                  <Route element={<RequirePermission permission="tasks" />}>
                    <Route element={<TasksRoute />}>
                      <Route path="tasks" element={<TasksPage />} />
                    </Route>
                  </Route>
                  <Route
                    element={<RequirePermission permission="user-management" />}
                  >
                    <Route
                      path="settings/user-management"
                      element={<UserManagementPage />}
                    />
                    <Route
                      path="settings/user-management/:userId"
                      element={<SystemUserDetailPage />}
                    />
                  </Route>
                  <Route element={<RequirePermission permission="theme" />}>
                    <Route path="settings/theme" element={<ThemePage />} />
                  </Route>
                  <Route element={<RequirePermission permission="discord" />}>
                    <Route element={<DiscordRoute />}>
                      <Route
                        path="settings/discord"
                        element={<DiscordWebhooksPage />}
                      />
                    </Route>
                  </Route>
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      <Toaster />
    </TooltipProvider>
  )
}

export default App
