
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
    if (!date) return fallback;
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!dateObj || !isValid(dateObj)) return fallback;
    return format(dateObj, formatString);
  } catch (error) {
    console.warn('Date formatting error:', error, 'for date:', date);
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
    try {
      console.log('Calendar data generation - checking inputs:', {
        userProgress: userProgress,
        programWorkouts: programWorkouts,
        programWorkoutsLength: programWorkouts?.length,
        programWorkoutsIsArray: Array.isArray(programWorkouts),
        dashboardData: !!dashboardData,
        completions: completions?.length,
        calendarDaysCount: calendarDays.length
      });

      // More lenient check - allow empty program workouts for debugging
      if (!userProgress) {
        console.log('Calendar data: Missing user progress');
        return new Map<string, WorkoutStatus>();
      }

      if (!Array.isArray(programWorkouts)) {
        console.log('Calendar data: Program workouts is not an array:', typeof programWorkouts);
        return new Map<string, WorkoutStatus>();
      }

      // If no workouts but user has progress, create rest days
      if (programWorkouts.length === 0) {
        console.log('Calendar data: No program workouts found, creating rest days only');
        const calendarMap = new Map<string, WorkoutStatus>();
        calendarDays.forEach(date => {
          const dateString = format(date, 'yyyy-MM-dd');
          calendarMap.set(dateString, {
            date: dateString,
            status: 'rest'
          });
        });
        return calendarMap;
      }
      
      const startDate = userProgress.startDate ? new Date(userProgress.startDate) : new Date();
      const today = new Date();
      
      console.log('Calendar data generation - processing:', {
        startDate: format(startDate, 'yyyy-MM-dd'),
        programWorkoutsCount: programWorkouts.length,
        completionsCount: completions.length,
        userProgressProgramId: userProgress.programId,
        currentWeek: userProgress.currentWeek,
        currentDay: userProgress.currentDay
      });
      
      // Create a map of completions by date for faster lookup
      const completionsByDate = new Map<string, any>();
      completions.forEach((completion: any) => {
        try {
          const completionDate = format(new Date(completion.completedAt), 'yyyy-MM-dd');
          completionsByDate.set(completionDate, completion);
        } catch (error) {
          console.warn('Error processing completion:', completion, error);
        }
      });

      // Sort program workouts by week and day for consistent ordering
      const sortedWorkouts = [...programWorkouts].sort((a, b) => {
        if (a.week !== b.week) return a.week - b.week;
        return a.day - b.day;
      });

      console.log('Sorted workouts:', sortedWorkouts.map(w => ({
        id: w.id,
        name: w.name,
        week: w.week,
        day: w.day
      })));

      // Create workout lookup by week/day
      const workoutLookup = new Map<string, any>();
      sortedWorkouts.forEach(workout => {
        const key = `${workout.week}-${workout.day}`;
        workoutLookup.set(key, workout);
        console.log(`Added workout to lookup: ${key} -> ${workout.name}`);
      });

      console.log('Workout lookup keys:', Array.from(workoutLookup.keys()));

      const calendarMap = new Map<string, WorkoutStatus>();

      calendarDays.forEach(date => {
        try {
          const dateString = format(date, 'yyyy-MM-dd');
          const daysSinceStart = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          
          console.log(`Processing date ${dateString}, daysSinceStart: ${daysSinceStart}`);
          
          // Handle dates before program start
          if (daysSinceStart < 0) {
            calendarMap.set(dateString, {
              date: dateString,
              status: 'rest'
            });
            return;
          }

          // Calculate which week and day this should be (assuming 6-day training weeks)
          const weeksSinceStart = Math.floor(daysSinceStart / 7);
          const dayOfWeek = daysSinceStart % 7;
          
          // Map to training week/day (1-based)
          const scheduledWeek = weeksSinceStart + 1;
          const scheduledDay = dayOfWeek + 1;

          console.log(`Date ${dateString}: scheduledWeek=${scheduledWeek}, scheduledDay=${scheduledDay}`);

          // Sunday (day 7) is typically rest
          if (scheduledDay > 6) {
            calendarMap.set(dateString, {
              date: dateString,
              status: 'rest'
            });
            return;
          }

          // Look for workout in this week/day
          const workoutKey = `${scheduledWeek}-${scheduledDay}`;
          let scheduledWorkout = workoutLookup.get(workoutKey);

          console.log(`Looking for workout key ${workoutKey}, found: ${!!scheduledWorkout}`);

          // If no workout found for exact week/day, cycle through available workouts
          if (!scheduledWorkout && sortedWorkouts.length > 0) {
            const totalTrainingDays = weeksSinceStart * 6 + (scheduledDay - 1);
            const workoutIndex = totalTrainingDays % sortedWorkouts.length;
            scheduledWorkout = sortedWorkouts[workoutIndex];
            console.log(`Using cycled workout at index ${workoutIndex}: ${scheduledWorkout?.name}`);
          }

          // Check if there's a completion for this date
          const completion = completionsByDate.get(dateString);
          let status: WorkoutStatus['status'] = 'upcoming';

          if (completion) {
            status = completion.skipped ? 'skipped' : 'completed';
          } else if (isBefore(date, today) && !isToday(date) && scheduledWorkout) {
            status = 'missed';
          } else if (isToday(date) && scheduledWorkout) {
            status = 'upcoming';
          } else if (scheduledWorkout) {
            status = 'upcoming';
          }

          // If no workout scheduled, it's a rest day
          if (!scheduledWorkout) {
            calendarMap.set(dateString, {
              date: dateString,
              status: 'rest'
            });
            return;
          }

          // Add workout to calendar
          calendarMap.set(dateString, {
            date: dateString,
            status,
            workout: {
              id: scheduledWorkout.id,
              name: scheduledWorkout.name,
              description: scheduledWorkout.description || '',
              estimatedDuration: scheduledWorkout.estimatedDuration || scheduledWorkout.duration || 60,
              workoutType: scheduledWorkout.workoutType || 'Training',
              week: scheduledWorkout.week,
              day: scheduledWorkout.day,
              exercises: Array.isArray(scheduledWorkout.exercises) ? scheduledWorkout.exercises : [],
              completedAt: completion?.completedAt,
              duration: completion?.duration,
              comments: completion?.notes,
              rating: completion?.rating,
              completionId: completion?.id
            }
          });
        } catch (error) {
          console.error('Error processing calendar date:', date, error);
          const dateString = format(date, 'yyyy-MM-dd');
          calendarMap.set(dateString, {
            date: dateString,
            status: 'rest'
          });
        }
      });

      const mapValues = Array.from(calendarMap.values());
      console.log('Calendar map generated:', {
        totalEntries: calendarMap.size,
        workoutDays: mapValues.filter(w => w.workout).length,
        completedDays: mapValues.filter(w => w.status === 'completed').length,
        upcomingDays: mapValues.filter(w => w.status === 'upcoming').length,
        restDays: mapValues.filter(w => w.status === 'rest').length,
        missedDays: mapValues.filter(w => w.status === 'missed').length
      });

      // If no workout days were generated, log detailed debugging info
      if (mapValues.filter(w => w.workout).length === 0) {
        console.warn('No workout days generated. Debugging info:', {
          workoutLookupSize: workoutLookup.size,
          workoutLookupKeys: Array.from(workoutLookup.keys()),
          sortedWorkoutsCount: sortedWorkouts.length,
          firstFewWorkouts: sortedWorkouts.slice(0, 3).map(w => ({ week: w.week, day: w.day, name: w.name })),
          daysSinceStart: calendarDays.length > 0 ? Math.floor((calendarDays[0].getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 'No days'
        });
      }

      return calendarMap;
    } catch (error) {
      console.error('Error generating calendar data:', error);
      console.error('Error details:', {
        userProgressExists: !!userProgress,
        programWorkoutsLength: programWorkouts?.length || 0,
        startDateValid: userProgress?.startDate ? 'Yes' : 'No',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return new Map<string, WorkoutStatus>();
    }
  }, [calendarDays, userProgress, completions, programWorkouts]);

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
  const [isFixingCalendar, setIsFixingCalendar] = useState(false);

  const fixCalendarData = async () => {
    setIsFixingCalendar(true);
    try {
      const response = await fetch('/api/fix-calendar-data', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Calendar fix result:', result);
        
        // Refresh the page to reload data
        window.location.reload();
      } else {
        console.error('Failed to fix calendar data');
      }
    } catch (error) {
      console.error('Error fixing calendar data:', error);
    } finally {
      setIsFixingCalendar(false);
    }
  };

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

  // Enhanced debug logging
  console.log('Calendar render state:', {
    userProgress: !!userProgress,
    userProgressDetails: userProgress ? {
      programId: userProgress.programId,
      startDate: userProgress.startDate,
      currentWeek: userProgress.currentWeek,
      currentDay: userProgress.currentDay
    } : null,
    dashboardData: !!dashboardData,
    completions: completions?.length || 0,
    programWorkouts: programWorkouts?.length || 0,
    programWorkoutsIsArray: Array.isArray(programWorkouts),
    programWorkoutsSample: Array.isArray(programWorkouts) && programWorkouts.length > 0 
      ? programWorkouts.slice(0, 3).map(w => ({ id: w.id, name: w.name, week: w.week, day: w.day }))
      : 'No workouts',
    calendarDataSize: calendarData?.size || 0,
    currentMonth: currentMonth.toISOString()
  });

  // Log early return conditions
  if (!userProgress) {
    console.warn('Calendar: Missing userProgress');
  }
  if (!Array.isArray(programWorkouts)) {
    console.warn('Calendar: programWorkouts is not an array:', typeof programWorkouts);
  }
  if (Array.isArray(programWorkouts) && programWorkouts.length === 0) {
    console.warn('Calendar: programWorkouts array is empty');
  }

  if (!userProgress || !dashboardData) {
    return (
      <MobileLayout>
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-96 bg-gray-200 rounded animate-pulse" />
          <div className="text-center text-gray-500 mt-4">
            Loading calendar data...
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="space-y-6">
        {/* Debug Panel - Remove this once issue is fixed */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-sm">Debug Info</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              <div>User Progress: {userProgress ? 'Yes' : 'No'}</div>
              <div>Program ID: {userProgress?.programId || 'None'}</div>
              <div>Start Date: {userProgress?.startDate || 'None'}</div>
              <div>Current Week/Day: {userProgress?.currentWeek || 'None'}/{userProgress?.currentDay || 'None'}</div>
              <div>Program Workouts: {programWorkouts?.length || 0}</div>
              <div>Completions: {completions?.length || 0}</div>
              <div>Calendar Data Size: {calendarData?.size || 0}</div>
              <div>Sample Workouts: {programWorkouts?.slice(0, 3).map(w => `${w.name} (W${w.week}D${w.day})`).join(', ') || 'None'}</div>
              <div className="mt-3 pt-2 border-t border-yellow-300">
                <Button 
                  size="sm" 
                  onClick={fixCalendarData}
                  disabled={isFixingCalendar}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  {isFixingCalendar ? 'Fixing...' : 'Fix Calendar Data'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
              {calendarDays.map((date, index) => {
                const workout = getWorkoutForDate(date);
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                const isTodayDate = isToday(date);
                const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                
                return (
                  <div
                    key={dateKey}
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
                    {workout && workout.status !== 'rest' && workout.workout && (
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
                           workout.workout.day || 'W'}
                        </div>
                        {workout.workout.comments && (
                          <div className="w-1 h-1 bg-blue-400 rounded-full mt-0.5" />
                        )}
                      </div>
                    )}
                    
                    {/* Rest Day Indicator */}
                    {workout && workout.status === 'rest' && (
                      <div className="mt-1">
                        <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-xs text-gray-600">R</span>
                        </div>
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

        {/* Detailed Debug Info for Missing Data */}
        {(!userProgress || !programWorkouts || programWorkouts.length === 0) && process.env.NODE_ENV === 'development' && (
          <Card className="bg-red-50 border-red-200">
            <CardHeader>
              <CardTitle className="text-sm text-red-800">Calendar Debug - Missing Data</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-red-700">
              <div>User Progress: {userProgress ? '✅ Found' : '❌ Missing'}</div>
              {userProgress && (
                <div className="ml-4 space-y-1">
                  <div>Program ID: {userProgress.programId || 'None'}</div>
                  <div>Start Date: {userProgress.startDate || 'None'}</div>
                  <div>Current: Week {userProgress.currentWeek || 0}, Day {userProgress.currentDay || 0}</div>
                </div>
              )}
              <div>Program Workouts: {Array.isArray(programWorkouts) ? `✅ Array with ${programWorkouts.length} items` : '❌ Not an array'}</div>
              <div>Dashboard Data: {dashboardData ? '✅ Found' : '❌ Missing'}</div>
              <div>Completions: {completions?.length || 0} records</div>
              {!userProgress && (
                <div className="mt-2 p-2 bg-red-100 rounded">
                  <strong>Missing User Progress:</strong> User needs to complete assessment or have progress record created.
                </div>
              )}
              {userProgress && (!programWorkouts || programWorkouts.length === 0) && (
                <div className="mt-2 p-2 bg-red-100 rounded">
                  <strong>No Program Workouts:</strong> Program {userProgress.programId} has no workouts, or user has no current program.
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}
