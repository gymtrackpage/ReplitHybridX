import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Admin from "@/pages/admin";
import Subscribe from "@/pages/subscribe";
import SubscriptionChoice from "@/pages/subscription-choice";
import EnhancedAssessment from "@/pages/enhanced-assessment";
import RandomWorkout from "@/pages/random-workout";
import Calendar from "@/pages/calendar";
import Profile from "@/pages/profile";
import WeightTracker from "@/pages/weight-tracker";
import Programs from "@/pages/programs";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  // Get user assessment and subscription status
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

  // If not authenticated, show landing page
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // If authenticated but assessment not completed, redirect to assessment
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

  // If assessment completed but no subscription choice made, redirect to subscription choice
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

  // Full app access for users who completed onboarding
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}

export default App;