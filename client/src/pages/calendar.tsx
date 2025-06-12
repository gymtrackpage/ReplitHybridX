import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Calendar, Clock, CheckCircle, Play, SkipForward } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";

export default function CalendarPage() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const { data: schedule, isLoading } = useQuery({
    queryKey: ["/api/program-schedule"],
  });

  const { data: userProgress } = useQuery({
    queryKey: ["/api/user-progress"],
  });

  const completeWorkoutMutation = useMutation({
    mutationFn: async (workoutId: number) => {
      await apiRequest("POST", "/api/complete-workout", { workoutId });
    },
    onSuccess: () => {
      toast({
        title: "Workout Completed!",
        description: "Great job on completing your workout.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/program-schedule"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete workout",
        variant: "destructive",
      });
    },
  });

  const skipWorkoutMutation = useMutation({
    mutationFn: async (workoutId: number) => {
      await apiRequest("POST", "/api/skip-workout", { workoutId });
    },
    onSuccess: () => {
      toast({
        title: "Workout Skipped",
        description: "Workout has been skipped for today.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/program-schedule"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to skip workout",
        variant: "destructive",
      });
    },
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  const getWorkoutForDate = (date: Date) => {
    if (!schedule?.workouts) return null;
    return schedule.workouts.find((workout: any) => 
      isSameDay(parseISO(workout.scheduledDate), date)
    );
  };

  const getWorkoutStatus = (workout: any) => {
    if (!userProgress?.completedWorkouts) return "pending";
    const completed = userProgress.completedWorkouts.find((cw: any) => cw.workoutId === workout.id);
    if (completed) {
      return completed.status === "completed" ? "completed" : "skipped";
    }
    return "pending";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "skipped": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "skipped": return <SkipForward className="h-4 w-4" />;
      default: return <Play className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-7 gap-4">
            {[...Array(7)].map((_, i) => (
              <Card key={i} className="h-32 animate-pulse">
                <CardContent className="p-0 h-full bg-gray-100 rounded" />
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Training Calendar</h1>
            <p className="text-muted-foreground">
              Your weekly training schedule
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
            >
              Previous Week
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              This Week
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
            >
              Next Week
            </Button>
          </div>
        </div>

        {schedule?.currentProgram && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{schedule.currentProgram.name}</CardTitle>
              <CardDescription>
                Week {schedule.currentWeek} of {schedule.currentProgram.duration} • 
                Day {schedule.currentDay} • {schedule.currentProgram.difficulty}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day, index) => {
            const workout = getWorkoutForDate(day);
            const status = workout ? getWorkoutStatus(workout) : null;
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDate);

            return (
              <Card 
                key={index}
                className={`min-h-[200px] cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? "ring-2 ring-yellow-400" : ""
                } ${isToday ? "border-yellow-400" : ""}`}
                onClick={() => setSelectedDate(day)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-medium">
                      {format(day, "EEE")}
                    </CardTitle>
                    <span className={`text-lg font-bold ${isToday ? "text-yellow-600" : ""}`}>
                      {format(day, "d")}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {workout ? (
                    <>
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm line-clamp-2">{workout.name}</h4>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {workout.estimatedDuration}min
                        </div>
                      </div>
                      
                      {status && (
                        <Badge className={`text-xs ${getStatusColor(status)}`}>
                          {getStatusIcon(status)}
                          <span className="ml-1 capitalize">{status}</span>
                        </Badge>
                      )}

                      {status === "pending" && (
                        <div className="space-y-1">
                          <Button
                            size="sm"
                            className="w-full text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              completeWorkoutMutation.mutate(workout.id);
                            }}
                            disabled={completeWorkoutMutation.isPending}
                          >
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              skipWorkoutMutation.mutate(workout.id);
                            }}
                            disabled={skipWorkoutMutation.isPending}
                          >
                            Skip
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      Rest Day
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {schedule?.workouts?.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Schedule Available</h3>
              <p className="text-muted-foreground mb-4">
                Select a training program to get your personalized schedule.
              </p>
              <Button asChild>
                <a href="/programs">Browse Programs</a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Week Summary */}
        {userProgress && (
          <Card>
            <CardHeader>
              <CardTitle>This Week's Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {userProgress.weeklyStats?.completed || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {userProgress.weeklyStats?.skipped || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Skipped</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {userProgress.weeklyStats?.pending || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}