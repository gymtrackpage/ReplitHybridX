
import React from "react";
import { Router, Route, Switch, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "./components/ui/toaster";
import Landing from "./pages/landing";
import Dashboard from "./pages/dashboard";
import Assessment from "./pages/assessment";
import Profile from "./pages/profile";
import Progress from "./pages/progress";
import Calendar from "./pages/calendar";
import Workouts from "./pages/workouts";
import Programs from "./pages/programs";
import Settings from "./pages/settings";
import Admin from "./pages/admin";
import Payment from "./pages/payment";
import SubscriptionSuccess from "./pages/subscription-success";
import RandomWorkout from "./pages/random-workout";
import FreeWorkouts from "./pages/free-workouts";
import CustomLogin from "./pages/custom-login";
import ReferralDashboard from "./pages/ReferralDashboard";
import { useAuth } from "./hooks/useAuth";
import { ReferralTracker } from "./components/ReferralTracker";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { OfflineIndicator } from "./components/OfflineIndicator";

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-primary text-white rounded"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppRoutes() {
  const { user, loading, error } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If there's an authentication error, redirect to login
  if (error && (error as any)?.status === 401) {
    // Clear any stale session data
    localStorage.removeItem('auth-timestamp');
  }

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={CustomLogin} />
      <Route path="/dashboard">
        {user ? <Dashboard /> : <Redirect to="/login" />}
      </Route>
      <Route path="/assessment">
        {user ? <Assessment /> : <Redirect to="/login" />}
      </Route>
      <Route path="/profile">
        {user ? <Profile /> : <Redirect to="/login" />}
      </Route>
      <Route path="/progress">
        {user ? <Progress /> : <Redirect to="/login" />}
      </Route>
      <Route path="/calendar">
        {user ? <Calendar /> : <Redirect to="/login" />}
      </Route>
      <Route path="/workouts">
        {user ? <Workouts /> : <Redirect to="/login" />}
      </Route>
      <Route path="/programs">
        {user ? <Programs /> : <Redirect to="/login" />}
      </Route>
      <Route path="/settings">
        {user ? <Settings /> : <Redirect to="/login" />}
      </Route>
      <Route path="/admin">
        {user?.role === 'admin' ? <Admin /> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/payment">
        {user ? <Payment /> : <Redirect to="/login" />}
      </Route>
      <Route path="/subscription-success">
        {user ? <SubscriptionSuccess /> : <Redirect to="/login" />}
      </Route>
      <Route path="/random-workout">
        {user ? <RandomWorkout /> : <Redirect to="/login" />}
      </Route>
      <Route path="/free-workouts" component={FreeWorkouts} />
      <Route path="/referral-dashboard">
        {user ? <ReferralDashboard /> : <Redirect to="/login" />}
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppRoutes />
          <Toaster />
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
