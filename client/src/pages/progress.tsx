import { useQuery } from "@tanstack/react-query";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar, Target, Trophy, Flame, Clock, Dumbbell } from "lucide-react";

export default function Progress() {
  const { data: userProgress, isLoading } = useQuery({
    queryKey: ["/api/user-progress"],
  });

  const { data: workoutHistory } = useQuery({
    queryKey: ["/api/workout-history"],
  });

  const { data: progressStats } = useQuery({
    queryKey: ["/api/progress-stats"],
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-32 animate-pulse">
                <CardContent className="p-0 h-full bg-gray-100 rounded" />
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Progress Tracking</h1>
          <p className="text-muted-foreground">
            Monitor your fitness journey and achievements
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userProgress?.totalWorkouts || 0}</div>
              <p className="text-xs text-muted-foreground">
                Completed sessions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userProgress?.streak || 0}</div>
              <p className="text-xs text-muted-foreground">
                Days in a row
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progressStats?.weeklyCompleted || 0}</div>
              <p className="text-xs text-muted-foreground">
                Workouts completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progressStats?.totalMinutes || 0}</div>
              <p className="text-xs text-muted-foreground">
                Minutes trained
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Recent Achievements
              </CardTitle>
              <CardDescription>Your latest milestones and badges</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {progressStats?.achievements?.length > 0 ? (
                progressStats.achievements.slice(0, 5).map((achievement: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Trophy className="h-8 w-8 text-yellow-600" />
                      <div>
                        <div className="font-medium">{achievement.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(achievement.earnedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {achievement.category}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-8 w-8 mx-auto mb-2" />
                  <p>No achievements yet</p>
                  <p className="text-sm">Complete workouts to earn badges!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progress Chart
              </CardTitle>
              <CardDescription>Your workout frequency over time</CardDescription>
            </CardHeader>
            <CardContent>
              {progressStats?.chartData ? (
                <div className="space-y-4">
                  {progressStats.chartData.map((week: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">Week {week.week}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-yellow-400 h-2 rounded-full" 
                            style={{ width: `${(week.completed / 7) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {week.completed}/7
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                  <p>No progress data yet</p>
                  <p className="text-sm">Start completing workouts to see your progress!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Workout History */}
        <Card>
          <CardHeader>
            <CardTitle>Workout History</CardTitle>
            <CardDescription>Your recent training sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {workoutHistory?.length > 0 ? (
              <div className="space-y-3">
                {workoutHistory.slice(0, 10).map((workout: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{workout.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(workout.completedAt).toLocaleDateString()} • 
                        Week {workout.week}, Day {workout.day}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {workout.estimatedDuration}min
                      </Badge>
                      <Badge className={workout.status === "completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                        {workout.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2" />
                <p>No workout history yet</p>
                <p className="text-sm">Complete your first workout to see it here!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}