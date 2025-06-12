import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Dumbbell, TrendingUp, Target, Clock, Flame, Play, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: todayWorkout, isLoading: workoutLoading, error: workoutError } = useQuery({
    queryKey: ["/api/today-workout"],
    retry: 1,
  });

  const { data: userProgress, isLoading: progressLoading, error: progressError } = useQuery({
    queryKey: ["/api/user-progress"],
    retry: 1,
  });

  const { data: weeklyStats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["/api/weekly-stats"],
    retry: 1,
  });

  const { data: recentActivity, isLoading: activityLoading, error: activityError } = useQuery({
    queryKey: ["/api/recent-activity"],
    retry: 1,
  });

  const completeWorkoutMutation = useMutation({
    mutationFn: async (workoutId: number) => {
      await apiRequest("POST", "/api/complete-workout", { workoutId });
    },
    onSuccess: () => {
      toast({
        title: "Workout Completed!",
        description: "Great job! Keep up the momentum.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/today-workout"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recent-activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-progress"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete workout. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Show loading state if any critical data is loading
  if (workoutLoading || progressLoading || statsLoading) {
    return (
      <MobileLayout>
        <div className="space-y-4">
          {/* Loading skeleton for Today's Workout */}
          <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-10 bg-gray-300 rounded"></div>
              </div>
            </CardContent>
          </Card>
          
          {/* Loading skeleton for stats */}
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="animate-pulse">
                    <div className="h-3 bg-gray-300 rounded w-1/2 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="space-y-4">
        {/* Today's Workout - Hero Section */}
        {todayWorkout ? (
          <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-yellow-700">Today's Workout</CardTitle>
                  <CardDescription className="text-yellow-600">Ready to crush it?</CardDescription>
                </div>
                <div className="bg-yellow-500 rounded-full p-2">
                  <Dumbbell className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">{(todayWorkout as any)?.name || "Today's Training"}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{(todayWorkout as any)?.description || "Complete your scheduled workout for today"}</p>
                
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    <Clock className="h-3 w-3 mr-1" />
                    {(todayWorkout as any)?.duration || 45} min
                  </Badge>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {(todayWorkout as any)?.difficulty || 'Intermediate'}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Link href="/workouts" className="flex-1">
                    <Button 
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Workout
                    </Button>
                  </Link>
                  <Link href="/workouts">
                    <Button variant="outline" size="icon">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
            <CardContent className="p-6 text-center">
              <Dumbbell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <h3 className="font-semibold text-gray-700 mb-1">No workout scheduled</h3>
              <p className="text-sm text-gray-500 mb-4">Start your fitness journey today</p>
              <Link href="/programs">
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-white">
                  Browse Programs
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Mobile Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="mobile-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Streak</p>
                  <p className="text-xl font-bold">{(userProgress as any)?.streak || 0}</p>
                </div>
                <Flame className="h-6 w-6 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="mobile-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-xl font-bold">{(weeklyStats as any)?.completed || 0}/7</p>
                </div>
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="mobile-header">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity && (recentActivity as any)?.length > 0 ? (
              <div className="space-y-3">
                {(recentActivity as any).slice(0, 3).map((activity: any, index: number) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{activity.name || 'Workout'}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.completedAt ? new Date(activity.completedAt).toLocaleDateString() : 'Today'}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {activity.status || 'Completed'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <TrendingUp className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm">No recent activity</p>
                <p className="text-xs">Complete your first workout to see progress here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/calendar">
            <Button className="w-full" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Calendar
            </Button>
          </Link>
          <Link href="/programs">
            <Button className="w-full" variant="outline">
              <Target className="mr-2 h-4 w-4" />
              Programs
            </Button>
          </Link>
        </div>
      </div>
    </MobileLayout>
  );
}