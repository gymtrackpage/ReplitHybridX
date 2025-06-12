import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Dumbbell, 
  Clock, 
  Play, 
  CheckCircle, 
  SkipForward, 
  Shuffle,
  Target,
  TrendingUp,
  Calendar
} from "lucide-react";

export default function Workouts() {
  const { toast } = useToast();
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);

  const { data: todayWorkout } = useQuery({
    queryKey: ["/api/today-workout"],
  });

  const { data: upcomingWorkouts } = useQuery({
    queryKey: ["/api/upcoming-workouts"],
  });

  const { data: recentWorkouts } = useQuery({
    queryKey: ["/api/recent-workouts"],
  });

  const { data: randomWorkout, refetch: generateRandomWorkout } = useQuery({
    queryKey: ["/api/random-workout"],
    enabled: false,
  });

  const completeWorkoutMutation = useMutation({
    mutationFn: async (workoutId: number) => {
      await apiRequest("POST", "/api/complete-workout", { workoutId });
    },
    onSuccess: () => {
      toast({
        title: "Workout Completed!",
        description: "Great job on completing your workout.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/today-workout"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recent-workouts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete workout",
        variant: "destructive",
      });
    },
  });

  const skipWorkoutMutation = useMutation({
    mutationFn: async (workoutId: number) => {
      await apiRequest("POST", "/api/skip-workout", { workoutId });
    },
    onSuccess: () => {
      toast({
        title: "Workout Skipped",
        description: "Workout has been skipped for today.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/today-workout"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to skip workout",
        variant: "destructive",
      });
    },
  });

  const getWorkoutTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "strength": return "bg-red-100 text-red-800";
      case "cardio": return "bg-blue-100 text-blue-800";
      case "mixed": return "bg-purple-100 text-purple-800";
      case "conditioning": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "skipped": return <SkipForward className="h-4 w-4 text-yellow-600" />;
      default: return <Play className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <MobileLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Workouts</h1>
            <p className="text-muted-foreground">
              Your training sessions and progress
            </p>
          </div>
          <Button 
            onClick={() => generateRandomWorkout()}
            variant="outline"
            className="gap-2"
          >
            <Shuffle className="h-4 w-4" />
            Random Workout
          </Button>
        </div>

        {/* Today's Workout */}
        {todayWorkout && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Today's Workout
                  </CardTitle>
                  <CardDescription>{todayWorkout.name}</CardDescription>
                </div>
                <Badge className={getWorkoutTypeColor(todayWorkout.workoutType)}>
                  {todayWorkout.workoutType}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {todayWorkout.estimatedDuration} minutes
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Week {todayWorkout.week}, Day {todayWorkout.day}
                </div>
              </div>
              
              <p className="text-sm">{todayWorkout.description}</p>
              
              {todayWorkout.exercises && todayWorkout.exercises.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Exercises:</h4>
                  <div className="grid gap-2">
                    {todayWorkout.exercises.slice(0, 3).map((exercise: any, index: number) => (
                      <div key={index} className="text-sm bg-white rounded p-2">
                        <span className="font-medium">{exercise.name}</span>
                        {exercise.sets && exercise.reps && (
                          <span className="text-muted-foreground ml-2">
                            {exercise.sets} x {exercise.reps}
                          </span>
                        )}
                      </div>
                    ))}
                    {todayWorkout.exercises.length > 3 && (
                      <div className="text-sm text-muted-foreground">
                        +{todayWorkout.exercises.length - 3} more exercises
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => completeWorkoutMutation.mutate(todayWorkout.id)}
                  disabled={completeWorkoutMutation.isPending}
                  className="bg-yellow-400 hover:bg-yellow-500 text-black"
                >
                  {completeWorkoutMutation.isPending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Start Workout
                </Button>
                <Button
                  variant="outline"
                  onClick={() => skipWorkoutMutation.mutate(todayWorkout.id)}
                  disabled={skipWorkoutMutation.isPending}
                >
                  Skip Today
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Random Workout */}
        {randomWorkout && (
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shuffle className="h-5 w-5" />
                    Random Workout
                  </CardTitle>
                  <CardDescription>{randomWorkout.name}</CardDescription>
                </div>
                <Badge className={getWorkoutTypeColor(randomWorkout.workoutType)}>
                  {randomWorkout.workoutType}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {randomWorkout.estimatedDuration} minutes
                </div>
              </div>
              
              <p className="text-sm">{randomWorkout.description}</p>
              
              {randomWorkout.exercises && randomWorkout.exercises.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Exercises:</h4>
                  <div className="grid gap-2">
                    {randomWorkout.exercises.map((exercise: any, index: number) => (
                      <div key={index} className="text-sm bg-white rounded p-2">
                        <span className="font-medium">{exercise.name}</span>
                        {exercise.sets && exercise.reps && (
                          <span className="text-muted-foreground ml-2">
                            {exercise.sets} x {exercise.reps}
                          </span>
                        )}
                        {exercise.duration && (
                          <span className="text-muted-foreground ml-2">
                            {exercise.duration}s
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => generateRandomWorkout()}
                  variant="outline"
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  Generate New
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Upcoming Workouts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Workouts
              </CardTitle>
              <CardDescription>Your next scheduled training sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingWorkouts?.length > 0 ? (
                upcomingWorkouts.slice(0, 5).map((workout: any, index: number) => (
                  <div 
                    key={workout.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    onClick={() => setSelectedWorkout(workout)}
                  >
                    <div>
                      <div className="font-medium text-sm">{workout.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Week {workout.week}, Day {workout.day}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {workout.estimatedDuration}min
                      </Badge>
                      <Badge className={`text-xs ${getWorkoutTypeColor(workout.workoutType)}`}>
                        {workout.workoutType}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2" />
                  <p>No upcoming workouts scheduled</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Workouts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Your completed and skipped workouts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentWorkouts?.length > 0 ? (
                recentWorkouts.slice(0, 5).map((workout: any, index: number) => (
                  <div 
                    key={workout.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(workout.status)}
                      <div>
                        <div className="font-medium text-sm">{workout.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(workout.completedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {workout.estimatedDuration}min
                      </Badge>
                      <Badge 
                        className={`text-xs ${
                          workout.status === "completed" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {workout.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                  <p>No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {!todayWorkout && (
          <Card className="text-center py-12">
            <CardContent>
              <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Workout Scheduled Today</h3>
              <p className="text-muted-foreground mb-4">
                This could be a rest day, or you need to select a training program.
              </p>
              <div className="flex gap-2 justify-center">
                <Button asChild>
                  <a href="/programs">Browse Programs</a>
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => generateRandomWorkout()}
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  Try Random Workout
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}