import React from "react";
import { Router, Route, Switch, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

// Create a stable query client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 401/403 errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

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
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
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

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<CustomLogin />} />
      <Route path="/assessment" element={user ? <Assessment /> : <Navigate to="/login" />} />
      <Route path="/payment" element={user ? <Payment /> : <Navigate to="/login" />} />
      <Route path="/subscription-success" element={user ? <SubscriptionSuccess /> : <Navigate to="/login" />} />
      <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
      <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
      <Route path="/progress" element={user ? <Progress /> : <Navigate to="/login" />} />
      <Route path="/calendar" element={user ? <Calendar /> : <Navigate to="/login" />} />
      <Route path="/workouts" element={user ? <Workouts /> : <Navigate to="/login" />} />
      <Route path="/programs" element={user ? <Programs /> : <Navigate to="/login" />} />
      <Route path="/settings" element={user ? <Settings /> : <Navigate to="/login" />} />
      <Route path="/admin" element={user ? <Admin /> : <Navigate to="/login" />} />
      <Route path="/random-workout" element={user ? <RandomWorkout /> : <Navigate to="/login" />} />
      <Route path="/free-workouts" element={<FreeWorkouts />} />
      <Route path="/referrals" element={user ? <ReferralDashboard /> : <Navigate to="/login" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppRoutes />
          <ReferralTracker />
          <Toaster />
          <PWAInstallPrompt />
          <OfflineIndicator />
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}