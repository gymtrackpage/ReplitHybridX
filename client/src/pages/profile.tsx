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
import { useSubscription } from "@/hooks/useSubscription";
import { User, Calendar, Target, Trophy, Settings, Save, ExternalLink, Share2, Copy, Gift, CreditCard, AlertCircle, RefreshCw, CheckCircle } from "lucide-react";

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

function SubscriptionManagement() {
  const { toast } = useToast();
  const { 
    subscriptionStatus, 
    isLoading: subscriptionLoading,
    cancelSubscription,
    resumeSubscription,
    updatePaymentMethod,
    retryPayment,
    downgradeToFree,
    isCancelingSubscription,
    isResumingSubscription,
    isUpdatingPaymentMethod,
    isRetryingPayment,
    isDowngrading
  } = useSubscription();

  const { data: paymentMethods } = useQuery({
    queryKey: ["/api/payment-methods"],
    enabled: subscriptionStatus?.isSubscribed,
  });

  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription();
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription will be cancelled at the end of this billing period.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive",
      });
    }
  };

  const handleCancelImmediately = async () => {
    try {
      const response = await apiRequest("POST", "/api/cancel-subscription", { immediate: true });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled and you now have free access.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription immediately",
        variant: "destructive",
      });
    }
  };

  const handleResumeSubscription = async () => {
    try {
      await resumeSubscription();
      toast({
        title: "Subscription Resumed",
        description: "Your subscription has been resumed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resume subscription",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePaymentMethod = async () => {
    try {
      const { clientSecret } = await updatePaymentMethod();
      // In a real implementation, you'd redirect to Stripe payment page
      toast({
        title: "Payment Method Update",
        description: "Please complete the payment method update process.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate payment method update",
        variant: "destructive",
      });
    }
  };

  const handleRetryPayment = async () => {
    try {
      await retryPayment();
      toast({
        title: "Payment Retry Successful",
        description: "Your payment has been processed successfully.",
      });
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "Unable to process payment. Please update your payment method.",
        variant: "destructive",
      });
    }
  };

  const handleDowngradeToFree = async () => {
    try {
      await downgradeToFree();
      toast({
        title: "Downgraded to Free",
        description: "You now have free access to basic features.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to downgrade subscription",
        variant: "destructive",
      });
    }
  };

  if (subscriptionLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isSubscribed = subscriptionStatus?.isSubscribed;
  const status = subscriptionStatus?.subscriptionStatus;
  const cancelAtPeriodEnd = subscriptionStatus?.cancelAtPeriodEnd;
  const currentPeriodEnd = subscriptionStatus?.currentPeriodEnd;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Subscription Management
        </CardTitle>
        <CardDescription>
          Manage your subscription and billing settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subscription Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium">Current Plan</div>
            <div className="text-sm text-muted-foreground">
              {isSubscribed ? "HybridX Premium - £5/month" : "Free Plan"}
            </div>
          </div>
          <Badge className={
            status === "active" ? "bg-green-100 text-green-800" :
            status === "past_due" ? "bg-red-100 text-red-800" :
            status === "canceled" ? "bg-gray-100 text-gray-800" :
            "bg-blue-100 text-blue-800"
          }>
            {status === "active" ? "Active" :
             status === "past_due" ? "Payment Due" :
             status === "canceled" ? "Cancelled" :
             "Free"}
          </Badge>
        </div>

        {/* Subscription Details */}
        {isSubscribed && (
          <div className="space-y-2 text-sm">
            {currentPeriodEnd && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {cancelAtPeriodEnd ? "Expires on:" : "Next billing:"}
                </span>
                <span>{new Date(currentPeriodEnd).toLocaleDateString()}</span>
              </div>
            )}
            
            {cancelAtPeriodEnd && (
              <div className="flex items-center gap-2 text-orange-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Your subscription will end on {new Date(currentPeriodEnd!).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {!isSubscribed ? (
            <Button 
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
              onClick={() => window.location.href = "/api/create-subscription"}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Upgrade to Premium - £5/month
            </Button>
          ) : (
            <>
              {/* Payment Issues */}
              {status === "past_due" && (
                <div className="space-y-2">
                  <Button 
                    className="w-full bg-red-600 hover:bg-red-700"
                    onClick={handleRetryPayment}
                    disabled={isRetryingPayment}
                  >
                    {isRetryingPayment ? (
                      <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Retry Payment
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleUpdatePaymentMethod}
                    disabled={isUpdatingPaymentMethod}
                  >
                    Update Payment Method
                  </Button>
                </div>
              )}

              {/* Active Subscription Actions */}
              {status === "active" && !cancelAtPeriodEnd && (
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleUpdatePaymentMethod}
                    disabled={isUpdatingPaymentMethod}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Update Payment Method
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleCancelSubscription}
                    disabled={isCancelingSubscription}
                  >
                    Cancel at Period End
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={handleDowngradeToFree}
                    disabled={isDowngrading}
                  >
                    Cancel & Downgrade to Free Now
                  </Button>
                </div>
              )}

              {/* Cancelled but Active Subscription */}
              {cancelAtPeriodEnd && (
                <div className="space-y-2">
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleResumeSubscription}
                    disabled={isResumingSubscription}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resume Subscription
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={handleCancelImmediately}
                  >
                    Cancel Immediately
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Payment Methods */}
        {isSubscribed && paymentMethods?.paymentMethods?.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Payment Methods</h4>
            <div className="space-y-2">
              {paymentMethods.paymentMethods.map((pm: any) => (
                <div key={pm.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm">
                      **** **** **** {pm.last4} ({pm.brand?.toUpperCase()})
                    </span>
                    {pm.isDefault && (
                      <Badge variant="secondary" className="text-xs">Default</Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {pm.expMonth}/{pm.expYear}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p>Need help with your subscription? Contact support or visit our help center.</p>
        </div>
      </CardContent>
    </Card>
  );
}

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

            <SubscriptionManagement />

            {/* Referral System */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Referral Program
                </CardTitle>
                <CardDescription>
                  Share with friends and earn free months
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <p className="font-medium">Earn 1 month free</p>
                    <p className="text-muted-foreground">When friends complete 2 months</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.href = "/referral"}
                    className="gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    Get Link
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Share your referral code and both you and your friend get rewarded
                </div>
              </CardContent>
            </Card>

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