import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Activity, Loader2 } from "lucide-react";

interface PushToStravaButtonProps {
  workoutId: number;
  workoutName: string;
  isCompleted: boolean;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
}

export default function PushToStravaButton({ 
  workoutId, 
  workoutName, 
  isCompleted, 
  size = "sm",
  variant = "outline"
}: PushToStravaButtonProps) {
  const { toast } = useToast();

  // Check Strava connection status
  const { data: stravaStatus } = useQuery({
    queryKey: ["/api/strava/status"],
    retry: false,
  });

  // Push workout to Strava
  const pushMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/strava/push-workout", {
        workoutId
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Workout Pushed to Strava",
        description: `"${workoutName}" has been added to your Strava activity feed`,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to push workout to Strava";
      toast({
        title: "Push Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Don't show button if not connected to Strava or workout not completed
  if (!((stravaStatus as any)?.connected || false) || !isCompleted) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => pushMutation.mutate()}
      disabled={pushMutation.isPending}
      className="flex items-center gap-1 text-orange-600 border-orange-200 hover:bg-orange-50"
    >
      {pushMutation.isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Activity className="h-3 w-3" />
      )}
      {pushMutation.isPending ? "Pushing..." : "Push to Strava"}
    </Button>
  );
}