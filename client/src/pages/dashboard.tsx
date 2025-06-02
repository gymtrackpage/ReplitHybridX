import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import WorkoutCard from "@/components/WorkoutCard";
import ProgressCalendar from "@/components/ProgressCalendar";
import ProgramCard from "@/components/ProgramCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, CheckCircle, Clock, Trophy, Weight, Utensils, MessageCircle, Search, Crown } from "lucide-react";

export default function Dashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard"],
    enabled: isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !dashboardData) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={user} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Welcome to Hybrid X!</h1>
            <p className="text-muted-foreground mb-6">
              Let's get you started with a fitness assessment and program selection.
            </p>
            <Button onClick={() => window.location.href = "/assessment"}>
              Start Assessment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { progress, todaysWorkout, weeklyCompletions } = dashboardData;

  const quickActions = [
    {
      icon: Weight,
      label: "Log Weight",
      action: () => toast({ title: "Weight logging coming soon!" }),
    },
    {
      icon: Utensils,
      label: "Nutrition Guide",
      action: () => toast({ title: "Nutrition guide coming soon!" }),
    },
    {
      icon: MessageCircle,
      label: "Contact Trainer",
      action: () => toast({ title: "Trainer messaging coming soon!" }),
    },
    {
      icon: Search,
      label: "Browse Programs",
      action: () => window.location.href = "/programs",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user.firstName || 'Athlete'}!
          </h1>
          <p className="text-muted-foreground">Ready to crush your fitness goals today?</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Flame className="h-4 w-4 text-primary" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Streak</p>
                  <p className="text-xl font-bold text-foreground">{user.streak || 0} days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-secondary" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-xl font-bold text-foreground">
                    {progress?.completedWorkouts || 0}/{progress?.totalWorkouts || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Time</p>
                  <p className="text-xl font-bold text-foreground">{user.totalWorkouts || 0}h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Trophy className="h-4 w-4 text-accent" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Level</p>
                  <p className="text-xl font-bold text-foreground">
                    {user.fitnessLevel || 'Beginner'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Workout */}
            {todaysWorkout ? (
              <WorkoutCard workout={todaysWorkout} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No Workout Scheduled</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    You don't have a workout scheduled for today. Check back tomorrow or browse available programs.
                  </p>
                  <Button onClick={() => window.location.href = "/programs"}>
                    Browse Programs
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Weekly Progress */}
            <ProgressCalendar completions={weeklyCompletions || []} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Current Program */}
            {progress && <ProgramCard progress={progress} />}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {quickActions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <Button
                        key={index}
                        variant="ghost"
                        className="w-full justify-between h-auto p-3"
                        onClick={action.action}
                      >
                        <div className="flex items-center">
                          <Icon className="h-5 w-5 text-primary mr-3" />
                          <span className="font-medium">{action.label}</span>
                        </div>
                        <span className="text-muted-foreground">→</span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Subscription Status */}
            <Card className="gradient-bg text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Premium Member</h3>
                  <Crown className="h-5 w-5 text-yellow-300" />
                </div>
                <p className="text-sm opacity-90 mb-4">
                  Your subscription is {user.subscriptionStatus || 'inactive'}
                </p>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => window.location.href = "/subscribe"}
                >
                  Manage Subscription
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50">
        <div className="flex justify-around py-2">
          <button className="flex flex-col items-center py-2 px-3 text-primary">
            <i className="fas fa-home text-lg"></i>
            <span className="text-xs mt-1">Home</span>
          </button>
          <button className="flex flex-col items-center py-2 px-3 text-muted-foreground">
            <i className="fas fa-dumbbell text-lg"></i>
            <span className="text-xs mt-1">Workouts</span>
          </button>
          <button className="flex flex-col items-center py-2 px-3 text-muted-foreground">
            <i className="fas fa-chart-line text-lg"></i>
            <span className="text-xs mt-1">Progress</span>
          </button>
          <button className="flex flex-col items-center py-2 px-3 text-muted-foreground">
            <i className="fas fa-user text-lg"></i>
            <span className="text-xs mt-1">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
