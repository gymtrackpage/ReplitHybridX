import { useState } from "react";
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
    exercises: any[];
    completedAt?: string;
    comments?: string;
  };
}

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutStatus | null>(null);

  const { data: workoutCalendar, isLoading } = useQuery({
    queryKey: ["/api/workout-calendar", format(currentMonth, 'yyyy-MM')],
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getWorkoutForDate = (date: Date): WorkoutStatus | null => {
    if (!workoutCalendar?.workouts) return null;
    
    return workoutCalendar.workouts.find((workout: WorkoutStatus) => 
      isSameDay(new Date(workout.date), date)
    ) || null;
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
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
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
                
                return (
                  <div
                    key={date.toISOString()}
                    className={`
                      relative p-2 h-12 cursor-pointer border rounded-lg transition-colors
                      ${isSelected ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50'}
                      ${isTodayDate ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}
                    `}
                    onClick={() => handleDateClick(date)}
                  >
                    <span className={`text-sm ${isTodayDate ? 'font-bold text-yellow-700' : ''}`}>
                      {format(date, 'd')}
                    </span>
                    
                    {/* Workout Status Pill */}
                    {workout && (
                      <div 
                        className={`
                          absolute bottom-1 left-1/2 transform -translate-x-1/2 
                          w-2 h-2 rounded-full ${getStatusColor(workout.status)}
                        `}
                      />
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
                {format(new Date(selectedWorkout.date), 'EEEE, MMMM d, yyyy')} • 
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
                    {selectedWorkout.workout.exercises.slice(0, 3).map((exercise: any, index: number) => (
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
                    {selectedWorkout.workout.exercises.length > 3 && (
                      <div className="text-sm text-muted-foreground text-center">
                        +{selectedWorkout.workout.exercises.length - 3} more exercises
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Comments (for completed workouts) */}
              {selectedWorkout.workout.comments && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comments
                  </h4>
                  <p className="text-sm text-muted-foreground p-3 bg-gray-50 rounded">
                    {selectedWorkout.workout.comments}
                  </p>
                </div>
              )}

              {/* Completion Info */}
              {selectedWorkout.workout.completedAt && (
                <div className="text-xs text-muted-foreground">
                  Completed on {format(new Date(selectedWorkout.workout.completedAt), 'PPpp')}
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
                {format(selectedDate, 'EEEE, MMMM d, yyyy')} is a rest day or no workout is scheduled.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}