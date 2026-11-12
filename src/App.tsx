import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom"

import { AppsProvider } from "@/components/apps-provider"
import { AuthProvider } from "@/components/auth-provider"
import { BrandingSync } from "@/components/branding-sync"
import { DiscordWebhooksProvider } from "@/components/discord-webhooks-provider"
import { DashboardProvider } from "@/components/dashboard-provider"
import { IntegrationsProvider } from "@/components/integrations-provider"
import { RequireApp } from "@/components/require-app"
import {
  RequireAuth,
  RequireCanManageUsers,
  RequirePermission,
  RequireSuperAdmin,
  RequireTenantUser,
} from "@/components/route-guards"
import { SystemUsersProvider } from "@/components/system-users-provider"
import { TasksProvider } from "@/components/tasks-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AdminLayout } from "@/layouts/admin-layout"
import { DashboardLayout } from "@/layouts/dashboard-layout"
import { AccountDetailPage } from "@/pages/admin/account-detail-page"
import { AccountsPage } from "@/pages/admin/accounts-page"
import { SuperAdminsPage } from "@/pages/admin/super-admins-page"
import { DashboardPage } from "@/pages/dashboard-page"
import { AnalyticsPage } from "@/pages/analytics-page"
import { AppsPage } from "@/pages/apps-page"
import { BillingPage } from "@/pages/billing-page"
import { KpisPage } from "@/pages/kpis-page"
import { LoginPage } from "@/pages/login-page"
import { MarketingPage } from "@/pages/marketing-page"
import { ReportsPage } from "@/pages/reports-page"
import { ResetPasswordPage } from "@/pages/reset-password-page"
import { SignupPage } from "@/pages/signup-page"
import { TasksPage } from "@/pages/tasks-page"
import { SystemUserDetailPage } from "@/pages/system-user-detail-page"
import { DiscordWebhooksPage } from "@/pages/discord-webhooks-page"
import { DocumentationPage } from "@/pages/documentation-page"
import { IntegrationsPage } from "@/pages/integrations-page"
import { ThemePage } from "@/pages/theme-page"
import { UserManagementPage } from "@/pages/user-management-page"
import { UsersPage } from "@/pages/users-page"

/**
 * Providers that load data from the API. They sit inside the auth guard so a
 * signed-out visitor never triggers a request that would just 401.
 *
 * The panel roster is needed almost everywhere (assignee pickers, avatars) and
 * integration status gates dashboard widgets and KPIs, so both are global.
 * Apps come first because integration status is read for the current app.
 * Dashboard, Tasks, and Discord are scoped to their own routes.
 */
function PanelProviders() {
  return (
    <AppsProvider>
      <SystemUsersProvider>
        <IntegrationsProvider>
          <Outlet />
        </IntegrationsProvider>
      </SystemUsersProvider>
    </AppsProvider>
  )
}

function DashboardRoute() {
  return (
    <DashboardProvider>
      <Outlet />
    </DashboardProvider>
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
          <BrandingSync />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/signup" element={<SignupPage />} />

            <Route element={<RequireAuth />}>
              {/* Super admin console. Yak staff only; no customer data. */}
              <Route path="admin" element={<RequireSuperAdmin />}>
                <Route element={<AdminLayout />}>
                  <Route
                    index
                    element={<Navigate to="/admin/accounts" replace />}
                  />
                  <Route path="accounts" element={<AccountsPage />} />
                  <Route
                    path="accounts/:tenantId"
                    element={<AccountDetailPage />}
                  />
                  <Route path="super-admins" element={<SuperAdminsPage />} />
                  <Route
                    path="*"
                    element={<Navigate to="/admin/accounts" replace />}
                  />
                </Route>
              </Route>

              {/* The customer panel. Super admins are sent to /admin. */}
              <Route element={<RequireTenantUser />}>
                <Route element={<PanelProviders />}>
                  <Route element={<DashboardLayout />}>
                    <Route
                      element={<RequirePermission permission="dashboard" />}
                    >
                      <Route element={<DashboardRoute />}>
                        <Route index element={<DashboardPage />} />
                      </Route>
                    </Route>
                    {/* One app's data: shown for the app picked in the sidebar. */}
                    <Route element={<RequireApp />}>
                      <Route
                        element={<RequirePermission permission="users" />}
                      >
                        <Route path="users" element={<UsersPage />} />
                      </Route>
                      <Route
                        element={<RequirePermission permission="reports" />}
                      >
                        <Route path="reports" element={<ReportsPage />} />
                      </Route>
                      <Route
                        element={<RequirePermission permission="analytics" />}
                      >
                        <Route path="analytics" element={<AnalyticsPage />} />
                      </Route>
                      <Route element={<RequirePermission permission="kpis" />}>
                        <Route path="kpis" element={<KpisPage />} />
                      </Route>
                      <Route element={<RequireCanManageUsers />}>
                        <Route
                          path="settings/integrations"
                          element={<IntegrationsPage />}
                        />
                      </Route>
                    </Route>
                    <Route
                      element={<RequirePermission permission="marketing" />}
                    >
                      <Route path="marketing" element={<MarketingPage />} />
                    </Route>
                    <Route element={<RequirePermission permission="tasks" />}>
                      <Route element={<TasksRoute />}>
                        <Route path="tasks" element={<TasksPage />} />
                      </Route>
                    </Route>
                    <Route
                      element={
                        <RequirePermission permission="user-management" />
                      }
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
                    <Route element={<RequireCanManageUsers />}>
                      <Route path="settings/apps" element={<AppsPage />} />
                      <Route
                        path="settings/billing"
                        element={<BillingPage />}
                      />
                    </Route>
                    <Route
                      path="settings/documentation"
                      element={<DocumentationPage />}
                    />
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
