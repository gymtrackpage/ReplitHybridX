import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Dumbbell, Calendar, User, ClipboardList, Share, SkipForward, CheckCircle, Clock, ChevronRight } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<any | null>(null);
  const [isExerciseDetailOpen, setIsExerciseDetailOpen] = useState(false);

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
    }
  }, [authLoading, isAuthenticated, toast]);

  // Fetch today's workout
  const { data: todaysWorkout, isLoading, error } = useQuery({
    queryKey: ["/api/workouts/today"],
    retry: false,
  });

  // Complete workout mutation
  const completeWorkoutMutation = useMutation({
    mutationFn: async (data: { workoutId: number; rating?: number; notes?: string; skipped: boolean }) => {
      return await apiRequest("POST", "/api/workout-completions", data);
    },
    onSuccess: () => {
      toast({
        title: "Workout Completed!",
        description: "Great job on finishing your workout!",
      });
      setWorkoutNotes("");
      setSelectedRating(null);
      queryClient.invalidateQueries({ queryKey: ["/api/workouts/today"] });
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
        title: "Error",
        description: "Failed to complete workout. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle error from query
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

  // Button handlers
  const handleExerciseClick = (exercise: any) => {
    setSelectedExercise(exercise);
    setIsExerciseDetailOpen(true);
  };

  const handleCompleteWorkout = () => {
    if (!todaysWorkout?.id) return;
    
    completeWorkoutMutation.mutate({
      workoutId: todaysWorkout.id,
      rating: selectedRating || undefined,
      notes: workoutNotes.trim() || undefined,
      skipped: false
    });
  };

  const handleSkipWorkout = () => {
    if (!todaysWorkout?.id) return;
    
    completeWorkoutMutation.mutate({
      workoutId: todaysWorkout.id,
      skipped: true
    });
  };

  const handleShareWorkout = () => {
    if (!todaysWorkout) return;
    
    const shareText = `Check out my workout: ${todaysWorkout.name}\n\nWeek ${todaysWorkout.week}, Day ${todaysWorkout.day}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'My Workout',
        text: shareText,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Copied to clipboard",
        description: "Workout details copied to clipboard",
      });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Welcome Section */}
      <div className="px-4 pt-6 pb-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}!
          </h1>
          <p className="text-muted-foreground text-sm">
            Ready to crush today's workout?
          </p>
        </div>
      </div>

      {/* Quick Action Tiles */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/calendar">
            <Card className="cursor-pointer hover:shadow-md transition-shadow bg-card border-0 rounded-2xl">
              <CardContent className="p-4 text-center">
                <Calendar className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Calendar</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/random-workout">
            <Card className="cursor-pointer hover:shadow-md transition-shadow bg-card border-0 rounded-2xl">
              <CardContent className="p-4 text-center">
                <Dumbbell className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Random Workout</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/profile">
            <Card className="cursor-pointer hover:shadow-md transition-shadow bg-card border-0 rounded-2xl">
              <CardContent className="p-4 text-center">
                <User className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Profile</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/history">
            <Card className="cursor-pointer hover:shadow-md transition-shadow bg-card border-0 rounded-2xl">
              <CardContent className="p-4 text-center">
                <ClipboardList className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">History</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      <main className="px-4 py-6 pb-20 max-w-full overflow-hidden">
        {/* Today's Workout Card */}
        <Card className="bg-card rounded-2xl shadow-lg border-0 mb-6 w-full max-w-full overflow-hidden">
          <CardContent className="p-0">
            {todaysWorkout ? (
              <div>
                {/* Workout Header with Accent */}
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                  <div className="pl-6 pr-4 py-4 bg-card">
                    <div className="mb-2">
                      <h2 className="text-sm font-semibold text-muted-foreground mb-1">Today's workout</h2>
                      <h3 className="text-xl font-bold text-foreground">{todaysWorkout.name}</h3>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span>Week {todaysWorkout.week}/Day {todaysWorkout.day}</span>
                      {todaysWorkout.exercises && todaysWorkout.exercises.length > 0 && (
                        <>
                          <span className="text-xs">•</span>
                          <span>{todaysWorkout.exercises.length} exercises</span>
                        </>
                      )}
                    </div>
                    
                    {todaysWorkout.description && (
                      <p className="text-muted-foreground text-sm leading-relaxed italic">
                        {todaysWorkout.description}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Exercise List */}
                {todaysWorkout.exercises && todaysWorkout.exercises.length > 0 && (
                  <div className="px-4 py-4 border-t border-border">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Exercises</h4>
                    <div className="space-y-2">
                      {todaysWorkout.exercises.map((exercise: any, index: number) => (
                        <div 
                          key={index} 
                          onClick={() => handleExerciseClick(exercise)}
                          className="flex items-start justify-between p-3 bg-muted rounded-xl cursor-pointer hover:bg-muted/80 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {exercise.name || exercise.exercise || `Exercise ${index + 1}`}
                            </p>
                            {(exercise.sets || exercise.reps || exercise.duration || exercise.distance || exercise.weight || exercise.rpe || exercise.rest || exercise.tempo || exercise.type || exercise.intensity || exercise.pace || exercise.rounds || exercise.target || exercise.equipment) && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {exercise.sets && `${exercise.sets} sets`}
                                {exercise.sets && exercise.reps && ' × '}
                                {exercise.reps && `${exercise.reps} reps`}
                                {exercise.duration && ` • ${exercise.duration}`}
                                {exercise.distance && ` • ${exercise.distance}`}
                                {exercise.weight && ` • ${exercise.weight}`}
                                {exercise.rpe && ` • RPE ${exercise.rpe}`}
                                {exercise.rest && ` • Rest: ${exercise.rest}`}
                                {exercise.tempo && ` • Tempo: ${exercise.tempo}`}
                                {exercise.type && ` • Type: ${exercise.type}`}
                                {exercise.intensity && ` • Intensity: ${exercise.intensity}`}
                                {exercise.pace && ` • Pace: ${exercise.pace}`}
                                {exercise.rounds && ` • Rounds: ${exercise.rounds}`}
                                {exercise.target && ` • Target: ${exercise.target}`}
                                {exercise.equipment && ` • Equipment: ${exercise.equipment}`}
                              </p>
                            )}
                            {exercise.description && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                {exercise.description}
                              </p>
                            )}
                            {exercise.notes && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                Note: {exercise.notes}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground ml-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="px-4 py-4 border-t border-border bg-muted/50">
                  <div className="space-y-3">
                    {/* Rating Selection */}
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">How did it feel? (1-5)</p>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <Button
                            key={rating}
                            variant={selectedRating === rating ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedRating(rating)}
                            className="w-8 h-8 p-0"
                          >
                            {rating}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Notes */}
                    <div>
                      <Textarea
                        placeholder="Add notes about your workout..."
                        value={workoutNotes}
                        onChange={(e) => setWorkoutNotes(e.target.value)}
                        className="resize-none"
                        rows={2}
                      />
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleCompleteWorkout}
                        disabled={completeWorkoutMutation.isPending}
                        className="flex-1"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        onClick={handleSkipWorkout}
                        disabled={completeWorkoutMutation.isPending}
                      >
                        <SkipForward className="w-4 h-4 mr-2" />
                        Skip
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        onClick={handleShareWorkout}
                      >
                        <Share className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No workout scheduled</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  You're all caught up! Check back tomorrow for your next workout.
                </p>
                <Link href="/random-workout">
                  <Button variant="outline">
                    <Dumbbell className="w-4 h-4 mr-2" />
                    Try Random Workout
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Exercise Detail Modal */}
      <Dialog open={isExerciseDetailOpen} onOpenChange={setIsExerciseDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedExercise?.name || selectedExercise?.exercise || 'Exercise Details'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedExercise?.description && (
              <div>
                <h4 className="font-medium text-sm text-foreground mb-1">Description</h4>
                <p className="text-sm text-muted-foreground italic">{selectedExercise.description}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              {selectedExercise?.sets && (
                <div>
                  <span className="font-medium text-foreground">Sets:</span>
                  <span className="text-muted-foreground ml-1">{selectedExercise.sets}</span>
                </div>
              )}
              {selectedExercise?.reps && (
                <div>
                  <span className="font-medium text-foreground">Reps:</span>
                  <span className="text-muted-foreground ml-1">{selectedExercise.reps}</span>
                </div>
              )}
              {selectedExercise?.duration && (
                <div>
                  <span className="font-medium text-foreground">Duration:</span>
                  <span className="text-muted-foreground ml-1">{selectedExercise.duration}</span>
                </div>
              )}
              {selectedExercise?.weight && (
                <div>
                  <span className="font-medium text-foreground">Weight:</span>
                  <span className="text-muted-foreground ml-1">{selectedExercise.weight}</span>
                </div>
              )}
              {selectedExercise?.rpe && (
                <div>
                  <span className="font-medium text-foreground">RPE:</span>
                  <span className="text-muted-foreground ml-1">{selectedExercise.rpe}</span>
                </div>
              )}
              {selectedExercise?.rest && (
                <div>
                  <span className="font-medium text-foreground">Rest:</span>
                  <span className="text-muted-foreground ml-1">{selectedExercise.rest}</span>
                </div>
              )}
            </div>
            
            {selectedExercise?.notes && (
              <div>
                <h4 className="font-medium text-sm text-foreground mb-1">Notes</h4>
                <p className="text-sm text-muted-foreground italic">{selectedExercise.notes}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}