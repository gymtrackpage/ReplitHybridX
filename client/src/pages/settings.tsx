import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
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
  ExternalLink,
  Plus,
  AlertCircle
} from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [isConnectingStrava, setIsConnectingStrava] = useState(false);
  const [isUpdatingPaymentMethod, setIsUpdatingPaymentMethod] = useState(false);
  const { subscriptionStatus: subscription, cancelSubscription, updatePaymentMethod, retryPayment } = useSubscription();

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const { data: paymentMethodsData } = useQuery({
    queryKey: ["/api/payment-methods"],
    enabled: !!subscription?.isSubscribed,
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

  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      await apiRequest("DELETE", `/api/payment-methods/${paymentMethodId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({
        title: "Payment Method Removed",
        description: "Payment method has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove payment method",
        variant: "destructive",
      });
    },
  });

  const handleUpdatePaymentMethod = async () => {
    try {
      setIsUpdatingPaymentMethod(true);
      const response = await updatePaymentMethod();
      
      // In a real implementation, you'd redirect to Stripe's hosted page or open a modal
      // For now, just show a message
      toast({
        title: "Payment Method Update",
        description: "Redirecting to secure payment form...",
      });
      
      // You would redirect to Stripe's hosted page here:
      // window.location.href = response.url;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update payment method",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPaymentMethod(false);
    }
  };

  const handleRetryPayment = async () => {
    try {
      await retryPayment();
      toast({
        title: "Payment Retry",
        description: "Payment retry initiated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Retry Failed",
        description: error.message || "Failed to retry payment",
        variant: "destructive",
      });
    }
  };

  const handleStravaConnect = () => {
    setIsConnectingStrava(true);
    connectStravaMutation.mutate();
  };

  return (
    <MobileLayout>
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
                    {subscription?.isSubscribed ? "Premium Monthly" : "Free Plan"}
                  </div>
                </div>
                <Badge 
                  className={
                    subscription?.subscriptionStatus === 'past_due'
                      ? "bg-red-100 text-red-800"
                      : subscription?.isSubscribed 
                      ? "bg-green-100 text-green-800" 
                      : "bg-gray-100 text-gray-800"
                  }
                >
                  {subscription?.subscriptionStatus === 'past_due' 
                    ? "payment failed" 
                    : subscription?.isSubscribed 
                    ? "active" 
                    : "free"}
                </Badge>
              </div>

              {subscription?.subscriptionStatus === 'past_due' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-800 rounded border border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <div className="text-sm">
                    Your payment failed. Please update your payment method or retry payment.
                  </div>
                </div>
              )}

              {subscription?.currentPeriodEnd && subscription?.isSubscribed && (
                <div className="text-sm">
                  <span className="text-muted-foreground">
                    {subscription?.cancelAtPeriodEnd ? "Cancels on: " : "Next billing: "}
                  </span>
                  <span className="font-medium">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </span>
                </div>
              )}

              {subscription?.cancelAtPeriodEnd && (
                <div className="text-sm p-2 bg-yellow-50 text-yellow-800 rounded">
                  Your subscription will be cancelled at the end of this billing period.
                </div>
              )}

              <div className="space-y-2">
                {!subscription?.isSubscribed ? (
                  <Button className="w-full">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Upgrade to Premium
                  </Button>
                ) : (
                  <>
                    {subscription?.subscriptionStatus === 'past_due' && (
                      <Button 
                        className="w-full bg-red-600 hover:bg-red-700"
                        onClick={handleRetryPayment}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry Payment
                      </Button>
                    )}
                    
                    {subscription?.cancelAtPeriodEnd ? (
                      <Button 
                        className="w-full"
                        onClick={() => {
                          toast({
                            title: "Resume Subscription",
                            description: "Contact support to resume your subscription.",
                          });
                        }}
                      >
                        Resume Subscription
                      </Button>
                    ) : (
                      <>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={async () => {
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
                          }}
                        >
                          Cancel at Period End
                        </Button>
                        <Button 
                          variant="destructive" 
                          className="w-full"
                          onClick={async () => {
                            try {
                              const response = await apiRequest("POST", "/api/downgrade-to-free");
                              queryClient.invalidateQueries({ queryKey: ["/api/subscription-status"] });
                              queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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
                          }}
                        >
                          Downgrade to Free Now
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods - Only show if subscribed */}
          {subscription?.isSubscribed && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Methods
                </CardTitle>
                <CardDescription>Manage your payment methods</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentMethodsData?.paymentMethods?.map((pm: any) => (
                  <div key={pm.id} className="flex justify-between items-center p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-6 bg-gray-100 rounded flex items-center justify-center text-xs font-mono">
                        {pm.brand?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">•••• •••• •••• {pm.last4}</div>
                        <div className="text-sm text-muted-foreground">
                          Expires {pm.expMonth}/{pm.expYear}
                          {pm.isDefault && <span className="ml-2 text-green-600">(Default)</span>}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePaymentMethodMutation.mutate(pm.id)}
                      disabled={pm.isDefault}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleUpdatePaymentMethod}
                  disabled={isUpdatingPaymentMethod}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isUpdatingPaymentMethod ? "Setting up..." : "Add Payment Method"}
                </Button>
              </CardContent>
            </Card>
          )}

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
    </MobileLayout>
  );
}