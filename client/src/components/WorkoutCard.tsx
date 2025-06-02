import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Flame, Dumbbell, Play, FastForward, Info } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Workout } from "@shared/schema";

interface WorkoutCardProps {
  workout: Workout;
}

export default function WorkoutCard({ workout }: WorkoutCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const completeWorkoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/complete-workout", {
        workoutId: workout.id,
        duration: workout.estimatedDuration,
        notes: "",
        exerciseData: {},
      });
    },
    onSuccess: () => {
      toast({
        title: "Workout Completed!",
        description: "Great job finishing your workout!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record workout completion.",
        variant: "destructive",
      });
    },
  });

  const skipWorkoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/skip-workout");
    },
    onSuccess: () => {
      toast({
        title: "Workout Skipped",
        description: "We'll move you to the next workout.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to skip workout.",
        variant: "destructive",
      });
    },
  });

  const handleStartWorkout = () => {
    if (confirm("Start your workout now?")) {
      completeWorkoutMutation.mutate();
    }
  };

  const handleSkipWorkout = () => {
    if (confirm("Are you sure you want to skip today's workout?")) {
      skipWorkoutMutation.mutate();
    }
  };

  // Parse exercises from JSON
  const exercises = Array.isArray(workout.exercises) ? workout.exercises : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Today's Workout</CardTitle>
          <Badge variant="secondary">Week {workout.week} • Day {workout.day}</Badge>
        </div>
        
        {/* Workout Image */}
        <div className="w-full h-48 bg-muted rounded-lg mb-4 flex items-center justify-center">
          <Dumbbell className="h-12 w-12 text-muted-foreground" />
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">{workout.name}</h3>
          <div className="flex items-center text-sm text-muted-foreground space-x-4">
            <span className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {workout.estimatedDuration} min
            </span>
            <span className="flex items-center">
              <Flame className="h-4 w-4 mr-1" />
              Intermediate
            </span>
            <span className="flex items-center">
              <Dumbbell className="h-4 w-4 mr-1" />
              {exercises.length} exercises
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Exercise List */}
        <div className="space-y-3 mb-6">
          {exercises.slice(0, 3).map((exercise: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-foreground">{exercise.name || `Exercise ${index + 1}`}</p>
                  <p className="text-sm text-muted-foreground">
                    {exercise.sets || 3} sets × {exercise.reps || '8-10'} reps
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Info className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          {exercises.length > 3 && (
            <p className="text-sm text-muted-foreground text-center">
              +{exercises.length - 3} more exercises
            </p>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button 
            className="flex-1 bg-primary hover:bg-primary/90" 
            onClick={handleStartWorkout}
            disabled={completeWorkoutMutation.isPending}
          >
            <Play className="h-4 w-4 mr-2" />
            {completeWorkoutMutation.isPending ? "Starting..." : "Start Workout"}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSkipWorkout}
            disabled={skipWorkoutMutation.isPending}
          >
            <FastForward className="h-4 w-4 mr-2" />
            Skip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
