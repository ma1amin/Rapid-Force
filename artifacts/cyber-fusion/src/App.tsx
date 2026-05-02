import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/hooks/useAuth";
import { LicenseProvider } from "@/hooks/useLicenses";
import { AdminAuthProvider, useAdminAuth } from "@/hooks/useAdminAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ModuleGate from "@/components/license/ModuleGate";
import AdminShell from "@/components/admin/AdminShell";
import NotFound from "@/pages/not-found";
import Shell from "@/components/layout/Shell";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Agents from "@/pages/Agents";
import Sprints from "@/pages/Sprints";
import Missions from "@/pages/Missions";
import Threats from "@/pages/Threats";
import Activity from "@/pages/Activity";
import Detections from "@/pages/Detections";
import Incidents from "@/pages/Incidents";
import AdversarialSim from "@/pages/AdversarialSim";
import ThreatHunting from "@/pages/ThreatHunting";
import LicenseAdmin from "@/pages/LicenseAdmin";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminTenants from "@/pages/admin/AdminTenants";
import AdminTenantDetail from "@/pages/admin/AdminTenantDetail";
import AdminUsers from "@/pages/admin/AdminUsers";
import { type ReactNode, useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AdminProtectedRoute({ children }: { children: ReactNode }) {
  const { admin, loading } = useAdminAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !admin) navigate("/admin/login");
  }, [loading, admin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-xs font-mono text-muted-foreground">
        LOADING...
      </div>
    );
  }
  if (!admin) return null;
  return <>{children}</>;
}

function AdminApp() {
  return (
    <AdminAuthProvider>
      <Switch>
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/tenants/:id">
          {(params) => (
            <AdminProtectedRoute>
              <AdminShell>
                <AdminTenantDetail />
              </AdminShell>
            </AdminProtectedRoute>
          )}
        </Route>
        <Route path="/admin/tenants">
          <AdminProtectedRoute>
            <AdminShell><AdminTenants /></AdminShell>
          </AdminProtectedRoute>
        </Route>
        <Route path="/admin/users">
          <AdminProtectedRoute>
            <AdminShell><AdminUsers /></AdminShell>
          </AdminProtectedRoute>
        </Route>
        <Route path="/admin">
          <AdminProtectedRoute>
            <AdminShell><AdminDashboard /></AdminShell>
          </AdminProtectedRoute>
        </Route>
      </Switch>
    </AdminAuthProvider>
  );
}

function AppRoutes() {
  return (
    <ProtectedRoute>
      <LicenseProvider>
        <Shell>
          <Switch>
            <Route path="/">
              <ModuleGate moduleKey="command_center"><Dashboard /></ModuleGate>
            </Route>
            <Route path="/agents">
              <ModuleGate moduleKey="agent_fleet"><Agents /></ModuleGate>
            </Route>
            <Route path="/sprints">
              <ModuleGate moduleKey="sprint_ops"><Sprints /></ModuleGate>
            </Route>
            <Route path="/missions">
              <ModuleGate moduleKey="missions"><Missions /></ModuleGate>
            </Route>
            <Route path="/threats">
              <ModuleGate moduleKey="threat_intel"><Threats /></ModuleGate>
            </Route>
            <Route path="/detections">
              <ModuleGate moduleKey="detection_eng"><Detections /></ModuleGate>
            </Route>
            <Route path="/incidents">
              <ModuleGate moduleKey="incidents"><Incidents /></ModuleGate>
            </Route>
            <Route path="/activity">
              <ModuleGate moduleKey="event_log"><Activity /></ModuleGate>
            </Route>
            <Route path="/adversarial">
              <ModuleGate moduleKey="adversarial_sim"><AdversarialSim /></ModuleGate>
            </Route>
            <Route path="/hunting">
              <ModuleGate moduleKey="threat_hunting"><ThreatHunting /></ModuleGate>
            </Route>
            <Route path="/license-admin">
              <ModuleGate moduleKey="license_admin"><LicenseAdmin /></ModuleGate>
            </Route>
            <Route component={NotFound} />
          </Switch>
        </Shell>
      </LicenseProvider>
    </ProtectedRoute>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/admin/:rest*" component={AdminApp} />
      <Route path="/admin" component={AdminApp} />
      <Route>
        <AppRoutes />
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
