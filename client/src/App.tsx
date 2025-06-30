import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Switch, Route } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { Logo } from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { ReferralTracker } from "@/components/ReferralTracker";

// Pages
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import Programs from "@/pages/programs";
import Progress from "@/pages/progress";
import Calendar from "@/pages/calendar";
import Settings from "@/pages/settings";
import Assessment from "@/pages/assessment";
import Admin from "@/pages/admin";
import Workouts from "@/pages/workouts";
import Payment from "@/pages/payment";
import SubscriptionSuccess from "@/pages/subscription-success";
import RandomWorkout from "@/pages/random-workout";
import FreeWorkouts from "@/pages/free-workouts";
import CustomLogin from "@/pages/custom-login";
import ReferralDashboard from "@/pages/ReferralDashboard";

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
      <Route path="/login" component={CustomLogin} />
      <Route path="/programs" component={Programs} />
      <Route path="/assessment" component={Assessment} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/workouts" component={Workouts} />
      <Route path="/random-workout" component={RandomWorkout} />
      <Route path="/free-workouts" component={FreeWorkouts} />
      <Route path="/subscription-success" component={SubscriptionSuccess} />
      <Route path="/payment" component={() => import("./pages/payment").then(m => m.default)} />
      <Route path="/progress" component={Progress} />
      <Route path="/profile" component={Profile} />
      <Route path="/settings" component={Settings} />
      <Route path="/referrals" component={ReferralDashboard} />
      <Route path="/admin" component={Admin} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/" component={Dashboard} />
      <Route component={Dashboard} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <ReferralTracker />
      <Toaster />
      <PWAInstallPrompt />
    </QueryClientProvider>
  );
}