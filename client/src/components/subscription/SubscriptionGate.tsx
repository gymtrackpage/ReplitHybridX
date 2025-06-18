import { usePremiumAccess } from "@/hooks/useSubscription";
import { SubscriptionModal } from "./SubscriptionModal";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Crown, Zap } from "lucide-react";

interface SubscriptionGateProps {
  children: React.ReactNode;
  feature: string;
  description?: string;
  showUpgrade?: boolean;
}

export function SubscriptionGate({ 
  children, 
  feature, 
  description = "This feature requires a premium subscription",
  showUpgrade = true 
}: SubscriptionGateProps) {
  const { hasAccess, isLoading } = usePremiumAccess();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-yellow-100 rounded-full w-fit">
            <Crown className="h-8 w-8 text-yellow-600" />
          </div>
          <CardTitle className="text-xl text-gray-900">Premium Feature</CardTitle>
          <CardDescription className="text-gray-600">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-2">Unlock {feature}</h3>
            <p className="text-sm text-gray-600 mb-4">
              Get access to professional training programs, progress tracking, and more.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>Professional HYROX programs</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>Progress tracking & analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>Strava integration</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>Personalized recommendations</span>
            </div>
          </div>

          {showUpgrade && (
            <div className="text-center pt-4">
              <Button 
                onClick={() => setShowSubscriptionModal(true)}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                size="lg"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Premium - £5/month
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Cancel anytime • No long-term commitment
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <SubscriptionModal 
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </div>
  );
}

// Quick access gate for smaller UI elements
export function PremiumBadge({ feature, className = "" }: { feature: string; className?: string }) {
  const { hasAccess } = usePremiumAccess();
  const [showModal, setShowModal] = useState(false);
  
  if (hasAccess) return null;
  
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowModal(true)}
        className={`text-xs border-yellow-300 text-yellow-700 hover:bg-yellow-50 ${className}`}
      >
        <Lock className="h-3 w-3 mr-1" />
        Premium
      </Button>
      <SubscriptionModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}