import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Crown, Check, X, Loader2 } from "lucide-react";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function SubscriptionForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/subscription-success',
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Subscription Activated!",
          description: "Welcome to HybridX Premium! You now have access to all features.",
        });
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || !elements || isSubmitting}
        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Crown className="h-4 w-4 mr-2" />
            Subscribe for £5/month
          </>
        )}
      </Button>
    </form>
  );
}

export function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  const { createSubscription, isCreatingSubscription } = useSubscription();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const features = [
    { name: "Professional HYROX Programs", included: true },
    { name: "Beginner to Advanced Training", included: true },
    { name: "Progress Tracking & Analytics", included: true },
    { name: "Strava Integration", included: true },
    { name: "Personalized Recommendations", included: true },
    { name: "Calendar & Scheduling", included: true },
    { name: "Random Workout Generator", included: false, note: "Free for all users" },
  ];

  const handleStartSubscription = async () => {
    try {
      const result = await createSubscription();
      if (result.clientSecret) {
        setClientSecret(result.clientSecret);
        setShowPaymentForm(true);
      } else {
        toast({
          title: "Error",
          description: "Failed to initialize payment. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start subscription process. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePaymentSuccess = () => {
    onClose();
    setShowPaymentForm(false);
    setClientSecret(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-yellow-500" />
            HybridX Premium
          </DialogTitle>
          <DialogDescription>
            Unlock your full potential with professional HYROX training programs
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!showPaymentForm ? (
            <>
              {/* Pricing Card */}
              <Card className="border-yellow-200">
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl font-bold">£5</CardTitle>
                  <CardDescription>per month • Cancel anytime</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        {feature.included ? (
                          <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <X className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        )}
                        <span className={feature.included ? "text-gray-900" : "text-gray-500"}>
                          {feature.name}
                        </span>
                        {feature.note && (
                          <Badge variant="secondary" className="text-xs">
                            {feature.note}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleStartSubscription}
                  disabled={isCreatingSubscription}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                  size="lg"
                >
                  {isCreatingSubscription ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Crown className="h-4 w-4 mr-2" />
                      Start Premium Subscription
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  size="lg"
                >
                  Continue Free
                </Button>
              </div>

              <div className="text-center text-sm text-gray-500">
                <p>
                  Free users can still access the random workout generator and basic features.
                  Premium unlocks professional training programs and advanced features.
                </p>
              </div>
            </>
          ) : (
            clientSecret && (
              <Elements 
                stripe={stripePromise} 
                options={{ 
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#eab308',
                    }
                  }
                }}
              >
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Complete Your Subscription</h3>
                    <p className="text-sm text-gray-600">
                      Secure payment powered by Stripe
                    </p>
                  </div>
                  <SubscriptionForm onSuccess={handlePaymentSuccess} />
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      onClick={() => setShowPaymentForm(false)}
                      className="text-sm"
                    >
                      ← Back to subscription details
                    </Button>
                  </div>
                </div>
              </Elements>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}