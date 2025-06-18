import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Zap, Clock, Target, RefreshCw, Crown } from "lucide-react";

export default function FreeWorkouts() {
  const { toast } = useToast();
  const [generatedWorkout, setGeneratedWorkout] = useState<any>(null);
  const [workoutType, setWorkoutType] = useState("mixed");
  const [difficulty, setDifficulty] = useState("intermediate");

  const generateWorkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/generate-random-workout", {
        type: workoutType,
        difficulty: difficulty
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedWorkout(data);
      toast({
        title: "New Workout Generated!",
        description: "Your random HYROX workout is ready.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate workout",
        variant: "destructive",
      });
    },
  });

  const handleGenerateWorkout = () => {
    generateWorkoutMutation.mutate();
  };

  return (
    <MobileLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Free Workouts</h1>
            <p className="text-muted-foreground">
              Generate random HYROX workouts to keep your training fresh
            </p>
          </div>
        </div>

        {/* Premium Upsell Banner */}
        <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Crown className="h-5 w-5 text-yellow-500" />
              Want More? Upgrade to Premium
            </CardTitle>
            <CardDescription>
              Get access to professional training programs, progress tracking, and personalized recommendations for just £5/month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary" className="text-yellow-700 bg-yellow-100">
                Professional Programs
              </Badge>
              <Badge variant="secondary" className="text-yellow-700 bg-yellow-100">
                Progress Tracking
              </Badge>
              <Badge variant="secondary" className="text-yellow-700 bg-yellow-100">
                Strava Integration
              </Badge>
            </div>
            <Button 
              asChild 
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
            >
              <a href="/programs">Explore Premium Programs</a>
            </Button>
          </CardContent>
        </Card>

        {/* Workout Generator Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Random Workout Generator
            </CardTitle>
            <CardDescription>
              Generate a random HYROX-style workout tailored to your preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Workout Type</label>
                <Select value={workoutType} onValueChange={setWorkoutType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Mixed Training</SelectItem>
                    <SelectItem value="strength">Strength Focus</SelectItem>
                    <SelectItem value="cardio">Cardio Focus</SelectItem>
                    <SelectItem value="station-focus">Station Practice</SelectItem>
                    <SelectItem value="race-prep">Race Simulation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty</label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleGenerateWorkout}
              disabled={generateWorkoutMutation.isPending}
              className="w-full"
              size="lg"
            >
              {generateWorkoutMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Random Workout
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Workout Display */}
        {generatedWorkout && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{generatedWorkout.name}</span>
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {generatedWorkout.estimatedDuration} min
                </Badge>
              </CardTitle>
              <CardDescription>
                {generatedWorkout.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Workout Structure</h4>
                <p className="text-sm text-gray-600">{generatedWorkout.structure}</p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Exercises</h4>
                {generatedWorkout.exercises?.map((exercise: any, index: number) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium">{exercise.name}</h5>
                      {exercise.type && (
                        <Badge variant="secondary" className="text-xs">
                          {exercise.type}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      {exercise.reps && (
                        <div>Reps: {exercise.reps}</div>
                      )}
                      {exercise.duration && (
                        <div>Duration: {exercise.duration}s</div>
                      )}
                      {exercise.distance && (
                        <div>Distance: {exercise.distance}m</div>
                      )}
                      {exercise.sets && (
                        <div>Sets: {exercise.sets}</div>
                      )}
                    </div>
                    
                    {exercise.notes && (
                      <p className="text-xs text-gray-500 mt-2">{exercise.notes}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleGenerateWorkout}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate New
                </Button>
                <Button 
                  onClick={() => {
                    navigator.share?.({
                      title: generatedWorkout.name,
                      text: generatedWorkout.description,
                    }) || navigator.clipboard?.writeText(
                      `${generatedWorkout.name}\n${generatedWorkout.description}\n\nGenerated by HybridX`
                    );
                    toast({
                      title: "Workout Shared",
                      description: "Workout copied to clipboard",
                    });
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Getting Started Card */}
        {!generatedWorkout && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Target className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Ready to Train?</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate your first random workout and start your HYROX journey today.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}