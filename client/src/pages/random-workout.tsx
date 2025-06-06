import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import { Shuffle, Play, CheckCircle, Clock, Dumbbell, Timer, Target } from "lucide-react";

interface HyroxExercise {
  name: string;
  reps?: number;
  duration?: number;
  distance?: number;
  sets?: number;
  restBetweenSets?: number;
}

interface RandomWorkout {
  name: string;
  description: string;
  estimatedDuration: number;
  exercises: HyroxExercise[];
  workoutType: string;
}

export default function RandomWorkout() {
  const [currentWorkout, setCurrentWorkout] = useState<RandomWorkout | null>(null);
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [workoutDuration, setWorkoutDuration] = useState("");
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [workoutRating, setWorkoutRating] = useState(5);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate random workout
  const generateWorkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/generate-random-workout");
      return response.json();
    },
    onSuccess: (data: RandomWorkout) => {
      setCurrentWorkout(data);
      setIsWorkoutStarted(false);
      toast({
        title: "New Workout Generated!",
        description: `${data.name} - ${data.estimatedDuration} minutes`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Generation Failed",
        description: "Could not generate workout. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Complete workout
  const completeWorkoutMutation = useMutation({
    mutationFn: async (completionData: any) => {
      const response = await apiRequest("POST", "/api/complete-random-workout", completionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-workout-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workout-completions"] });
      
      toast({
        title: "Workout Completed!",
        description: "Your random workout has been logged to your calendar.",
      });
      
      setIsCompletionModalOpen(false);
      setCurrentWorkout(null);
      setIsWorkoutStarted(false);
      setWorkoutDuration("");
      setWorkoutNotes("");
      setWorkoutRating(5);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Completion Failed",
        description: "Could not log workout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCompleteWorkout = () => {
    if (!currentWorkout) return;
    
    const completionData = {
      workoutData: currentWorkout,
      duration: workoutDuration ? parseInt(workoutDuration) : currentWorkout.estimatedDuration,
      notes: workoutNotes,
      rating: workoutRating
    };
    
    completeWorkoutMutation.mutate(completionData);
  };

  const formatExercise = (exercise: HyroxExercise): string => {
    let parts: string[] = [];
    
    if (exercise.sets && exercise.sets > 1) {
      parts.push(`${exercise.sets} sets of`);
    }
    
    if (exercise.reps) {
      parts.push(`${exercise.reps} reps`);
    }
    
    if (exercise.distance) {
      parts.push(`${exercise.distance}m`);
    }
    
    if (exercise.duration) {
      parts.push(`${exercise.duration}s`);
    }
    
    if (exercise.restBetweenSets) {
      parts.push(`(${exercise.restBetweenSets}s rest)`);
    }
    
    return parts.join(" ");
  };

  const getWorkoutTypeColor = (type: string) => {
    switch (type) {
      case 'strength': return 'bg-red-100 text-red-800';
      case 'cardio': return 'bg-blue-100 text-blue-800';
      case 'mixed': return 'bg-purple-100 text-purple-800';
      case 'station-focus': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Random HYROX Workout" />
      
      <main className="px-4 py-6 pb-20">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* Generator Section */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Shuffle className="h-6 w-6" />
                HYROX Workout Generator
              </CardTitle>
              <p className="text-muted-foreground">
                Generate a challenging 20-30 minute HYROX-style workout instantly
              </p>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                onClick={() => generateWorkoutMutation.mutate()}
                disabled={generateWorkoutMutation.isPending}
                size="lg"
                className="w-full sm:w-auto"
              >
                {generateWorkoutMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Shuffle className="h-4 w-4 mr-2" />
                    Generate Random Workout
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Current Workout Display */}
          {currentWorkout && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="h-5 w-5" />
                    {currentWorkout.name}
                  </CardTitle>
                  <Badge className={getWorkoutTypeColor(currentWorkout.workoutType)}>
                    {currentWorkout.workoutType}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{currentWorkout.description}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Timer className="h-4 w-4" />
                    {currentWorkout.estimatedDuration} minutes
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    {currentWorkout.exercises.length} exercises
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">Workout Structure:</h4>
                  {currentWorkout.exercises.map((exercise, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{exercise.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatExercise(exercise)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2 pt-4">
                  {!isWorkoutStarted ? (
                    <Button 
                      onClick={() => setIsWorkoutStarted(true)}
                      className="flex-1"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Workout
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => setIsCompletionModalOpen(true)}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Workout
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    onClick={() => generateWorkoutMutation.mutate()}
                    disabled={generateWorkoutMutation.isPending}
                  >
                    <Shuffle className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Workout Completion Modal */}
          <Dialog open={isCompletionModalOpen} onOpenChange={setIsCompletionModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Complete Workout</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="duration">Actual Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder={currentWorkout?.estimatedDuration.toString()}
                    value={workoutDuration}
                    onChange={(e) => setWorkoutDuration(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="rating">Rating (1-10)</Label>
                  <Input
                    id="rating"
                    type="number"
                    min="1"
                    max="10"
                    value={workoutRating}
                    onChange={(e) => setWorkoutRating(parseInt(e.target.value) || 5)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="How did the workout feel? Any modifications?"
                    value={workoutNotes}
                    onChange={(e) => setWorkoutNotes(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleCompleteWorkout}
                    disabled={completeWorkoutMutation.isPending}
                    className="flex-1"
                  >
                    {completeWorkoutMutation.isPending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Logging...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Log Workout
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setIsCompletionModalOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
}