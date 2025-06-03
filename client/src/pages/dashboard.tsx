import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dumbbell, Calendar, User, ClipboardList, Share, SkipForward, CheckCircle } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

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
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="px-4 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                  <Dumbbell className="h-4 w-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <div className="text-lg font-semibold text-gray-900">Hybrid X</div>
                  <div className="text-sm text-gray-600">Welcome</div>
                </div>
              </div>
              
              <Button variant="ghost" size="sm" onClick={() => window.location.href = "/api/logout"}>
                <User className="h-5 w-5 text-gray-600" />
              </Button>
            </div>
          </div>
        </div>
        
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
    <div className="min-h-screen bg-gray-100">
      {/* Header with Logo */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-lg p-2">
              <Dumbbell className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Hybrid X</h1>
              <p className="text-xs text-gray-500">Training Platform</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {user?.profileImageUrl && (
              <img 
                src={user.profileImageUrl} 
                alt="Profile" 
                className="w-8 h-8 rounded-full object-cover"
              />
            )}
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.firstName || 'User'}</p>
              <p className="text-xs text-gray-500">Athlete</p>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 py-6 pb-20 max-w-full overflow-hidden">
        {/* Today's Workout Card */}
        <Card className="bg-white rounded-2xl shadow-sm border-0 mb-6 w-full max-w-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl sm:text-2xl font-bold text-yellow-600 mb-4 break-words">Today's Workout</CardTitle>
          </CardHeader>
          <CardContent className="max-w-full overflow-hidden">
            {todaysWorkout ? (
              <div>
                <div className="bg-gray-100 rounded-lg p-4 mb-6">
                  <p className="text-gray-700 font-medium mb-2">{todaysWorkout.name}</p>
                  <p className="text-gray-500 text-sm">
                    Workout program sheet
                  </p>
                  <p className="text-gray-500 text-sm">
                    'MaintenanceProgram' not found. Contact support.
                  </p>
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
    </div>
  );
}
