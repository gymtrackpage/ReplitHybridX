import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { Logo } from "@/components/Logo";
import { ReferralTracker } from "@/components/ReferralTracker";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

// Pages
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Assessment from "@/pages/assessment";
import Profile from "@/pages/profile";
import Workouts from "@/pages/workouts";
import Programs from "@/pages/programs";
import Progress from "@/pages/progress";
import Calendar from "@/pages/calendar";
import Settings from "@/pages/settings";
import RandomWorkout from "@/pages/random-workout";
import FreeWorkouts from "@/pages/free-workouts";
import Payment from "@/pages/payment";
import SubscriptionSuccess from "@/pages/subscription-success";
import Admin from "@/pages/admin";
import ReferralDashboard from "@/pages/ReferralDashboard";
import CustomLogin from "@/pages/custom-login";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

function App() {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Route path="/" component={Landing} />
          <Route path="/login" component={CustomLogin} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/assessment" component={Assessment} />
          <Route path="/profile" component={Profile} />
          <Route path="/workouts" component={Workouts} />
          <Route path="/programs" component={Programs} />
          <Route path="/progress" component={Progress} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/settings" component={Settings} />
          <Route path="/random-workout" component={RandomWorkout} />
          <Route path="/free-workouts" component={FreeWorkouts} />
          <Route path="/payment" component={Payment} />
          <Route path="/subscription-success" component={SubscriptionSuccess} />
          <Route path="/admin" component={Admin} />
          <Route path="/referrals" component={ReferralDashboard} />
        </Router>
        <ReferralTracker />
        <Toaster />
        <PWAInstallPrompt />
      </QueryClientProvider>
    </React.StrictMode>
  );
}