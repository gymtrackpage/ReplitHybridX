import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dumbbell, RefreshCw, Clock, Target, CheckCircle, Zap } from "lucide-react";

interface RandomWorkout {
  name: string;
  description: string;
  estimatedDuration: number;
  exercises: any[];
  workoutType: string;
  structure: string;
}

export default function RandomWorkout() {
  const { toast } = useToast();
  const [currentWorkout, setCurrentWorkout] = useState<RandomWorkout | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const generateWorkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/generate-random-workout");
      return response;
    },
    onSuccess: (workout) => {
      setCurrentWorkout(workout);
      setIsCompleted(false);
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate workout",
        variant: "destructive",
      });
    },
  });

  const completeWorkoutMutation = useMutation({
    mutationFn: async (workoutData: { duration?: number; notes?: string; rating?: number }) => {
      await apiRequest("POST", "/api/complete-random-workout", {
        workoutData: currentWorkout,
        ...workoutData
      });
    },
    onSuccess: () => {
      setIsCompleted(true);
      toast({
        title: "Workout Completed!",
        description: "Great job! Your random workout has been logged.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete workout",
        variant: "destructive",
      });
    },
  });

  const handleCompleteWorkout = () => {
    if (currentWorkout) {
      completeWorkoutMutation.mutate({
        duration: currentWorkout.estimatedDuration,
        notes: "Random workout completed",
        rating: 5
      });
    }
  };

  return (
    <MobileLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Random Workout Generator</h1>
          <p className="text-muted-foreground">
            Get a surprise HYROX-style workout tailored to challenge you
          </p>
        </div>

        {!currentWorkout ? (
          <Card className="text-center py-12">
            <CardContent>
              <Zap className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Ready for a Challenge?</h3>
              <p className="text-muted-foreground mb-6">
                Generate a randomized HYROX workout with exercises, timing, and structure
              </p>
              <Button 
                onClick={() => generateWorkoutMutation.mutate()}
                disabled={generateWorkoutMutation.isPending}
                className="bg-yellow-400 hover:bg-yellow-500 text-black"
                size="lg"
              >
                {generateWorkoutMutation.isPending ? (
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                ) : (
                  <Dumbbell className="h-5 w-5 mr-2" />
                )}
                Generate Random Workout
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Workout Header */}
            <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{currentWorkout.name}</CardTitle>
                    <CardDescription className="text-lg mt-2">
                      {currentWorkout.description}
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => generateWorkoutMutation.mutate()}
                    disabled={generateWorkoutMutation.isPending}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    New Workout
                  </Button>
                </div>
                
                <div className="flex gap-4 mt-4">
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <Clock className="h-3 w-3 mr-1" />
                    {currentWorkout.estimatedDuration} min
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-800">
                    <Target className="h-3 w-3 mr-1" />
                    {currentWorkout.workoutType}
                  </Badge>
                  <Badge className="bg-green-100 text-green-800">
                    {currentWorkout.structure}
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Exercise List */}
            <Card>
              <CardHeader>
                <CardTitle>Exercises</CardTitle>
                <CardDescription>Complete these exercises as described</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentWorkout.exercises?.map((exercise, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-lg">{exercise.name}</h4>
                        {exercise.type && (
                          <Badge variant="outline">{exercise.type}</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                        {exercise.reps && (
                          <div>
                            <span className="font-medium">Reps:</span> {exercise.reps}
                          </div>
                        )}
                        {exercise.duration && (
                          <div>
                            <span className="font-medium">Duration:</span> {exercise.duration}s
                          </div>
                        )}
                        {exercise.distance && (
                          <div>
                            <span className="font-medium">Distance:</span> {exercise.distance}m
                          </div>
                        )}
                        {exercise.sets && (
                          <div>
                            <span className="font-medium">Sets:</span> {exercise.sets}
                          </div>
                        )}
                        {exercise.restBetweenSets && (
                          <div>
                            <span className="font-medium">Rest:</span> {exercise.restBetweenSets}s
                          </div>
                        )}
                        {exercise.rounds && (
                          <div>
                            <span className="font-medium">Rounds:</span> {exercise.rounds}
                          </div>
                        )}
                      </div>
                      
                      {exercise.notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          {exercise.notes}
                        </p>
                      )}
                    </div>
                  )) || (
                    <p className="text-muted-foreground">No exercises available for this workout.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6">
                {!isCompleted ? (
                  <div className="flex gap-4 justify-center">
                    <Button 
                      onClick={handleCompleteWorkout}
                      disabled={completeWorkoutMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      {completeWorkoutMutation.isPending ? (
                        <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                      ) : (
                        <CheckCircle className="h-5 w-5 mr-2" />
                      )}
                      Mark as Completed
                    </Button>
                    <Button 
                      onClick={() => setCurrentWorkout(null)}
                      variant="outline"
                      size="lg"
                    >
                      Skip This Workout
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-green-700 mb-2">
                      Workout Completed!
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Great job finishing your random workout. It's been logged to your history.
                    </p>
                    <Button 
                      onClick={() => generateWorkoutMutation.mutate()}
                      disabled={generateWorkoutMutation.isPending}
                      className="bg-yellow-400 hover:bg-yellow-500 text-black"
                    >
                      <Dumbbell className="h-4 w-4 mr-2" />
                      Generate Another Workout
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}