
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
  Calendar as CalendarDays,
  Play,
  Pause
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, isSameMonth, isValid, isBefore, isAfter } from "date-fns";

const safeFormatDate = (date: string | Date, formatString: string, fallback: string = 'Invalid date'): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!isValid(dateObj)) return fallback;
    return format(dateObj, formatString);
  } catch {
    return fallback;
  }
};

interface Exercise {
  name: string;
  sets?: number;
  reps?: number;
  duration?: number;
  distance?: string;
  description?: string;
  weight?: number;
  restTime?: number;
}

interface WorkoutStatus {
  date: string;
  status: 'upcoming' | 'completed' | 'skipped' | 'missed' | 'rest';
  workout?: {
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

  // Fetch user progress and program data
  const { data: userProgress } = useQuery({
    queryKey: ["/api/user-progress"],
    queryFn: async () => {
      const response = await fetch("/api/user-progress", {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch progress');
      return response.json();
    },
  });

  // Fetch workout completions
  const { data: completions = [] } = useQuery({
    queryKey: ["/api/workout-completions"],
    queryFn: async () => {
      const response = await fetch("/api/workout-completions", {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch completions');
      return response.json();
    },
  });

  // Fetch program workouts
  const { data: programWorkouts = [] } = useQuery({
    queryKey: ["/api/workouts"],
    queryFn: async () => {
      const response = await fetch("/api/workouts", {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch workouts');
      return response.json();
    },
  });

  const { data: dashboardData } = useQuery({
    queryKey: ["/api/dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard", {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch dashboard');
      return response.json();
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Generate calendar data with proper workout scheduling
  const calendarData = useMemo(() => {
    if (!userProgress || !dashboardData?.progress) return new Map<string, WorkoutStatus>();
    
    const progress = dashboardData.progress;
    const startDate = progress.startDate ? new Date(progress.startDate) : new Date();
    const currentWeek = progress.currentWeek || 1;
    const currentDay = progress.currentDay || 1;
    const today = new Date();
    
    // Create a map of completions by workout ID and date
    const completionsByWorkoutAndDate = new Map<string, any>();
    completions.forEach((completion: any) => {
      const completionDate = format(new Date(completion.completedAt), 'yyyy-MM-dd');
      const key = `${completion.workoutId}-${completionDate}`;
      completionsByWorkoutAndDate.set(key, completion);
    });

    // Sort program workouts by week and day
    const sortedWorkouts = [...programWorkouts].sort((a, b) => {
      if (a.week !== b.week) return a.week - b.week;
      return a.day - b.day;
    });

    const calendarMap = new Map<string, WorkoutStatus>();

    calendarDays.forEach(date => {
      const dateString = format(date, 'yyyy-MM-dd');
      const daysSinceStart = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Skip dates before program start
      if (daysSinceStart < 0) {
        calendarMap.set(dateString, {
          date: dateString,
          status: 'rest'
        });
        return;
      }

      // Calculate what week and day this should be
      const weeksSinceStart = Math.floor(daysSinceStart / 7);
      const dayOfWeek = daysSinceStart % 7;
      const scheduledWeek = weeksSinceStart + 1;
      const scheduledDay = dayOfWeek + 1;

      // Skip Sundays (day 7) as rest days
      if (scheduledDay === 7 || scheduledDay > 6) {
        calendarMap.set(dateString, {
          date: dateString,
          status: 'rest'
        });
        return;
      }

      // Find the workout for this scheduled week and day
      let scheduledWorkout = sortedWorkouts.find(w => 
        w.week === scheduledWeek && w.day === scheduledDay
      );

      // If we're past the current week/day, calculate the next workout based on progress
      const isInFuture = isBefore(today, date) || isToday(date);
      
      if (isInFuture && (scheduledWeek > currentWeek || (scheduledWeek === currentWeek && scheduledDay > currentDay))) {
        // Calculate offset from current position
        const currentWorkoutIndex = sortedWorkouts.findIndex(w => 
          w.week === currentWeek && w.day === currentDay
        );
        
        if (currentWorkoutIndex >= 0) {
          const daysAhead = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const targetIndex = currentWorkoutIndex + daysAhead + (isToday(date) ? 0 : 1);
          
          // Handle program cycling
          if (targetIndex < sortedWorkouts.length) {
            scheduledWorkout = sortedWorkouts[targetIndex];
          } else {
            // Cycle back to beginning if we've reached the end
            const cycleIndex = targetIndex % sortedWorkouts.length;
            scheduledWorkout = sortedWorkouts[cycleIndex];
          }
        }
      }

      if (!scheduledWorkout) {
        calendarMap.set(dateString, {
          date: dateString,
          status: 'rest'
        });
        return;
      }

      // Check if this workout was completed
      const completionKey = `${scheduledWorkout.id}-${dateString}`;
      const completion = completionsByWorkoutAndDate.get(completionKey);
      
      // Also check for any completion on this date (in case workout changed)
      const dateCompletions = completions.filter((c: any) => 
        format(new Date(c.completedAt), 'yyyy-MM-dd') === dateString
      );

      let status: WorkoutStatus['status'] = 'upcoming';
      let workoutCompletion = completion;

      if (dateCompletions.length > 0) {
        // Use the most recent completion for this date
        workoutCompletion = dateCompletions[dateCompletions.length - 1];
        status = workoutCompletion.skipped ? 'skipped' : 'completed';
      } else if (isBefore(date, today) && !isToday(date)) {
        // Past date with no completion = missed
        status = 'missed';
      } else if (isToday(date)) {
        status = 'upcoming';
      } else {
        status = 'upcoming';
      }

      calendarMap.set(dateString, {
        date: dateString,
        status,
        workout: {
          id: scheduledWorkout.id,
          name: scheduledWorkout.name,
          description: scheduledWorkout.description || '',
          estimatedDuration: scheduledWorkout.estimatedDuration || 60,
          workoutType: scheduledWorkout.workoutType || 'Training',
          week: scheduledWorkout.week,
          day: scheduledWorkout.day,
          exercises: Array.isArray(scheduledWorkout.exercises) ? scheduledWorkout.exercises : [],
          completedAt: workoutCompletion?.completedAt,
          duration: workoutCompletion?.duration,
          comments: workoutCompletion?.notes,
          rating: workoutCompletion?.rating,
          completionId: workoutCompletion?.id
        }
      });
    });

    return calendarMap;
  }, [calendarDays, userProgress, dashboardData, completions, programWorkouts]);

  const getWorkoutForDate = (date: Date): WorkoutStatus | null => {
    const dateString = format(date, 'yyyy-MM-dd');
    return calendarData.get(dateString) || null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'skipped': return 'bg-yellow-500';
      case 'missed': return 'bg-red-500';
      case 'rest': return 'bg-gray-300';
      default: return 'bg-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming': return <Play className="h-3 w-3 text-blue-600" />;
      case 'completed': return <CheckCircle2 className="h-3 w-3 text-green-600" />;
      case 'skipped': return <Pause className="h-3 w-3 text-yellow-600" />;
      case 'missed': return <XCircle className="h-3 w-3 text-red-600" />;
      case 'rest': return <Pause className="h-3 w-3 text-gray-600" />;
      default: return null;
    }
  };

  const handleDateClick = (date: Date) => {
    const workout = getWorkoutForDate(date);
    setSelectedDate(date);
    setSelectedWorkout(workout);
  };

  const [isNavigating, setIsNavigating] = useState(false);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setIsNavigating(true);
    const newMonth = direction === 'prev' ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    setSelectedDate(null);
    setSelectedWorkout(null);
    setTimeout(() => setIsNavigating(false), 100);
  };

  // Calculate monthly stats
  const monthlyStats = useMemo(() => {
    const monthWorkouts = Array.from(calendarData.values()).filter(w => w.workout);
    return {
      completed: monthWorkouts.filter(w => w.status === 'completed').length,
      skipped: monthWorkouts.filter(w => w.status === 'skipped').length,
      missed: monthWorkouts.filter(w => w.status === 'missed').length,
      upcoming: monthWorkouts.filter(w => w.status === 'upcoming').length,
    };
  }, [calendarData]);

  if (!userProgress || !dashboardData) {
    return (
      <MobileLayout>
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-96 bg-gray-200 rounded animate-pulse" />
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
            <h1 className="text-3xl font-bold">Training Calendar</h1>
            <p className="text-muted-foreground">
              Track your workout progress
            </p>
          </div>
        </div>

        {/* Monthly Stats */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {monthlyStats.completed}
                </div>
                <div className="text-sm text-muted-foreground">Done</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {monthlyStats.skipped}
                </div>
                <div className="text-sm text-muted-foreground">Skipped</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {monthlyStats.missed}
                </div>
                <div className="text-sm text-muted-foreground">Missed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {monthlyStats.upcoming}
                </div>
                <div className="text-sm text-muted-foreground">Coming</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Month Navigation */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
                disabled={isNavigating}
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
                disabled={isNavigating}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {/* Day Headers */}
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              
              {/* Calendar Days */}
              {calendarDays.map(date => {
                const workout = getWorkoutForDate(date);
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                const isTodayDate = isToday(date);
                
                return (
                  <div
                    key={date.toISOString()}
                    className={`
                      relative aspect-square cursor-pointer border rounded-lg transition-all p-2 flex flex-col items-center justify-center
                      ${isSelected ? 'bg-blue-100 border-blue-300 scale-105' : 'hover:bg-gray-50'}
                      ${isTodayDate ? 'ring-2 ring-yellow-400 bg-yellow-50' : 'border-gray-200'}
                    `}
                    onClick={() => handleDateClick(date)}
                  >
                    <span className={`text-sm ${isTodayDate ? 'font-bold text-yellow-700' : ''}`}>
                      {format(date, 'd')}
                    </span>
                    
                    {/* Workout Status Indicator */}
                    {workout && workout.status !== 'rest' && (
                      <div className="mt-1 flex flex-col items-center">
                        <div 
                          className={`
                            w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold
                            ${getStatusColor(workout.status)}
                          `}
                        >
                          {workout.status === 'completed' ? '✓' :
                           workout.status === 'skipped' ? '⏸' :
                           workout.status === 'missed' ? '✗' :
                           workout.workout ? workout.workout.day : ''}
                        </div>
                        {workout.workout?.comments && (
                          <div className="w-1 h-1 bg-blue-400 rounded-full mt-0.5" />
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
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>Skipped</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Missed</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Scheduled</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <span>Rest Day</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Workout Details */}
        {selectedWorkout && selectedWorkout.workout && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(selectedWorkout.status)}
                {selectedWorkout.workout.name}
              </CardTitle>
              <CardDescription>
                {safeFormatDate(selectedWorkout.date, 'EEEE, MMMM d, yyyy')} • 
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
                    ${selectedWorkout.status === 'skipped' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${selectedWorkout.status === 'missed' ? 'bg-red-100 text-red-800' : ''}
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

              {/* Completion Details */}
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
                        {safeFormatDate(selectedWorkout.workout.completedAt, 'PPpp')}
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
                        Your Notes
                      </h5>
                      <p className="text-sm text-muted-foreground bg-white p-3 rounded border">
                        {selectedWorkout.workout.comments}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons for Today's Workout */}
              {selectedWorkout.status === 'upcoming' && isToday(new Date(selectedWorkout.date)) && (
                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => window.location.href = '/workouts'}
                  >
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

        {/* Rest Day Message */}
        {selectedWorkout && selectedWorkout.status === 'rest' && (
          <Card>
            <CardContent className="text-center py-8">
              <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Rest Day</h3>
              <p className="text-muted-foreground">
                {selectedDate ? safeFormatDate(selectedDate, 'EEEE, MMMM d, yyyy', 'Selected date') : 'Selected date'} is a scheduled rest day. Take time to recover!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {selectedDate && !selectedWorkout && (
          <Card>
            <CardContent className="text-center py-8">
              <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Program Active</h3>
              <p className="text-muted-foreground mb-4">
                Start a training program to see your workout schedule.
              </p>
              <Button onClick={() => window.location.href = '/programs'}>
                Browse Programs
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}
