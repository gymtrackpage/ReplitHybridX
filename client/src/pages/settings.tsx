import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  CreditCard, 
  Database,
  Trash2,
  Download,
  RefreshCw,
  ExternalLink
} from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [isConnectingStrava, setIsConnectingStrava] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const { data: subscription } = useQuery({
    queryKey: ["/api/subscription-status"],
  });

  const connectStravaMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/strava/connect");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Strava",
        variant: "destructive",
      });
      setIsConnectingStrava(false);
    },
  });

  const disconnectStravaMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/strava/disconnect");
    },
    onSuccess: () => {
      toast({
        title: "Strava Disconnected",
        description: "Your Strava account has been disconnected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect Strava",
        variant: "destructive",
      });
    },
  });

  const resetAssessmentMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/reset-assessment");
    },
    onSuccess: () => {
      toast({
        title: "Assessment Reset",
        description: "Your fitness assessment has been reset. You can take it again.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-onboarding-status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset assessment",
        variant: "destructive",
      });
    },
  });

  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/export-data");
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hybridx-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Data Exported",
        description: "Your data has been downloaded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export data",
        variant: "destructive",
      });
    },
  });

  const handleStravaConnect = () => {
    setIsConnectingStrava(true);
    connectStravaMutation.mutate();
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Account Settings
              </CardTitle>
              <CardDescription>Manage your account preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Email reminders and updates
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Bell className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">Privacy Settings</div>
                  <div className="text-sm text-muted-foreground">
                    Control your data visibility
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-2" />
                  Manage
                </Button>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">Reset Assessment</div>
                  <div className="text-sm text-muted-foreground">
                    Retake your fitness assessment
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => resetAssessmentMutation.mutate()}
                  disabled={resetAssessmentMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription
              </CardTitle>
              <CardDescription>Manage your subscription plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">Current Plan</div>
                  <div className="text-sm text-muted-foreground">
                    {subscription?.status === "active" ? "Premium Monthly" : "Free Trial"}
                  </div>
                </div>
                <Badge 
                  className={
                    subscription?.status === "active" 
                      ? "bg-green-100 text-green-800" 
                      : "bg-gray-100 text-gray-800"
                  }
                >
                  {subscription?.status || "inactive"}
                </Badge>
              </div>

              {subscription?.nextBillingDate && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Next billing: </span>
                  <span className="font-medium">
                    {new Date(subscription.nextBillingDate).toLocaleDateString()}
                  </span>
                </div>
              )}

              <Button className="w-full">
                <CreditCard className="h-4 w-4 mr-2" />
                {subscription?.status === "active" ? "Manage Billing" : "Upgrade to Premium"}
              </Button>
            </CardContent>
          </Card>

          {/* Integrations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Integrations
              </CardTitle>
              <CardDescription>Connect your fitness apps and devices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 font-bold text-sm">S</span>
                  </div>
                  <div>
                    <div className="font-medium">Strava</div>
                    <div className="text-sm text-muted-foreground">
                      {user?.stravaConnected ? "Connected" : "Not connected"}
                    </div>
                  </div>
                </div>
                
                {user?.stravaConnected ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => disconnectStravaMutation.mutate()}
                    disabled={disconnectStravaMutation.isPending}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button 
                    size="sm"
                    onClick={handleStravaConnect}
                    disabled={isConnectingStrava || connectStravaMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isConnectingStrava ? (
                      <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    ) : null}
                    Connect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Management
              </CardTitle>
              <CardDescription>Export or delete your data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">Export Data</div>
                  <div className="text-sm text-muted-foreground">
                    Download all your workout data
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportDataMutation.mutate()}
                  disabled={exportDataMutation.isPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-red-600">Delete Account</div>
                  <div className="text-sm text-muted-foreground">
                    Permanently delete your account
                  </div>
                </div>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* App Information */}
        <Card>
          <CardHeader>
            <CardTitle>App Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="font-bold text-lg">v2.1.0</div>
                <div className="text-sm text-muted-foreground">Version</div>
              </div>
              <div>
                <div className="font-bold text-lg">React</div>
                <div className="text-sm text-muted-foreground">Framework</div>
              </div>
              <div>
                <div className="font-bold text-lg">PostgreSQL</div>
                <div className="text-sm text-muted-foreground">Database</div>
              </div>
              <div>
                <div className="font-bold text-lg">Replit</div>
                <div className="text-sm text-muted-foreground">Platform</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}