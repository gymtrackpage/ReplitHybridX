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
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Workout completion mutation
  const completeWorkoutMutation = useMutation({
    mutationFn: async (workoutData: { workoutId: number; rating?: number; notes?: string; skipped?: boolean }) => {
      const response = await apiRequest("POST", "/api/workout-completions", workoutData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setWorkoutNotes("");
      setSelectedRating(null);
      toast({
        title: "Workout Completed!",
        description: "Great job! Your progress has been updated.",
      });
    },
    onError: (error: any) => {
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
        description: error.message || "Failed to complete workout.",
        variant: "destructive",
      });
    },
  });

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

  // Quick actions removed as they're not needed in the mobile-first design

  return (
    <div className="min-h-screen bg-background">
      <Header title="Dashboard" />
      
      {/* User Welcome Section */}
      <div className="bg-card px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Welcome back, {user?.firstName || 'User'}!</h2>
            <p className="text-sm text-gray-500">Ready for today's training?</p>
          </div>
          <div className="flex items-center space-x-2">
            {user?.profileImageUrl && (
              <img 
                src={user.profileImageUrl} 
                alt="Profile" 
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
          </div>
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
                        <span>{todaysWorkout.duration}m</span>
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
                              </svg>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* How did this workout feel? */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">How did this workout feel?</h3>
                  
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <Button 
                      onClick={() => setSelectedRating(5)}
                      className={`rounded-lg py-3 font-medium ${
                        selectedRating === 5 
                          ? "bg-yellow-400 hover:bg-yellow-500 text-black" 
                          : "border-gray-300 text-gray-700"
                      }`}
                      variant={selectedRating === 5 ? "default" : "outline"}
                    >
                      😊 Great
                    </Button>
                    <Button 
                      onClick={() => setSelectedRating(4)}
                      className={`rounded-lg py-3 ${
                        selectedRating === 4 
                          ? "bg-yellow-400 hover:bg-yellow-500 text-black" 
                          : "border-gray-300 text-gray-700"
                      }`}
                      variant={selectedRating === 4 ? "default" : "outline"}
                    >
                      😐 Good
                    </Button>
                    <Button 
                      onClick={() => setSelectedRating(3)}
                      className={`rounded-lg py-3 ${
                        selectedRating === 3 
                          ? "bg-yellow-400 hover:bg-yellow-500 text-black" 
                          : "border-gray-300 text-gray-700"
                      }`}
                      variant={selectedRating === 3 ? "default" : "outline"}
                    >
                      😕 Average
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-6">
                    <Button 
                      onClick={() => setSelectedRating(2)}
                      className={`rounded-lg py-3 ${
                        selectedRating === 2 
                          ? "bg-yellow-400 hover:bg-yellow-500 text-black" 
                          : "border-gray-300 text-gray-700"
                      }`}
                      variant={selectedRating === 2 ? "default" : "outline"}
                    >
                      😣 Difficult
                    </Button>
                    <Button 
                      onClick={() => setSelectedRating(1)}
                      className={`rounded-lg py-3 ${
                        selectedRating === 1 
                          ? "bg-yellow-400 hover:bg-yellow-500 text-black" 
                          : "border-gray-300 text-gray-700"
                      }`}
                      variant={selectedRating === 1 ? "default" : "outline"}
                    >
                      😫 Very Hard
                    </Button>
                  </div>
                </div>

                {/* Notes textarea */}
                <div className="mb-6">
                  <Textarea 
                    value={workoutNotes}
                    onChange={(e) => setWorkoutNotes(e.target.value)}
                    className="w-full p-4 border border-gray-200 rounded-lg resize-none"
                    rows={4}
                    placeholder="Add any notes, PBs, or how you felt..."
                  />
                </div>

                {/* Action buttons */}
                <div className="space-y-3">
                  <Button 
                    onClick={handleCompleteWorkout}
                    disabled={completeWorkoutMutation.isPending}
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-4 rounded-lg text-lg flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    {completeWorkoutMutation.isPending ? "Completing..." : "Mark Complete"}
                  </Button>
                  
                  <div className="flex space-x-3">
                    <Button 
                      onClick={handleSkipWorkout}
                      disabled={completeWorkoutMutation.isPending}
                      variant="outline" 
                      className="flex-1 border-gray-300 text-gray-700 py-3 rounded-lg flex items-center justify-center gap-2"
                    >
                      <SkipForward className="h-4 w-4" />
                      Skip Workout
                    </Button>
                    <Button 
                      onClick={handleShareWorkout}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg flex items-center justify-center gap-2"
                    >
                      <Share className="h-4 w-4" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No workout scheduled for today</p>
                <Button onClick={() => window.location.href = "/assessment"}>
                  Start Assessment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      
      {/* Bottom spacing to prevent content from being hidden behind bottom nav */}
      <div className="h-16"></div>
      
      <BottomNav />

      {/* Exercise Detail Lightbox */}
      <Dialog open={isExerciseDetailOpen} onOpenChange={setIsExerciseDetailOpen}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              {selectedExercise?.name || selectedExercise?.exercise || "Exercise Details"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedExercise && (
            <div className="space-y-4">
              {/* Exercise specifications */}
              <div className="grid grid-cols-2 gap-4">
                {selectedExercise.sets && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Sets</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedExercise.sets}</p>
                  </div>
                )}
                
                {selectedExercise.reps && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Reps</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedExercise.reps}</p>
                  </div>
                )}
                
                {selectedExercise.weight && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Weight</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedExercise.weight}</p>
                  </div>
                )}
                
                {selectedExercise.rpe && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">RPE</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedExercise.rpe}</p>
                  </div>
                )}
                
                {selectedExercise.duration && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedExercise.duration}</p>
                  </div>
                )}
                
                {selectedExercise.distance && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Distance</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedExercise.distance}</p>
                  </div>
                )}
                
                {selectedExercise.rest && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Rest</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedExercise.rest}</p>
                  </div>
                )}
                
                {selectedExercise.tempo && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Tempo</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedExercise.tempo}</p>
                  </div>
                )}
                
                {selectedExercise.intensity && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Intensity</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedExercise.intensity}</p>
                  </div>
                )}
                
                {selectedExercise.pace && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Pace</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedExercise.pace}</p>
                  </div>
                )}
                
                {selectedExercise.rounds && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Rounds</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedExercise.rounds}</p>
                  </div>
                )}
                
                {selectedExercise.target && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Target</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedExercise.target}</p>
                  </div>
                )}
                
                {selectedExercise.equipment && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Equipment</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedExercise.equipment}</p>
                  </div>
                )}
              </div>
              
              {/* Exercise description */}
              {selectedExercise.description && selectedExercise.description !== selectedExercise.name && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-xs text-blue-600 uppercase tracking-wide mb-2">Instructions</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedExercise.description}</p>
                </div>
              )}
              
              {/* Exercise notes */}
              {selectedExercise.notes && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-xs text-yellow-600 uppercase tracking-wide mb-2">Notes</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedExercise.notes}</p>
                </div>
              )}
              
              {/* Exercise type/category */}
              {selectedExercise.type && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-xs text-green-600 uppercase tracking-wide mb-2">Exercise Type</p>
                  <p className="text-sm text-gray-700">{selectedExercise.type}</p>
                </div>
              )}
              
              {/* Close button */}
              <Button 
                onClick={() => setIsExerciseDetailOpen(false)}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
