import { useEffect } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { CheckCircle, Crown, ArrowRight } from "lucide-react";

export default function SubscriptionSuccess() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Invalidate queries to refresh subscription status
    queryClient.invalidateQueries({ queryKey: ['/api/subscription-status'] });
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    
    toast({
      title: "Welcome to HybridX Premium!",
      description: "Your subscription is now active. Enjoy access to all professional training programs.",
    });
  }, [toast]);

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card className="border-yellow-200 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-fit">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Crown className="h-6 w-6 text-yellow-500" />
                Welcome to Premium!
              </CardTitle>
              <CardDescription className="text-base">
                Your subscription is now active and you have access to all premium features.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="bg-white rounded-lg p-4 border border-yellow-100">
                <h3 className="font-semibold mb-3 text-gray-900">What you now have access to:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>All professional HYROX training programs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Beginner to Advanced program levels</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Progress tracking and analytics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Strava integration for workout sharing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Personalized program recommendations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Calendar and workout scheduling</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={() => setLocation('/programs')}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                  size="lg"
                >
                  Explore Training Programs
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                
                <Button 
                  onClick={() => setLocation('/dashboard')}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Go to Dashboard
                </Button>
              </div>

              <div className="text-center text-sm text-gray-500">
                <p>
                  Your subscription will automatically renew for £5/month. 
                  You can manage or cancel your subscription anytime in your account settings.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MobileLayout>
  );
}