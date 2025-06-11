import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { useAuth } from "./hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

// Pages
import Landing from "./pages/landing";
import Dashboard from "./pages/dashboard";
import Admin from "./pages/admin";
import Subscribe from "./pages/subscribe";
import SubscriptionChoice from "./pages/subscription-choice";
import EnhancedAssessment from "./pages/enhanced-assessment";
import RandomWorkout from "./pages/random-workout";
import Calendar from "./pages/calendar";
import Profile from "./pages/profile";
import WeightTracker from "./pages/weight-tracker";
import Programs from "./pages/programs";
import NotFound from "./pages/not-found";

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
        <Route component={NotFound} />
      </Switch>
    );
  }

  if (userStatus && !(userStatus as any).assessmentCompleted) {
    return (
      <Switch>
        <Route path="/assessment" component={EnhancedAssessment} />
        <Route path="*" component={() => {
          window.location.href = "/assessment";
          return null;
        }} />
      </Switch>
    );
  }

  if (userStatus && (userStatus as any).assessmentCompleted && (userStatus as any).subscriptionStatus === "none") {
    return (
      <Switch>
        <Route path="/subscription-choice" component={SubscriptionChoice} />
        <Route path="/subscribe" component={Subscribe} />
        <Route path="*" component={() => {
          window.location.href = "/subscription-choice";
          return null;
        }} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/profile" component={Profile} />
      <Route path="/weight-tracker" component={WeightTracker} />
      <Route path="/programs" component={Programs} />
      <Route path="/random-workout" component={RandomWorkout} />
      <Route path="/admin" component={Admin} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/subscription-choice" component={SubscriptionChoice} />
      <Route path="/assessment" component={EnhancedAssessment} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}