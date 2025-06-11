import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Unlink, Activity } from "lucide-react";
import React, { useState, useEffect } from "react";

export default function StravaIntegration() {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  // Check Strava connection status
  const { data: stravaStatus, isLoading } = useQuery({
    queryKey: ["/api/strava/status"],
    retry: false,
  });

  // Check for connection callback in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('strava_connected') === 'true') {
      toast({
        title: "Strava Connected",
        description: "Your Strava account has been successfully connected!",
      });
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      // Refresh the status
      queryClient.invalidateQueries({ queryKey: ["/api/strava/status"] });
    } else if (urlParams.get('strava_error')) {
      const error = urlParams.get('strava_error');
      toast({
        title: "Strava Connection Failed",
        description: error === 'not_authenticated' ? 
          "Please log in to connect Strava" : 
          "Failed to connect to Strava. Please try again.",
        variant: "destructive",
      });
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  // Connect to Strava
  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/strava/connect");
      return response.json();
    },
    onSuccess: (data) => {
      setIsConnecting(true);
      // Redirect to Strava authorization
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: "Failed to start Strava connection process",
        variant: "destructive",
      });
    },
  });

  // Disconnect from Strava
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/strava/disconnect");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Strava Disconnected",
        description: "Your Strava account has been disconnected",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/strava/status"] });
    },
    onError: (error) => {
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect Strava account",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-white rounded-2xl shadow-sm border-0 mb-6">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-orange-500" />
            Strava Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConnected = (stravaStatus as any)?.connected || false;

  return (
    <Card className="bg-white rounded-2xl shadow-sm border-0 mb-6">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-orange-500" />
          Strava Integration
          {isConnected && (
            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
              Connected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <p className="text-gray-600">
              Your Strava account is connected! You can now push your completed workouts directly to Strava.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">How it works:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Complete a workout in your training program</li>
                <li>• Visit your workout history or calendar</li>
                <li>• Click the "Push to Strava" button on any completed workout</li>
                <li>• Your workout will appear in your Strava activity feed</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                className="flex items-center"
              >
                <Unlink className="h-4 w-4 mr-2" />
                {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect Strava"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-600">
              Connect your Strava account to automatically sync your workouts and share your training progress with the community.
            </p>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Benefits of connecting Strava:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Automatically sync completed workouts</li>
                <li>• Share your Hyrox training progress</li>
                <li>• Build your training log on Strava</li>
                <li>• Connect with other athletes</li>
              </ul>
            </div>

            <Button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending || isConnecting}
              className="bg-orange-500 hover:bg-orange-600 text-white flex items-center"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {connectMutation.isPending || isConnecting ? "Connecting..." : "Connect to Strava"}
            </Button>

            <p className="text-xs text-gray-500">
              By connecting, you authorize Hybrid X to create activities on your Strava account.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}