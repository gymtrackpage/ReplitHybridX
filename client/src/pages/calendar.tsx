import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Target,
  MessageSquare,
  Dumbbell,
  CheckCircle2,
  XCircle,
  Calendar as CalendarDays
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, isSameMonth } from "date-fns";

interface Exercise {
  name: string;
  sets?: number;
  reps?: number;
  duration?: number;
  distance?: string;
  description?: string;
}

interface WorkoutStatus {
  date: string;
  status: 'upcoming' | 'completed' | 'skipped' | 'missed';
  workout: {
    id: number;
    name: string;
    description: string;
    estimatedDuration: number;
    workoutType: string;
    week: number;
    day: number;
    exercises: Exercise[];
    completedAt?: string;
    comments?: string;
    duration?: number;
    rating?: number;
    completionId?: number;
  };
}

const EXERCISE_PREVIEW_LIMIT = 3;

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutStatus | null>(null);

  const { data: workoutCalendar, isLoading, error } = useQuery({
    queryKey: ["/api/workout-calendar", format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      try {
        const monthParam = format(currentMonth, 'yyyy-MM');
        console.log(`Fetching calendar data for ${monthParam}`);
        
        const response = await fetch(`/api/workout-calendar?month=${monthParam}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Calendar API error ${response.status}:`, errorText);
          throw new Error(`Failed to fetch workout calendar: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Calendar data for ${monthParam}:`, data);
        
        // Ensure workouts is always an array
        if (!data.workouts || !Array.isArray(data.workouts)) {
          console.warn("Invalid workouts data, defaulting to empty array:", data);
          return { workouts: [], userAccess: data.userAccess };
        }
        
        return data;
      } catch (fetchError) {
        console.error("Calendar fetch error:", fetchError);
        throw fetchError;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Optimize workout lookup with Map for O(1) performance
  const workoutsByDate = useMemo(() => {
    if (!workoutCalendar?.workouts || !Array.isArray(workoutCalendar.workouts)) {
      return new Map<string, WorkoutStatus>();
    }
    
    const map = new Map<string, WorkoutStatus>();
    workoutCalendar.workouts.forEach((workout: WorkoutStatus) => {
      if (workout?.date) {
        map.set(workout.date, workout);
      }
    });
    return map;
  }, [workoutCalendar?.workouts]);

  const getWorkoutForDate = (date: Date): WorkoutStatus | null => {
    const dateString = format(date, 'yyyy-MM-dd');
    return workoutsByDate.get(dateString) || null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'skipped': return 'bg-red-500';
      case 'missed': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming': return <CalendarDays className="h-4 w-4 text-blue-600" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'skipped': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'missed': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const handleDateClick = (date: Date) => {
    const workout = getWorkoutForDate(date);
    setSelectedDate(date);
    setSelectedWorkout(workout);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = direction === 'prev' ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    setSelectedDate(null);
    setSelectedWorkout(null);
  };

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-96 bg-gray-200 rounded animate-pulse" />
        </div>
      </MobileLayout>
    );
  }

  if (error) {
    console.error("Calendar error:", error);
    return (
      <MobileLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Calendar</h1>
              <p className="text-muted-foreground">
                Track your workout schedule and progress
              </p>
            </div>
          </div>
          <Card>
            <CardContent className="text-center py-8">
              <CalendarIcon className="h-12 w-12 mx-auto text-red-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Calendar Unavailable</h3>
              <p className="text-red-500 mb-4">
                {error instanceof Error ? error.message : "Failed to load calendar data"}
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Refresh Page
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/dashboard'}
                  className="w-full"
                >
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="space-y-6">
        {/* Calendar Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Calendar</h1>
            <p className="text-muted-foreground">
              Track your workout schedule and progress
            </p>
          </div>
        </div>

        {/* Monthly Stats */}
        {workoutCalendar?.workouts && Array.isArray(workoutCalendar.workouts) && workoutCalendar.workouts.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {(workoutCalendar.workouts || []).filter((w: WorkoutStatus) => w.status === 'completed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {(workoutCalendar.workouts || []).filter((w: WorkoutStatus) => w.status === 'skipped').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Skipped</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {(workoutCalendar.workouts || []).filter((w: WorkoutStatus) => w.status === 'upcoming').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Upcoming</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Month Navigation */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <h2 className="text-xl font-semibold">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {/* Day Headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              
              {/* Calendar Days */}
              {calendarDays.map(date => {
                const workout = getWorkoutForDate(date);
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                const isTodayDate = isToday(date);
                
                const handleKeyDown = (e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleDateClick(date);
                  }
                };
                
                return (
                  <div
                    key={date.toISOString()}
                    className={`
                      relative p-2 h-12 cursor-pointer border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                      ${isSelected ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50'}
                      ${isTodayDate ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}
                    `}
                    onClick={() => handleDateClick(date)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${format(date, 'MMMM d, yyyy')}${workout ? ` - ${workout.workout.name} (${workout.status})` : ' - No workout scheduled'}`}
                    onKeyDown={handleKeyDown}
                  >
                    <span className={`text-sm ${isTodayDate ? 'font-bold text-yellow-700' : ''}`}>
                      {format(date, 'd')}
                    </span>
                    
                    {/* Workout Status Pill */}
                    {workout && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                        <div 
                          className={`
                            w-2 h-2 rounded-full ${getStatusColor(workout.status)}
                          `}
                        />
                        {/* Show completion indicator for completed workouts */}
                        {workout.status === 'completed' && workout.workout.comments && (
                          <div className="w-1 h-1 bg-blue-400 rounded-full mt-0.5" title="Has comments" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Upcoming</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>Skipped/Missed</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-blue-400" />
                <span>Has comments</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Workout Details */}
        {selectedWorkout && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(selectedWorkout.status)}
                {selectedWorkout.workout.name}
              </CardTitle>
              <CardDescription>
                {(() => {
                  try {
                    return format(new Date(selectedWorkout.date), 'EEEE, MMMM d, yyyy');
                  } catch {
                    return 'Invalid date';
                  }
                })()} • 
                Week {selectedWorkout.workout.week}, Day {selectedWorkout.workout.day}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Workout Info */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedWorkout.workout.estimatedDuration} min</span>
                </div>
                <Badge variant="outline">
                  {selectedWorkout.workout.workoutType}
                </Badge>
                <Badge 
                  className={`
                    ${selectedWorkout.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                    ${selectedWorkout.status === 'upcoming' ? 'bg-blue-100 text-blue-800' : ''}
                    ${(selectedWorkout.status === 'skipped' || selectedWorkout.status === 'missed') ? 'bg-red-100 text-red-800' : ''}
                  `}
                >
                  {selectedWorkout.status}
                </Badge>
              </div>

              {/* Workout Description */}
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedWorkout.workout.description}
                </p>
              </div>

              {/* Exercises */}
              {selectedWorkout.workout.exercises && selectedWorkout.workout.exercises.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Dumbbell className="h-4 w-4" />
                    Exercises ({selectedWorkout.workout.exercises.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedWorkout.workout.exercises.slice(0, EXERCISE_PREVIEW_LIMIT).map((exercise: Exercise, index: number) => (
                      <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                        <div className="font-medium">{exercise.name}</div>
                        {exercise.sets && exercise.reps && (
                          <div className="text-muted-foreground">
                            {exercise.sets} sets × {exercise.reps} reps
                          </div>
                        )}
                        {exercise.duration && (
                          <div className="text-muted-foreground">
                            {exercise.duration} seconds
                          </div>
                        )}
                      </div>
                    ))}
                    {selectedWorkout.workout.exercises.length > EXERCISE_PREVIEW_LIMIT && (
                      <div className="text-sm text-muted-foreground text-center">
                        +{selectedWorkout.workout.exercises.length - EXERCISE_PREVIEW_LIMIT} more exercises
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Completion Details (for completed/skipped workouts) */}
              {(selectedWorkout.status === 'completed' || selectedWorkout.status === 'skipped') && (
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Completion Details
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    {selectedWorkout.workout.completedAt && (
                      <div>
                        <span className="font-medium">Completed:</span>{' '}
                        {(() => {
                          try {
                            return format(new Date(selectedWorkout.workout.completedAt), 'PPpp');
                          } catch {
                            return 'Invalid date';
                          }
                        })()}
                      </div>
                    )}
                    
                    {selectedWorkout.workout.duration && (
                      <div>
                        <span className="font-medium">Duration:</span>{' '}
                        {selectedWorkout.workout.duration} minutes
                      </div>
                    )}
                    
                    {selectedWorkout.workout.rating && selectedWorkout.workout.rating > 0 && (
                      <div>
                        <span className="font-medium">Rating:</span>{' '}
                        <span className="text-yellow-600">
                          {'★'.repeat(selectedWorkout.workout.rating)}
                          {'☆'.repeat(5 - selectedWorkout.workout.rating)}
                        </span>
                      </div>
                    )}
                    
                    {selectedWorkout.status === 'skipped' && (
                      <div className="text-red-600 font-medium">
                        This workout was skipped
                      </div>
                    )}
                  </div>

                  {/* Comments */}
                  {selectedWorkout.workout.comments && (
                    <div>
                      <h5 className="font-medium mb-2 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Your Comments
                      </h5>
                      <p className="text-sm text-muted-foreground bg-white p-3 rounded border">
                        {selectedWorkout.workout.comments}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons for Upcoming Workouts */}
              {selectedWorkout.status === 'upcoming' && isSameMonth(new Date(selectedWorkout.date), new Date()) && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1">
                    Start Workout
                  </Button>
                  <Button variant="outline" size="sm">
                    Skip
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {selectedDate && !selectedWorkout && (
          <Card>
            <CardContent className="text-center py-8">
              <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Workout Scheduled</h3>
              <p className="text-muted-foreground">
                {(() => {
                  try {
                    return format(selectedDate, 'EEEE, MMMM d, yyyy');
                  } catch {
                    return 'Selected date';
                  }
                })()} is a rest day or no workout is scheduled.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}