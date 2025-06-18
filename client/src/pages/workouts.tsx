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
  Calendar,
  X,
  User,
  MapPin
} from "lucide-react";
import { ShareToStravaButton } from "@/components/ShareToStravaButton";
import { WorkoutCompletionDialog } from "@/components/WorkoutCompletionDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Workouts() {
  const { toast } = useToast();
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [workoutToComplete, setWorkoutToComplete] = useState<any>(null);
  const [showWorkoutDetails, setShowWorkoutDetails] = useState(false);
  const [workoutDetailsData, setWorkoutDetailsData] = useState<any>(null);

  const { data: todayWorkout, error: todayWorkoutError } = useQuery({
    queryKey: ["/api/today-workout"],
    retry: 2,
  });

  const { data: upcomingWorkouts, error: upcomingWorkoutsError } = useQuery({
    queryKey: ["/api/upcoming-workouts"],
    retry: 2,
  });

  const { data: recentWorkouts, error: recentWorkoutsError } = useQuery({
    queryKey: ["/api/recent-workouts"],
    retry: 2,
  });

  const { data: randomWorkout, refetch: generateRandomWorkout } = useQuery({
    queryKey: ["/api/random-workout"],
    enabled: false,
  });

  // Show error messages for failed queries
  if (todayWorkoutError || upcomingWorkoutsError || recentWorkoutsError) {
    console.error("Workout query errors:", {
      todayWorkoutError,
      upcomingWorkoutsError,
      recentWorkoutsError
    });
  }

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

  const handleWorkoutClick = (workout: any) => {
    setWorkoutDetailsData(workout);
    setShowWorkoutDetails(true);
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

              {todayWorkout.exercises && Array.isArray(todayWorkout.exercises) && todayWorkout.exercises.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Exercises:</h4>
                  <div className="grid gap-2">
                    {todayWorkout.exercises.map((exercise: any, index: number) => (
                      <div key={index} className="text-sm bg-white rounded p-2">
                        <div className="font-medium">{exercise.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {exercise.sets && exercise.reps && (
                            <span>{exercise.sets} x {exercise.reps}</span>
                          )}
                          {exercise.sets && exercise.duration && (
                            <span>{exercise.sets} x {exercise.duration}</span>
                          )}
                          {exercise.duration && !exercise.sets && (
                            <span>{exercise.duration}</span>
                          )}
                          {exercise.distance && (
                            <span> • {exercise.distance}</span>
                          )}
                          {exercise.description && (
                            <div className="mt-1 text-gray-600">{exercise.description}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (todayWorkout && todayWorkout.id) {
                      console.log("Opening completion dialog for workout:", todayWorkout.id);
                      setWorkoutToComplete(todayWorkout);
                      setShowCompletionDialog(true);
                    } else {
                      console.error("Cannot complete workout: missing workout data or ID");
                      toast({
                        title: "Error",
                        description: "No workout available to complete",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="bg-yellow-400 hover:bg-yellow-500 text-black"
                  disabled={!todayWorkout || !todayWorkout.id}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Workout
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (todayWorkout && todayWorkout.id) {
                      skipWorkoutMutation.mutate(todayWorkout.id);
                    } else {
                      toast({
                        title: "Error",
                        description: "No workout available to skip",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={skipWorkoutMutation.isPending || !todayWorkout || !todayWorkout.id}
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

              {randomWorkout.exercises && Array.isArray(randomWorkout.exercises) && randomWorkout.exercises.length > 0 && (
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
                Next 3 Days
              </CardTitle>
              <CardDescription>Your upcoming training sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingWorkouts?.length > 0 ? (
                upcomingWorkouts.map((workout: any, index: number) => {
                  const dayLabels = ['Today', 'Tomorrow', 'Day After'];
                  return (
                    <div 
                      key={workout.id}
                      className="flex justify-between items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => handleWorkoutClick(workout)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={index === 0 ? "default" : "outline"} className="text-xs">
                            {dayLabels[index] || `Day ${index + 1}`}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Week {workout.week}, Day {workout.day}
                          </span>
                        </div>
                        <div className="font-medium text-sm">{workout.name}</div>
                        {workout.description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {workout.description}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2">
                        <Badge variant="outline" className="text-xs">
                          {workout.estimatedDuration || 60}min
                        </Badge>
                        <Badge className={`text-xs ${getWorkoutTypeColor(workout.workoutType)}`}>
                          {workout.workoutType || 'Training'}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2" />
                  <p>No upcoming workouts scheduled</p>
                  <p className="text-xs mt-1">Select a program to see upcoming workouts</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Workouts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Last 3 Days
              </CardTitle>
              <CardDescription>Your recent workout activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentWorkouts?.length > 0 ? (
                recentWorkouts.map((workout: any, index: number) => {
                  const completedDate = new Date(workout.completedAt);
                  const now = new Date();
                  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const workoutDate = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate());
                  const daysDiff = Math.floor((today.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));

                  let dayLabel = 'Earlier';
                  if (daysDiff === 0) dayLabel = 'Today';
                  else if (daysDiff === 1) dayLabel = 'Yesterday';
                  else if (daysDiff === 2) dayLabel = '2 days ago';
                  else if (daysDiff === 3) dayLabel = '3 days ago';

                  return (
                    <div 
                      key={workout.id}
                      className="flex justify-between items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => handleWorkoutClick(workout)}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        {getStatusIcon(workout.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-muted-foreground">
                              {dayLabel}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {completedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {workout.week && workout.day && (
                              <span className="text-xs text-muted-foreground">
                                • W{workout.week}D{workout.day}
                              </span>
                            )}
                          </div>
                          <div className="font-medium text-sm">{workout.name}</div>
                          {workout.duration && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Completed in {workout.duration} minutes
                            </div>
                          )}
                          {workout.rating && workout.rating > 0 && workout.rating <= 5 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Rating: {'★'.repeat(Math.max(0, Math.min(5, workout.rating)))}{'☆'.repeat(Math.max(0, 5 - Math.max(0, Math.min(5, workout.rating))))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2">
                        <Badge variant="outline" className="text-xs">
                          {workout.estimatedDuration || 60}min
                        </Badge>
                        <Badge 
                          className={`text-xs ${
                            workout.status === "completed" 
                              ? "bg-green-100 text-green-800" 
                              : workout.status === "skipped"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {workout.status}
                        </Badge>
                        {workout.status === "completed" && (
                          <ShareToStravaButton 
                            workoutId={workout.workoutId}
                            workoutName={workout.name}
                            defaultDuration={workout.duration}
                            className="mt-1"
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                  <p>No recent activity</p>
                  <p className="text-xs mt-1">Complete workouts to see them here</p>
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

        {/* Workout Completion Dialog */}
        <WorkoutCompletionDialog
          isOpen={showCompletionDialog}
          onClose={() => {
            setShowCompletionDialog(false);
            // Don't clear workoutToComplete immediately to allow Strava sharing
            setTimeout(() => setWorkoutToComplete(null), 100);
          }}
          workout={workoutToComplete}
          onComplete={(data) => {
            // The dialog handles the completion internally
            setShowCompletionDialog(false);
            // Don't clear workoutToComplete immediately to allow Strava sharing
            setTimeout(() => setWorkoutToComplete(null), 100);
          }}
        />

        {/* Workout Details Modal */}
        <Dialog open={showWorkoutDetails} onOpenChange={setShowWorkoutDetails}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {workoutDetailsData?.status && getStatusIcon(workoutDetailsData.status)}
                <span>{workoutDetailsData?.name}</span>
              </DialogTitle>
            </DialogHeader>
            
            {workoutDetailsData && (
              <div className="space-y-6">
                {/* Workout Overview */}
                <div className="flex flex-wrap gap-3">
                  {workoutDetailsData.workoutType && (
                    <Badge className={getWorkoutTypeColor(workoutDetailsData.workoutType)}>
                      {workoutDetailsData.workoutType}
                    </Badge>
                  )}
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {workoutDetailsData.estimatedDuration || workoutDetailsData.duration || 60} min
                  </Badge>
                  {workoutDetailsData.week && workoutDetailsData.day && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Week {workoutDetailsData.week}, Day {workoutDetailsData.day}
                    </Badge>
                  )}
                  {workoutDetailsData.status && (
                    <Badge 
                      className={`
                        ${workoutDetailsData.status === "completed" ? "bg-green-100 text-green-800" : ""}
                        ${workoutDetailsData.status === "skipped" ? "bg-yellow-100 text-yellow-800" : ""}
                        ${workoutDetailsData.status === "upcoming" ? "bg-blue-100 text-blue-800" : ""}
                      `}
                    >
                      {workoutDetailsData.status}
                    </Badge>
                  )}
                </div>

                {/* Description */}
                {workoutDetailsData.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-lg">
                      {workoutDetailsData.description}
                    </p>
                  </div>
                )}

                {/* Exercises */}
                {workoutDetailsData.exercises && Array.isArray(workoutDetailsData.exercises) && workoutDetailsData.exercises.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Dumbbell className="h-4 w-4" />
                      Exercises ({workoutDetailsData.exercises.length})
                    </h3>
                    <div className="space-y-3">
                      {workoutDetailsData.exercises.map((exercise: any, index: number) => (
                        <div key={index} className="bg-white border rounded-lg p-4">
                          <div className="font-medium text-base mb-2 flex items-center justify-between">
                            <span>{exercise.name || `Exercise ${index + 1}`}</span>
                            {exercise.type && (
                              <Badge variant="outline" className="text-xs">
                                {exercise.type}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {exercise.sets && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700 min-w-[60px]">Sets:</span>
                                <span className="bg-blue-50 text-blue-800 px-2 py-1 rounded text-xs">
                                  {exercise.sets}
                                </span>
                              </div>
                            )}
                            
                            {exercise.reps && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700 min-w-[60px]">Reps:</span>
                                <span className="bg-green-50 text-green-800 px-2 py-1 rounded text-xs">
                                  {exercise.reps}
                                </span>
                              </div>
                            )}
                            
                            {exercise.duration && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700 min-w-[60px]">Duration:</span>
                                <span className="bg-purple-50 text-purple-800 px-2 py-1 rounded text-xs">
                                  {exercise.duration}
                                </span>
                              </div>
                            )}
                            
                            {exercise.weight && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700 min-w-[60px]">Weight:</span>
                                <span className="bg-red-50 text-red-800 px-2 py-1 rounded text-xs">
                                  {exercise.weight}
                                </span>
                              </div>
                            )}
                            
                            {exercise.distance && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700 min-w-[60px]">Distance:</span>
                                <span className="bg-yellow-50 text-yellow-800 px-2 py-1 rounded text-xs">
                                  {exercise.distance}
                                </span>
                              </div>
                            )}
                            
                            {exercise.rest && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700 min-w-[60px]">Rest:</span>
                                <span className="bg-gray-50 text-gray-800 px-2 py-1 rounded text-xs">
                                  {exercise.rest}
                                </span>
                              </div>
                            )}
                            
                            {exercise.tempo && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700 min-w-[60px]">Tempo:</span>
                                <span className="bg-indigo-50 text-indigo-800 px-2 py-1 rounded text-xs">
                                  {exercise.tempo}
                                </span>
                              </div>
                            )}
                            
                            {exercise.intensity && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700 min-w-[60px]">Intensity:</span>
                                <span className="bg-orange-50 text-orange-800 px-2 py-1 rounded text-xs">
                                  {exercise.intensity}
                                </span>
                              </div>
                            )}
                            
                            {exercise.equipment && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700 min-w-[60px]">Equipment:</span>
                                <span className="bg-teal-50 text-teal-800 px-2 py-1 rounded text-xs">
                                  {exercise.equipment}
                                </span>
                              </div>
                            )}
                            
                            {exercise.target && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700 min-w-[60px]">Target:</span>
                                <span className="bg-pink-50 text-pink-800 px-2 py-1 rounded text-xs">
                                  {exercise.target}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Exercise Notes/Instructions */}
                          {exercise.instructions && (
                            <div className="mt-3">
                              <span className="font-medium text-gray-700 text-sm">Instructions:</span>
                              <div className="mt-1 text-sm text-gray-600 bg-blue-50 p-3 rounded border-l-4 border-blue-200">
                                {exercise.instructions}
                              </div>
                            </div>
                          )}
                          
                          {exercise.description && (
                            <div className="mt-3">
                              <span className="font-medium text-gray-700 text-sm">Description:</span>
                              <div className="mt-1 text-sm text-gray-600 bg-gray-50 p-3 rounded border-l-4 border-gray-200">
                                {exercise.description}
                              </div>
                            </div>
                          )}
                          
                          {exercise.notes && (
                            <div className="mt-3">
                              <span className="font-medium text-gray-700 text-sm">Notes:</span>
                              <div className="mt-1 text-sm text-gray-600 bg-yellow-50 p-3 rounded border-l-4 border-yellow-200">
                                {exercise.notes}
                              </div>
                            </div>
                          )}
                          
                          {/* Show any additional fields that might exist */}
                          {Object.keys(exercise).filter(key => 
                            !['name', 'type', 'sets', 'reps', 'duration', 'weight', 'distance', 'rest', 'tempo', 'intensity', 'equipment', 'target', 'instructions', 'description', 'notes'].includes(key)
                          ).length > 0 && (
                            <div className="mt-3">
                              <span className="font-medium text-gray-700 text-sm">Additional Info:</span>
                              <div className="mt-1 text-xs text-gray-500 bg-slate-50 p-2 rounded font-mono">
                                {Object.entries(exercise).filter(([key]) => 
                                  !['name', 'type', 'sets', 'reps', 'duration', 'weight', 'distance', 'rest', 'tempo', 'intensity', 'equipment', 'target', 'instructions', 'description', 'notes'].includes(key)
                                ).map(([key, value]) => (
                                  <div key={key} className="flex gap-2">
                                    <span className="font-semibold">{key}:</span>
                                    <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completion Details (for completed workouts) */}
                {workoutDetailsData.status === "completed" && (
                  <div className="space-y-4">
                    {workoutDetailsData.completedAt && (
                      <div>
                        <h3 className="font-semibold mb-2">Completion Details</h3>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>Completed: {new Date(workoutDetailsData.completedAt).toLocaleString()}</div>
                          {workoutDetailsData.duration && (
                            <div>Duration: {workoutDetailsData.duration} minutes</div>
                          )}
                          {workoutDetailsData.rating && workoutDetailsData.rating > 0 && (
                            <div>Rating: {'★'.repeat(Math.max(0, Math.min(5, workoutDetailsData.rating)))}{'☆'.repeat(Math.max(0, 5 - Math.max(0, Math.min(5, workoutDetailsData.rating))))}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {workoutDetailsData.comments && (
                      <div>
                        <h3 className="font-semibold mb-2">Comments</h3>
                        <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-lg">
                          {workoutDetailsData.comments}
                        </p>
                      </div>
                    )}

                    {/* Strava Share Button for completed workouts */}
                    <div className="flex justify-center pt-2">
                      <ShareToStravaButton 
                        workoutId={workoutDetailsData.workoutId || workoutDetailsData.id}
                        workoutName={workoutDetailsData.name}
                        defaultDuration={workoutDetailsData.duration}
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons for upcoming workouts */}
                {workoutDetailsData.status === "upcoming" && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Button 
                      className="flex-1"
                      onClick={() => {
                        setShowWorkoutDetails(false);
                        // You can add logic here to start the workout
                      }}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Workout
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setShowWorkoutDetails(false);
                        // You can add logic here to skip the workout
                      }}
                    >
                      Skip
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}