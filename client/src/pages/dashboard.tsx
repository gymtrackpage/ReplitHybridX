import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Dumbbell, TrendingUp, Target, Clock, Trophy, Flame } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: todayWorkout } = useQuery({
    queryKey: ["/api/today-workout"],
  });

  const { data: userProgress } = useQuery({
    queryKey: ["/api/user-progress"],
  });

  const { data: weeklyStats } = useQuery({
    queryKey: ["/api/weekly-stats"],
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["/api/recent-activity"],
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}!
          </h1>
          <p className="text-muted-foreground">
            Ready to continue your fitness journey?
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userProgress?.streak || 0}</div>
              <p className="text-xs text-muted-foreground">Days in a row</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{weeklyStats?.completed || 0}/7</div>
              <p className="text-xs text-muted-foreground">Workouts completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userProgress?.totalWorkouts || 0}</div>
              <p className="text-xs text-muted-foreground">Sessions completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Event</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {user?.hyroxEventDate ? 
                  Math.ceil((new Date(user.hyroxEventDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 7)) 
                  : "--"
                }
              </div>
              <p className="text-xs text-muted-foreground">
                {user?.hyroxEventDate ? "Weeks until event" : "No event scheduled"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Workout */}
        {todayWorkout && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="h-5 w-5" />
                    Today's Workout
                  </CardTitle>
                  <CardDescription>{todayWorkout.name}</CardDescription>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800">
                  Week {todayWorkout.week}, Day {todayWorkout.day}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {todayWorkout.estimatedDuration} minutes
                </div>
              </div>
              
              <p className="text-sm">{todayWorkout.description}</p>
              
              <div className="flex gap-2">
                <Link href="/workouts">
                  <Button className="bg-yellow-400 hover:bg-yellow-500 text-black">
                    <Dumbbell className="h-4 w-4 mr-2" />
                    Start Workout
                  </Button>
                </Link>
                <Link href="/calendar">
                  <Button variant="outline">
                    View Schedule
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest workout sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity && recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.slice(0, 5).map((activity: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{activity.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(activity.completedAt).toLocaleDateString()} • {activity.duration}min
                        </p>
                      </div>
                      <Badge className={
                        activity.status === "completed" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-yellow-100 text-yellow-800"
                      }>
                        {activity.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                  <p>No recent activity</p>
                  <p className="text-sm">Complete your first workout to see it here!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and navigation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/calendar">
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="mr-2 h-4 w-4" />
                  View Calendar
                </Button>
              </Link>
              <Link href="/programs">
                <Button className="w-full justify-start" variant="outline">
                  <Target className="mr-2 h-4 w-4" />
                  Browse Programs
                </Button>
              </Link>
              <Link href="/progress">
                <Button className="w-full justify-start" variant="outline">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Track Progress
                </Button>
              </Link>
              <Link href="/workouts">
                <Button className="w-full justify-start" variant="outline">
                  <Dumbbell className="mr-2 h-4 w-4" />
                  Browse Workouts
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* No Program Selected State */}
        {!todayWorkout && (
          <Card className="text-center py-12">
            <CardContent>
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ready to Start Training?</h3>
              <p className="text-muted-foreground mb-4">
                Select a training program to get your personalized workout schedule.
              </p>
              <div className="flex gap-2 justify-center">
                <Link href="/programs">
                  <Button className="bg-yellow-400 hover:bg-yellow-500 text-black">
                    Browse Programs
                  </Button>
                </Link>
                <Link href="/assessment">
                  <Button variant="outline">
                    Take Assessment
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}