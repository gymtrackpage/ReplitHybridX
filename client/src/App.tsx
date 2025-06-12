import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { useAuth } from "./hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Landing from "./pages/landing";
import Dashboard from "./pages/dashboard";
import Programs from "./pages/programs";
import Assessment from "./pages/assessment";
import Calendar from "./pages/calendar";
import Workouts from "./pages/workouts";
import RandomWorkout from "./pages/random-workout";
import Progress from "./pages/progress";
import Profile from "./pages/profile";
import Settings from "./pages/settings";
import Admin from "./pages/admin";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  
  const { data: userStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/user-onboarding-status"],
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading || (isAuthenticated && statusLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Check if user needs to complete assessment
  if (userStatus && !(userStatus as any).assessmentCompleted) {
    return (
      <Switch>
        <Route path="/assessment" component={Assessment} />
        <Route component={Assessment} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/programs" component={Programs} />
      <Route path="/assessment" component={Assessment} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/workouts" component={Workouts} />
      <Route path="/random-workout" component={RandomWorkout} />
      <Route path="/progress" component={Progress} />
      <Route path="/profile" component={Profile} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={Admin} />
      <Route component={Dashboard} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}