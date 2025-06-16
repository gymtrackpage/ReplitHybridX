import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, Share, Clock, MessageSquare } from "lucide-react";

interface WorkoutCompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workout: any;
  onComplete: (data: { rating: number; notes: string; duration: number }) => void;
}

export function WorkoutCompletionDialog({ isOpen, onClose, workout, onComplete }: WorkoutCompletionDialogProps) {
  // Early return if no workout data - BEFORE any hooks
  if (!workout || !workout.id) {
    console.log("WorkoutCompletionDialog: No workout data available");
    return null;
  }

  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState(workout?.estimatedDuration || 30);
  const [showStravaShare, setShowStravaShare] = useState(false);
  const [stravaNote, setStravaNote] = useState("");
  const [stravaDuration, setStravaDuration] = useState(duration);

  const { data: stravaStatus } = useQuery({
    queryKey: ["/api/strava/status"],
    enabled: !!workout && !!workout.id
  });

  const completeWorkoutMutation = useMutation({
    mutationFn: async (data: { rating: number; notes: string; duration: number }) => {
      if (!workout?.id) {
        throw new Error("Workout ID is missing");
      }
      const response = await apiRequest("POST", "/api/workout-completions", {
        workoutId: workout.id,
        rating: data.rating,
        notes: data.notes,
        duration: data.duration
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Workout Completed!",
        description: "Great job finishing your workout.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recent-activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/today-workout"] });
      
      if (stravaStatus?.connected) {
        setShowStravaShare(true);
      } else {
        onClose();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete workout",
        variant: "destructive",
      });
    },
  });

  const shareToStravaMutation = useMutation({
    mutationFn: async (data: { workoutId: number; notes: string; duration: number }) => {
      const response = await apiRequest("POST", "/api/strava/push-workout", data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Shared to Strava!",
        description: "Your workout has been posted to Strava with an image.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Share Failed",
        description: error.message || "Failed to share to Strava",
        variant: "destructive",
      });
    },
  });

  const handleComplete = () => {
    const completionData = { rating, notes, duration };
    completeWorkoutMutation.mutate(completionData);
    onComplete(completionData);
  };

  const handleStravaShare = () => {
    if (!workout?.id || typeof workout.id !== 'number') {
      console.error("Invalid workout ID:", workout?.id);
      toast({
        title: "Error",
        description: "Workout ID is missing or invalid. Please try completing the workout again.",
        variant: "destructive",
      });
      return;
    }
    
    console.log("Sharing to Strava with workoutId:", workout.id);
    shareToStravaMutation.mutate({
      workoutId: workout.id,
      notes: stravaNote,
      duration: stravaDuration,
    });
  };

  const handleSkipStrava = () => {
    onClose();
  };

  

  if (showStravaShare) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share className="h-5 w-5" />
              Share to Strava
            </DialogTitle>
            <DialogDescription>
              Share your completed workout to Strava with a custom note and image
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Workout Completed
              </Badge>
              <Badge className="bg-orange-100 text-orange-800">
                Strava Connected
              </Badge>
            </div>

            <div>
              <Label htmlFor="strava-note">Custom Note (Optional)</Label>
              <Textarea
                id="strava-note"
                placeholder="Add a note about your workout..."
                value={stravaNote}
                onChange={(e) => setStravaNote(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="strava-duration">Duration (minutes)</Label>
              <Input
                id="strava-duration"
                type="number"
                value={stravaDuration}
                onChange={(e) => setStravaDuration(Number(e.target.value))}
                className="mt-1"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleStravaShare}
                disabled={shareToStravaMutation.isPending}
                className="flex-1"
              >
                {shareToStravaMutation.isPending ? "Sharing..." : "Share to Strava"}
              </Button>
              <Button
                variant="outline"
                onClick={handleSkipStrava}
                className="flex-1"
              >
                Skip
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Complete Workout
          </DialogTitle>
          <DialogDescription>
            How did your workout go? Rate your performance and add any notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Rating (1-10)</Label>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <Button
                  key={num}
                  variant={rating === num ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRating(num)}
                  className="w-8 h-8 p-0"
                >
                  {num}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="notes" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="How did the workout feel? Any modifications?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="duration" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Actual Duration (minutes)
            </Label>
            <Input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-1"
            />
          </div>

          <Button
            onClick={handleComplete}
            disabled={completeWorkoutMutation.isPending}
            className="w-full"
          >
            {completeWorkoutMutation.isPending ? "Completing..." : "Complete Workout"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}