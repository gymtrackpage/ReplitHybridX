import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Users, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoIcon from "@assets/Icon Logo-1.png";

export default function SubscriptionChoice() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      setLocation('/subscribe');
    } catch (error) {
      console.error('Error navigating to subscription:', error);
      toast({
        title: "Error",
        description: "Failed to navigate to subscription page",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribeLater = async () => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/subscribe-later", {});
      toast({
        title: "Welcome to HybridX",
        description: "You can upgrade to Premium anytime from your profile",
      });
      setLocation('/dashboard');
    } catch (error) {
      console.error('Error deferring subscription:', error);
      toast({
        title: "Error",
        description: "Failed to defer subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto pt-20">
        <div className="text-center mb-12">
          <img src={logoIcon} alt="HybridX" className="h-16 w-16 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Complete Your Setup</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            You've completed your assessment and selected your training program. 
            Now choose how you'd like to continue your HYROX journey.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Premium Subscription Card */}
          <Card className="relative overflow-hidden border-2 border-primary">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">
              Recommended
            </div>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Premium Access</CardTitle>
                  <Badge variant="secondary" className="mt-1">Most Popular</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold text-primary">
                  £5<span className="text-lg font-normal text-muted-foreground">/month</span>
                </div>
                <CardDescription className="text-base">
                  Full access to your personalized HYROX training program
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {[
                  "Complete access to your selected program",
                  "Weekly workout schedules & progression",
                  "Exercise demonstrations & techniques",
                  "Progress tracking & analytics",
                  "Event countdown & phase transitions",
                  "Mobile-optimized training companion",
                  "Priority email support"
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
              <Button 
                onClick={handleSubscribe}
                disabled={isLoading}
                size="lg"
                className="w-full bg-primary hover:bg-primary/90"
              >
                {isLoading ? "Processing..." : "Start Premium - £5/month"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Cancel anytime. No long-term commitments.
              </p>
            </CardContent>
          </Card>

          {/* Free Access Card */}
          <Card className="relative">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-muted rounded-lg">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Free Access</CardTitle>
                  <Badge variant="outline" className="mt-1">Limited Features</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold">
                  £0<span className="text-lg font-normal text-muted-foreground">/month</span>
                </div>
                <CardDescription className="text-base">
                  Basic access to explore the HybridX platform
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {[
                  "View program overview & structure",
                  "Access to exercise library",
                  "Basic progress tracking",
                  "Community features",
                  "Upgrade to Premium anytime"
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-5 h-5 bg-muted rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
              <Button 
                onClick={handleSubscribeLater}
                disabled={isLoading}
                variant="outline"
                size="lg"
                className="w-full"
              >
                {isLoading ? "Processing..." : "Continue with Free Access"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                You can upgrade to Premium at any time from your profile.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
            <Star className="h-4 w-4" />
            <span>Join thousands of athletes training for HYROX success</span>
            <Star className="h-4 w-4" />
          </div>
          <p className="text-xs text-muted-foreground">
            Secure payment processing by Stripe • 30-day money-back guarantee
          </p>
        </div>
      </div>
    </div>
  );
}