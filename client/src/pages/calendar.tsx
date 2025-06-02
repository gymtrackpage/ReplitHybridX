import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell, Calendar as CalendarIcon, User, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";

export default function Calendar() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());

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

  const { data: workouts, isLoading } = useQuery({
    queryKey: ["/api/workouts", format(currentDate, 'yyyy-MM')],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: completions } = useQuery({
    queryKey: ["/api/workout-completions", format(currentDate, 'yyyy-MM')],
    enabled: isAuthenticated,
    retry: false,
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getWorkoutForDay = (date: Date) => {
    if (!workouts) return null;
    return workouts.find((workout: any) => 
      isSameDay(new Date(workout.scheduledDate || workout.createdAt), date)
    );
  };

  const isWorkoutCompleted = (date: Date) => {
    if (!completions) return false;
    return completions.some((completion: any) => 
      isSameDay(new Date(completion.completedAt), date)
    );
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation user={user} />
      
      {/* Navigation Tabs */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <div className="flex space-x-1">
          <Button 
            variant="ghost" 
            className="flex items-center space-x-2 text-gray-600 px-4 py-2"
            onClick={() => window.location.href = "/dashboard"}
          >
            <Dumbbell className="h-4 w-4" />
            <span>Today's Workout</span>
          </Button>
          <Button variant="ghost" className="flex items-center space-x-2 bg-gray-100 text-gray-900 rounded-lg px-4 py-2">
            <CalendarIcon className="h-4 w-4" />
            <span className="font-medium">Calendar</span>
          </Button>
          <Button 
            variant="ghost" 
            className="flex items-center space-x-2 text-gray-600 px-4 py-2"
            onClick={() => window.location.href = "/profile"}
          >
            <User className="h-4 w-4" />
            <span>My Profile</span>
          </Button>
        </div>
      </div>

      <main className="px-4 py-6">
        {/* Calendar Header */}
        <Card className="bg-white rounded-2xl shadow-sm border-0 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-gray-900">
                {format(currentDate, 'MMMM yyyy')}
              </CardTitle>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {days.map(day => {
                const workout = getWorkoutForDay(day);
                const completed = isWorkoutCompleted(day);
                const today = isToday(day);
                
                return (
                  <div
                    key={day.toString()}
                    className={`
                      aspect-square p-1 border rounded-lg cursor-pointer transition-colors
                      ${today ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:bg-gray-50'}
                      ${completed ? 'bg-green-100' : ''}
                      ${workout && !completed ? 'bg-blue-50' : ''}
                    `}
                  >
                    <div className="h-full flex flex-col">
                      <div className={`text-sm ${today ? 'font-bold text-yellow-600' : 'text-gray-700'}`}>
                        {format(day, 'd')}
                      </div>
                      {workout && (
                        <div className="flex-1 mt-1">
                          <div className={`
                            w-full h-2 rounded text-xs
                            ${completed ? 'bg-green-500' : 'bg-blue-500'}
                          `} />
                          <div className="text-xs text-gray-600 mt-1 truncate">
                            {workout.name}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="bg-white rounded-2xl shadow-sm border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                <span className="text-sm text-gray-700">Today</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm text-gray-700">Scheduled Workout</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-700">Completed Workout</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}