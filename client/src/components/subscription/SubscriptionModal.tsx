import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Zap, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

export function SubscriptionModal({ open, onOpenChange, feature }: SubscriptionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      // Check if Stripe is properly configured
      if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
        throw new Error("STRIPE_NOT_CONFIGURED");
      }

      console.log("Creating subscription...");
      const data = await apiRequest("POST", "/api/create-subscription");
      console.log("Subscription response:", data);
      
      // Handle different response scenarios
      if (data.status === 'active') {
        // User already has active subscription
        toast({
          title: "Already Subscribed",
          description: data.message || "You already have an active subscription.",
        });
        onOpenChange(false);
        window.location.reload(); // Refresh to update subscription status
        return;
      }
      
      if (data.paymentUrl) {
        console.log("Redirecting to payment URL:", data.paymentUrl);
        window.location.href = data.paymentUrl;
        return;
      } 
      
      if (data.clientSecret && data.subscriptionId) {
        // Validate client secret format (accept both payment intents and setup intents)
        if (!data.clientSecret.startsWith('pi_') && !data.clientSecret.startsWith('seti_')) {
          throw new Error("Invalid payment session format");
        }
        
        // Redirect to payment page with required parameters
        const paymentUrl = `/payment?client_secret=${encodeURIComponent(data.clientSecret)}&subscription_id=${encodeURIComponent(data.subscriptionId)}`;
        console.log("Redirecting to payment page:", paymentUrl);
        window.location.href = paymentUrl;
        return;
      }
      
      // If we get here, the response is invalid
      console.error("Invalid subscription response:", data);
      throw new Error("Invalid subscription response - missing payment information");
      
    } catch (error: any) {
      console.error("Subscription error:", error);
      
      let errorMessage = "Failed to create subscription. Please try again.";
      let errorTitle = "Subscription Error";
      
      // Handle specific error types
      if (error.message?.includes("STRIPE_NOT_CONFIGURED")) {
        errorMessage = "Payment processing is temporarily unavailable. Please contact support.";
        errorTitle = "Service Unavailable";
      } else if (error.message?.includes("NO_EMAIL")) {
        errorMessage = "Please add an email address to your profile before subscribing.";
        errorTitle = "Email Required";
      } else if (error.message?.includes("NO_CLIENT_SECRET")) {
        errorMessage = "Payment setup failed. Please try again or contact support.";
        errorTitle = "Payment Setup Error";
      } else if (error.message?.includes("Invalid payment session")) {
        errorMessage = "Payment session is invalid. Please try again.";
        errorTitle = "Payment Error";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFreeWorkouts = () => {
    onOpenChange(false);
    window.location.href = "/free-workouts";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-400" />
            Upgrade to Premium
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                HybridX Premium
              </CardTitle>
              <CardDescription className="text-yellow-700 dark:text-yellow-300">
                {feature ? `${feature} requires a premium subscription` : "Unlock full access to professional training"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">£5</div>
                <div className="text-sm text-muted-foreground">per month</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  All professional HYROX programs
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  Personalized workout recommendations
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  Progress tracking and analytics
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  Strava integration
                </div>
              </div>
              
              <Button 
                onClick={handleSubscribe}
                disabled={isLoading}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-black"
              >
                {isLoading ? (
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                ) : null}
                Subscribe Now
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleFreeWorkouts}
                className="w-full"
              >
                Try Free Workouts Instead
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}