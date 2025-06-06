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

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard"],
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
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
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
    if (!dashboardData?.todaysWorkout?.id) return;
    
    completeWorkoutMutation.mutate({
      workoutId: dashboardData.todaysWorkout.id,
      rating: selectedRating || undefined,
      notes: workoutNotes.trim() || undefined,
      skipped: false
    });
  };

  const handleSkipWorkout = () => {
    if (!dashboardData?.todaysWorkout?.id) return;
    
    completeWorkoutMutation.mutate({
      workoutId: dashboardData.todaysWorkout.id,
      skipped: true
    });
  };

  const handleShareWorkout = () => {
    if (!dashboardData?.todaysWorkout) return;
    
    const shareData = {
      title: `HYROX Training - ${dashboardData.todaysWorkout.name}`,
      text: `Just completed: ${dashboardData.todaysWorkout.name}\n${dashboardData.todaysWorkout.description}`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData);
    } else {
      navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      toast({
        title: "Copied to clipboard",
        description: "Workout details copied to clipboard",
      });
    }
  };

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
        <Header title="Welcome" />
        
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
        
        <div className="h-16"></div>
        <BottomNav />
      </div>
    );
  }

  const { progress, todaysWorkout, weeklyCompletions } = dashboardData;

  return (
    <div className="min-h-screen bg-background">
      <Header title="Dashboard" />
      
      {/* User Welcome Section */}
      <div className="bg-card px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Welcome back, {user?.firstName || 'User'}!</h2>
            <p className="text-sm text-muted-foreground">Ready for today's training?</p>
          </div>
          {user?.profileImageUrl && (
            <img
              src={user.profileImageUrl}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover"
            />
          )}
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
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{todaysWorkout.duration || 0}m</span>
                      </div>
                      <span className="text-xs">•</span>
                      <span>Week {todaysWorkout.week}/Day {todaysWorkout.day}</span>
                      {todaysWorkout.exercises && todaysWorkout.exercises.length > 0 && (
                        <>
                          <span className="text-xs">•</span>
                          <span>{todaysWorkout.exercises.length} exercises</span>
                        </>
                      )}
                    </div>
                    
                    {todaysWorkout.description && (
                      <p className="text-muted-foreground text-sm leading-relaxed">
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
                                {exercise.intensity && ` • ${exercise.intensity}`}
                                {exercise.pace && ` • Pace: ${exercise.pace}`}
                                {exercise.rounds && ` • ${exercise.rounds} rounds`}
                                {exercise.target && ` • Target: ${exercise.target}`}
                                {exercise.equipment && ` • ${exercise.equipment}`}
                                {exercise.type && ` • ${exercise.type}`}
                              </p>
                            )}
                            {exercise.description && exercise.description !== exercise.name && (
                              <p className="text-xs text-muted-foreground mt-1">{exercise.description}</p>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No workout today</h3>
                <p className="text-muted-foreground mb-4">
                  Enjoy your rest day or check your program schedule.
                </p>
                <Link href="/calendar">
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    View Calendar
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Workout Actions - Only show if there's a workout */}
        {todaysWorkout && (
          <Card className="bg-card rounded-2xl shadow-lg border-0 mb-6">
            <CardContent className="p-6">
              {/* How did this workout feel? */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">How did this workout feel?</h3>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <Button 
                    variant={selectedRating === 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedRating(selectedRating === 1 ? null : 1)}
                    className="text-xs"
                  >
                    Too Easy
                  </Button>
                  <Button 
                    variant={selectedRating === 3 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedRating(selectedRating === 3 ? null : 3)}
                    className="text-xs"
                  >
                    Perfect
                  </Button>
                  <Button 
                    variant={selectedRating === 5 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedRating(selectedRating === 5 ? null : 5)}
                    className="text-xs"
                  >
                    Too Hard
                  </Button>
                </div>
              </div>

              {/* Notes section */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">Notes (optional)</label>
                <Textarea
                  value={workoutNotes}
                  onChange={(e) => setWorkoutNotes(e.target.value)}
                  placeholder="How did the workout go? Any comments?"
                  className="min-h-[80px]"
                />
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleCompleteWorkout}
                  disabled={completeWorkoutMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {completeWorkoutMutation.isPending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Complete Workout
                </Button>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleSkipWorkout}
                    disabled={completeWorkoutMutation.isPending}
                    className="flex-1"
                  >
                    <SkipForward className="h-4 w-4 mr-2" />
                    Skip Today
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleShareWorkout}
                    className="flex-1"
                  >
                    <Share className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats Card */}
        <Card className="bg-card rounded-2xl shadow-lg border-0 mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">This Week</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{weeklyCompletions?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Workouts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{progress?.currentWeek || 1}</div>
                <div className="text-sm text-muted-foreground">Week</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <div className="h-16"></div>
      <BottomNav />

      {/* Exercise Detail Dialog */}
      <Dialog open={isExerciseDetailOpen} onOpenChange={setIsExerciseDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {selectedExercise?.name || selectedExercise?.exercise || 'Exercise Details'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedExercise?.description && selectedExercise.description !== selectedExercise.name && (
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-1">DESCRIPTION</h4>
                <p className="text-sm">{selectedExercise.description}</p>
              </div>
            )}
            
            {/* Exercise Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {selectedExercise?.sets && (
                <div>
                  <span className="font-semibold text-muted-foreground">Sets:</span>
                  <p>{selectedExercise.sets}</p>
                </div>
              )}
              {selectedExercise?.reps && (
                <div>
                  <span className="font-semibold text-muted-foreground">Reps:</span>
                  <p>{selectedExercise.reps}</p>
                </div>
              )}
              {selectedExercise?.duration && (
                <div>
                  <span className="font-semibold text-muted-foreground">Duration:</span>
                  <p>{selectedExercise.duration}</p>
                </div>
              )}
              {selectedExercise?.distance && (
                <div>
                  <span className="font-semibold text-muted-foreground">Distance:</span>
                  <p>{selectedExercise.distance}</p>
                </div>
              )}
              {selectedExercise?.weight && (
                <div>
                  <span className="font-semibold text-muted-foreground">Weight:</span>
                  <p>{selectedExercise.weight}</p>
                </div>
              )}
              {selectedExercise?.rpe && (
                <div>
                  <span className="font-semibold text-muted-foreground">RPE:</span>
                  <p>{selectedExercise.rpe}</p>
                </div>
              )}
              {selectedExercise?.rest && (
                <div>
                  <span className="font-semibold text-muted-foreground">Rest:</span>
                  <p>{selectedExercise.rest}</p>
                </div>
              )}
              {selectedExercise?.tempo && (
                <div>
                  <span className="font-semibold text-muted-foreground">Tempo:</span>
                  <p>{selectedExercise.tempo}</p>
                </div>
              )}
              {selectedExercise?.intensity && (
                <div>
                  <span className="font-semibold text-muted-foreground">Intensity:</span>
                  <p>{selectedExercise.intensity}</p>
                </div>
              )}
              {selectedExercise?.pace && (
                <div>
                  <span className="font-semibold text-muted-foreground">Pace:</span>
                  <p>{selectedExercise.pace}</p>
                </div>
              )}
              {selectedExercise?.rounds && (
                <div>
                  <span className="font-semibold text-muted-foreground">Rounds:</span>
                  <p>{selectedExercise.rounds}</p>
                </div>
              )}
              {selectedExercise?.target && (
                <div>
                  <span className="font-semibold text-muted-foreground">Target:</span>
                  <p>{selectedExercise.target}</p>
                </div>
              )}
              {selectedExercise?.equipment && (
                <div>
                  <span className="font-semibold text-muted-foreground">Equipment:</span>
                  <p>{selectedExercise.equipment}</p>
                </div>
              )}
              {selectedExercise?.type && (
                <div>
                  <span className="font-semibold text-muted-foreground">Type:</span>
                  <p>{selectedExercise.type}</p>
                </div>
              )}
            </div>
            
            <Button 
              onClick={() => setIsExerciseDetailOpen(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}