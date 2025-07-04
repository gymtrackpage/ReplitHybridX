import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Switch, Route } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { Logo } from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { ReferralTracker } from "@/components/ReferralTracker";
import { ErrorBoundary } from 'react-error-boundary'

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

  // Debug logging to understand redirect issue
  if (isAuthenticated && userStatus) {
    console.log("App routing - User status check:", {
      assessmentCompleted: (userStatus as any).assessmentCompleted,
      subscriptionStatus: (userStatus as any).subscriptionStatus,
      currentPath: window.location.pathname,
      userStatus
    });
  }

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

  // Extract user status data with proper defaults
  const assessmentCompleted = (userStatus as any)?.assessmentCompleted || false;
  const subscriptionStatus = (userStatus as any)?.subscriptionStatus || 'none';
  const currentProgramId = (userStatus as any)?.currentProgramId;
  
  // Allow access to payment and subscription success pages regardless of assessment status
  const isOnPaymentFlow = window.location.pathname.includes('/payment') || 
                         window.location.pathname.includes('/subscription-success');
  
  // Check if user has active subscription (including various active states)
  const hasActiveSubscription = ['active', 'trialing', 'past_due'].includes(subscriptionStatus);
  const isFreeTrial = subscriptionStatus === 'free_trial';
  
  // New users must complete assessment before accessing any features
  // Exception: Allow payment flow pages and users with active subscriptions to skip assessment
  const shouldShowAssessment = !assessmentCompleted && !isOnPaymentFlow && !hasActiveSubscription;
  
  console.log("App routing decision:", {
    assessmentCompleted,
    subscriptionStatus,
    hasActiveSubscription,
    isFreeTrial,
    currentProgramId,
    isOnPaymentFlow,
    shouldShowAssessment,
    currentPath: window.location.pathname,
    userStatusRaw: userStatus
  });

  // Additional detailed logging for debugging assessment routing
  if (shouldShowAssessment) {
    console.log("🔄 Redirecting to assessment because:", {
      assessmentNotCompleted: !assessmentCompleted,
      notOnPaymentFlow: !isOnPaymentFlow,
      noActiveSubscription: !hasActiveSubscription,
      allConditions: {
        assessmentCompleted,
        isOnPaymentFlow,
        hasActiveSubscription
      }
    });
  } else {
    console.log("✅ Allowing access to main app:", {
      reason: hasActiveSubscription ? "Has active subscription" : 
              assessmentCompleted ? "Assessment completed" : 
              isOnPaymentFlow ? "On payment flow" : "Unknown"
    });
  }

  // Additional detailed logging for debugging assessment routing
  if (shouldShowAssessment) {
    console.log("🔄 Redirecting to assessment because:", {
      assessmentNotCompleted: !assessmentCompleted,
      notOnPaymentFlow: !isOnPaymentFlow,
      noActiveSubscription: !hasActiveSubscription,
      allConditions: {
        assessmentCompleted,
        isOnPaymentFlow,
        hasActiveSubscription
      }
    });
  } else {
    console.log("✅ Allowing access to main app:", {
      reason: hasActiveSubscription ? "Has active subscription" : 
              assessmentCompleted ? "Assessment completed" : 
              isOnPaymentFlow ? "On payment flow" : "Unknown"
    });
  }
  
  // Force assessment completion for new users
  if (shouldShowAssessment) {
    return (
      <Switch>
        <Route path="/payment" component={Payment} />
        <Route path="/subscription-success" component={SubscriptionSuccess} />
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
      <Route path="/payment" component={Payment} />
      <Route path="/progress" component={Progress} />
      <Route path="/profile" component={Profile} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={Admin} />
      <Route path="/referral" component={() => import("./pages/ReferralDashboard").then(m => m.default)} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/" component={Dashboard} />
      <Route component={Dashboard} />
    </Switch>
  );
}

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary 
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('App Error Boundary caught an error:', error, errorInfo);
      }}
    >
      <QueryClientProvider client={queryClient}>
        <Router />
        <ReferralTracker />
        <Toaster />
        <PWAInstallPrompt />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}