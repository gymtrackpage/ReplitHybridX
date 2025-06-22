import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { SubscriptionModal } from "@/components/subscription/SubscriptionModal";
import { User, Calendar, Target, Trophy, Settings, Save, ExternalLink } from "lucide-react";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  age: z.coerce.number().min(16).max(80).optional(),
  fitnessLevel: z.string().optional(),
  hyroxEventDate: z.string().optional(),
  hyroxEventLocation: z.string().optional(),
  targetTime: z.string().optional(),
});

type ProfileData = z.infer<typeof profileSchema>;

export default function Profile() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const { data: userStats } = useQuery({
    queryKey: ["/api/user-stats"],
  });

  const { data: stravaStatus } = useQuery({
    queryKey: ["/api/strava/status"],
  });

  const form = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      age: user?.age || undefined,
      fitnessLevel: user?.fitnessLevel || "",
      hyroxEventDate: user?.hyroxEventDate ? user.hyroxEventDate.split('T')[0] : "",
      hyroxEventLocation: user?.hyroxEventLocation || "",
      targetTime: user?.targetTime || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      await apiRequest("PUT", "/api/profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileData) => {
    updateProfileMutation.mutate(data);
  };

  const connectStravaMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/strava/connect");
      return response;
    },
    onSuccess: (data: any) => {
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to connect to Strava. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveStravaTokensMutation = useMutation({
    mutationFn: async (tokens: any) => {
      return await apiRequest("POST", "/api/strava/save-tokens", { tokens });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strava/status"] });
      toast({
        title: "Success",
        description: "Strava account connected successfully!",
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save Strava connection. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle Strava OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stravaTokens = urlParams.get('strava_tokens');
    const stravaError = urlParams.get('strava_error');

    if (stravaError) {
      let errorMessage = "Failed to connect to Strava";
      switch (stravaError) {
        case 'access_denied':
          errorMessage = "Strava access was denied";
          break;
        case 'no_code':
          errorMessage = "No authorization code received from Strava";
          break;
        case 'callback_failed':
          errorMessage = "Strava callback failed";
          break;
      }
      toast({
        title: "Strava Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (stravaTokens) {
      try {
        const tokens = JSON.parse(decodeURIComponent(stravaTokens));
        saveStravaTokensMutation.mutate(tokens);
      } catch (error) {
        console.error('Error parsing Strava tokens:', error);
        toast({
          title: "Error",
          description: "Invalid Strava token data received",
          variant: "destructive",
        });
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [saveStravaTokensMutation, toast]);

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid gap-6 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="h-48 animate-pulse">
                <CardContent className="p-0 h-full bg-gray-100 rounded" />
              </Card>
            ))}
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="text-muted-foreground">
              Manage your personal information and goals
            </p>
          </div>
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? "outline" : "default"}
          >
            <Settings className="h-4 w-4 mr-2" />
            {isEditing ? "Cancel" : "Edit Profile"}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Your basic profile details and fitness information
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="age"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Age</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="fitnessLevel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fitness Level</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select level" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="beginner">Beginner</SelectItem>
                                  <SelectItem value="intermediate">Intermediate</SelectItem>
                                  <SelectItem value="advanced">Advanced</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="hyroxEventDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hyrox Event Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="hyroxEventLocation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Event Location</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., London, UK" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="targetTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Time</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 1:30:00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        disabled={updateProfileMutation.isPending}
                        className="w-full"
                      >
                        {updateProfileMutation.isPending ? (
                          <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                    </form>
                  </Form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <p className="font-medium">
                          {user?.firstName} {user?.lastName}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="font-medium">{user?.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Age</label>
                        <p className="font-medium">{user?.age || "Not specified"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Fitness Level</label>
                        <div className="font-medium">
                          {user?.fitnessLevel ? (
                            <Badge className="capitalize">{user.fitnessLevel}</Badge>
                          ) : (
                            "Not specified"
                          )}
                        </div>
                      </div>
                    </div>

                    {user?.hyroxEventDate && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Upcoming Event</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">
                            {new Date(user.hyroxEventDate).toLocaleDateString()}
                          </span>
                          {user.hyroxEventLocation && (
                            <span className="text-muted-foreground">
                              in {user.hyroxEventLocation}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {user?.targetTime && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Target Time</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Target className="h-4 w-4" />
                          <span className="font-medium">{user.targetTime}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Your Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{userStats?.totalWorkouts || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Workouts</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold">{userStats?.currentStreak || 0}</div>
                  <div className="text-sm text-muted-foreground">Day Streak</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold">{userStats?.weeklyAverage || 0}</div>
                  <div className="text-sm text-muted-foreground">Weekly Average</div>
                </div>

                {userStats?.memberSince && (
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Member since</div>
                    <div className="font-medium">
                      {new Date(userStats.memberSince).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {user?.subscriptionStatus && (
              <Card>
                <CardHeader>
                  <CardTitle>Subscription</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                      <Badge className={user?.subscriptionStatus === "active" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-gray-100 text-gray-800"
                      }>
                        {user?.subscriptionStatus || "free"}
                      </Badge>
                      {user?.subscriptionStatus !== "active" && (
                        <Button 
                          onClick={() => setShowSubscriptionModal(true)}
                          size="sm"
                          className="bg-yellow-500 hover:bg-yellow-600 text-black"
                        >
                          Upgrade
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {user?.subscriptionStatus === "active" 
                        ? "You have full access to all features"
                        : "Upgrade to access premium features"
                      }
                    </p>
                </CardContent>
              </Card>
            )}

            {/* Strava Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Strava Integration
                </CardTitle>
                <CardDescription>
                  Connect your Strava account to share workouts automatically
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stravaStatus?.connected ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">Connected</Badge>
                      <span className="text-sm text-muted-foreground">
                        Athlete ID: {stravaStatus.athleteId}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You can now share completed workouts to Strava with custom notes and images.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Connect your Strava account to automatically share completed workouts with workout images and detailed exercise information.
                    </p>
                    <Button 
                      onClick={() => connectStravaMutation.mutate()}
                      disabled={connectStravaMutation.isPending}
                      className="w-full"
                    >
                      {connectStravaMutation.isPending ? "Connecting..." : "Connect to Strava"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <SubscriptionModal 
        open={showSubscriptionModal} 
        onOpenChange={setShowSubscriptionModal}
        feature="Profile Upgrade"
      />
    </MobileLayout>
  );
}