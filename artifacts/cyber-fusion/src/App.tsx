import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Shell from "@/components/layout/Shell";
import Dashboard from "@/pages/Dashboard";
import Agents from "@/pages/Agents";
import Sprints from "@/pages/Sprints";
import Missions from "@/pages/Missions";
import Threats from "@/pages/Threats";
import Activity from "@/pages/Activity";
import Detections from "@/pages/Detections";
import Incidents from "@/pages/Incidents";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/agents" component={Agents} />
        <Route path="/sprints" component={Sprints} />
        <Route path="/missions" component={Missions} />
        <Route path="/threats" component={Threats} />
        <Route path="/detections" component={Detections} />
        <Route path="/incidents" component={Incidents} />
        <Route path="/activity" component={Activity} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
