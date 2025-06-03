import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { CheckCircle, Clock, SkipForward, Star, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, parseISO, isToday, isBefore, isAfter } from "date-fns";

interface WorkoutCompletion {
  id: number;
  workoutId: number;
  userId: string;
  completedAt: Date;
  rating: number | null;
  notes: string | null;
  skipped: boolean;
  workout?: {
    id: number;
    name: string;
    description: string;
    duration: number;
    week: number;
    day: number;
  };
}

interface Workout {
  id: number;
  programId: number;
  name: string;
  description: string;
  duration: number;
  week: number;
  day: number;
  scheduledDate?: string;
}

interface CalendarWorkout {
  id: number;
  name: string;
  description: string;
  duration: number;
  week: number;
  day: number;
  scheduledDate: Date;
  status: 'completed' | 'skipped' | 'pending' | 'overdue';
  completion?: WorkoutCompletion;
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedWorkout, setSelectedWorkout] = useState<CalendarWorkout | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all workouts
  const { data: workouts = [], isLoading: workoutsLoading } = useQuery({
    queryKey: ["/api/workouts"],
  });

  // Fetch all workout completions
  const { data: completions = [], isLoading: completionsLoading } = useQuery({
    queryKey: ["/api/workout-completions"],
  });

  // Fetch user progress to determine start date
  const { data: dashboardData } = useQuery({
    queryKey: ["/api/dashboard"],
  });

  // Generate calendar workouts with scheduling
  const calendarWorkouts: CalendarWorkout[] = workouts.map((workout: Workout) => {
    const startDate = dashboardData?.progress?.startDate ? parseISO(dashboardData.progress.startDate) : new Date();
    
    // Calculate scheduled date based on week and day
    const weekOffset = (workout.week - 1) * 7;
    const dayOffset = workout.day - 1;
    const scheduledDate = new Date(startDate);
    scheduledDate.setDate(startDate.getDate() + weekOffset + dayOffset);

    // Find completion for this workout
    const completion = completions.find((c: WorkoutCompletion) => c.workoutId === workout.id);
    
    let status: 'completed' | 'skipped' | 'pending' | 'overdue' = 'pending';
    
    if (completion) {
      status = completion.skipped ? 'skipped' : 'completed';
    } else if (isBefore(scheduledDate, new Date()) && !isToday(scheduledDate)) {
      status = 'overdue';
    }

    return {
      ...workout,
      scheduledDate,
      status,
      completion
    };
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getWorkoutsForDate = (date: Date): CalendarWorkout[] => {
    return calendarWorkouts.filter(workout => isSameDay(workout.scheduledDate, date));
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'bg-green-500 text-white';
      case 'skipped': return 'bg-yellow-500 text-black';
      case 'overdue': return 'bg-red-500 text-white';
      case 'pending': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      case 'skipped': return <SkipForward className="h-3 w-3" />;
      case 'overdue': return <Clock className="h-3 w-3" />;
      case 'pending': return <CalendarIcon className="h-3 w-3" />;
      default: return null;
    }
  };

  const handleWorkoutClick = (workout: CalendarWorkout) => {
    setSelectedWorkout(workout);
    setIsDetailModalOpen(true);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  if (workoutsLoading || completionsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

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
        </div>
      </div>

      <div className="w-full max-w-full overflow-hidden px-4 pb-20">
        <div className="mb-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Workout Calendar</h1>
            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-sm sm:text-xl font-semibold text-center min-w-[120px] sm:min-w-[200px]">
                {format(currentDate, 'MMM yyyy')}
              </h2>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4 mb-6 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500 rounded"></div>
            <span>Skipped</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded"></div>
            <span>Overdue</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 overflow-hidden">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-1 sm:p-2 text-center font-semibold text-gray-600 border-b text-xs sm:text-sm">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {monthDays.map(day => {
          const dayWorkouts = getWorkoutsForDate(day);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 border border-gray-200 overflow-hidden ${
                isCurrentDay ? 'bg-blue-50 border-blue-300' : 'bg-white'
              } hover:bg-gray-50 transition-colors`}
            >
              <div className={`text-xs sm:text-sm mb-1 sm:mb-2 ${isCurrentDay ? 'font-bold text-blue-600' : 'text-gray-600'}`}>
                {format(day, 'd')}
              </div>

              <div className="space-y-1 overflow-hidden">
                {dayWorkouts.slice(0, 3).map(workout => (
                  <div
                    key={workout.id}
                    onClick={() => handleWorkoutClick(workout)}
                    className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(workout.status)}`}
                  >
                    <div className="flex items-center gap-1 overflow-hidden">
                      {getStatusIcon(workout.status)}
                      <span className="truncate">{workout.name.slice(0, 15)}</span>
                    </div>
                  </div>
                ))}
                {dayWorkouts.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{dayWorkouts.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Workout Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl pr-8 truncate">{selectedWorkout?.name}</DialogTitle>
          </DialogHeader>

          {selectedWorkout && (
            <div className="space-y-4 sm:space-y-6">
              {/* Workout Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Date</label>
                  <p className="text-sm sm:text-lg">{format(selectedWorkout.scheduledDate, 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`${getStatusColor(selectedWorkout.status)} text-xs`}>
                      {getStatusIcon(selectedWorkout.status)}
                      <span className="ml-1 capitalize">{selectedWorkout.status}</span>
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600">Week {selectedWorkout.week}, Day {selectedWorkout.day}</label>
                <p className="text-sm sm:text-lg font-medium break-words">{selectedWorkout.name}</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600">Description</label>
                <p className="mt-1 text-sm sm:text-base text-gray-700 break-words">{selectedWorkout.description}</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600">Duration</label>
                <p className="text-sm sm:text-lg">{selectedWorkout.duration} minutes</p>
              </div>

              {/* Completion Details */}
              {selectedWorkout.completion && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4">Completion Details</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Completed At</label>
                      <p>{format(new Date(selectedWorkout.completion.completedAt), 'PPp')}</p>
                    </div>
                    {selectedWorkout.completion.rating && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Rating</label>
                        <div className="mt-1">{renderStars(selectedWorkout.completion.rating)}</div>
                      </div>
                    )}
                  </div>

                  {selectedWorkout.completion.notes && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Notes</label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-700">{selectedWorkout.completion.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setIsDetailModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}