import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell, Calendar, User } from "lucide-react";

export default function Dashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

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
        <Navigation user={user} />
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
      </div>
    );
  }

  const { progress, todaysWorkout, weeklyCompletions } = dashboardData;

  // Quick actions removed as they're not needed in the mobile-first design

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation user={user} />
      
      {/* Navigation Tabs */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <div className="flex space-x-1">
          <Button variant="ghost" className="flex items-center space-x-2 bg-gray-100 text-gray-900 rounded-lg px-4 py-2">
            <Dumbbell className="h-4 w-4" />
            <span className="font-medium">Today's Workout</span>
          </Button>
          <Button variant="ghost" className="flex items-center space-x-2 text-gray-600 px-4 py-2">
            <Calendar className="h-4 w-4" />
            <span>Calendar</span>
          </Button>
          <Button variant="ghost" className="flex items-center space-x-2 text-gray-600 px-4 py-2">
            <User className="h-4 w-4" />
            <span>My Profile</span>
          </Button>
        </div>
      </div>

      <main className="px-4 py-6">
        {/* Today's Workout Card */}
        <Card className="bg-white rounded-2xl shadow-sm border-0 mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-yellow-600 mb-4">Today's Workout</CardTitle>
          </CardHeader>
          <CardContent>
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
                    <Button className="bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg py-3 font-medium">
                      😊 Great
                    </Button>
                    <Button variant="outline" className="border-gray-300 text-gray-700 rounded-lg py-3">
                      😐 Good
                    </Button>
                    <Button variant="outline" className="border-gray-300 text-gray-700 rounded-lg py-3">
                      😕 Average
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-6">
                    <Button variant="outline" className="border-gray-300 text-gray-700 rounded-lg py-3">
                      😣 Difficult
                    </Button>
                    <Button variant="outline" className="border-gray-300 text-gray-700 rounded-lg py-3">
                      😫 Very Hard
                    </Button>
                  </div>
                </div>

                {/* Notes textarea */}
                <div className="mb-6">
                  <textarea 
                    className="w-full p-4 border border-gray-200 rounded-lg text-gray-500 placeholder-gray-400 resize-none"
                    rows={4}
                    placeholder="Add any notes, PBs, or how you felt..."
                  />
                </div>

                {/* Action buttons */}
                <div className="space-y-3">
                  <Button className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-4 rounded-lg text-lg">
                    ✓ Mark Complete
                  </Button>
                  
                  <div className="flex space-x-3">
                    <Button variant="outline" className="flex-1 border-gray-300 text-gray-700 py-3 rounded-lg">
                      ⏭️ Skip Workout
                    </Button>
                    <Button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg">
                      📤 Share
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
    </div>
  );
}
