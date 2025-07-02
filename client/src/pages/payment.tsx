import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Crown, Lock, CreditCard } from "lucide-react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm({ clientSecret, subscriptionId }: { clientSecret: string, subscriptionId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setIsProcessing(false);
      return;
    }

    // Determine if this is a payment intent or setup intent
    const isSetupIntent = clientSecret.startsWith('seti_');
    
    let result;
    if (isSetupIntent) {
      // Confirm setup intent
      result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });
    } else {
      // Confirm payment intent
      result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });
    }
    
    const { error, paymentIntent, setupIntent } = result;

    if (error) {
      console.error("Payment/Setup failed:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Your payment could not be processed. Please try again.",
        variant: "destructive"
      });
      
      // Don't redirect to assessment on payment failure - stay on payment page
      // User can retry payment or go back manually
      
    } else if (paymentIntent?.status === 'succeeded' || setupIntent?.status === 'succeeded') {
      // Payment or setup succeeded - update subscription status and complete assessment
      try {
        const intentId = paymentIntent?.id || setupIntent?.id;
        console.log("Payment/Setup succeeded, updating subscription status...", intentId);
        
        // Update subscription status
        await apiRequest("POST", "/api/subscription-confirmed", {
          subscriptionId,
          paymentIntentId: intentId
        });

        const pendingAssessment = localStorage.getItem('pendingAssessment');
        if (pendingAssessment) {
          console.log("Completing pending assessment...");
          try {
            const assessmentData = JSON.parse(pendingAssessment);
            await apiRequest("POST", "/api/complete-assessment", {
              ...assessmentData,
              subscriptionChoice: "premium",
              paymentIntentId: paymentIntent.id
            });
            localStorage.removeItem('pendingAssessment');
            console.log("Assessment completed successfully");
          } catch (assessmentError) {
            console.error("Assessment completion failed:", assessmentError);
            // Don't fail the whole flow if assessment completion fails
          }
        }

        toast({
          title: "Payment Successful!",
          description: "Welcome to HybridX Premium! Your subscription is now active.",
        });

        // Small delay before redirect to allow toast to show
        setTimeout(() => {
          setLocation("/dashboard");
        }, 1000);
        
      } catch (error) {
        console.error("Post-payment processing error:", error);
        toast({
          title: "Payment Successful",
          description: "Your payment was successful, but there was an issue completing setup. Please contact support if you experience issues.",
          variant: "destructive"
        });
        
        // Still redirect to dashboard since payment succeeded
        setTimeout(() => {
          setLocation("/dashboard");
        }, 3000);
      }
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Card Details</label>
          <div className="p-3 border rounded-md">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
        size="lg"
      >
        <CreditCard className="h-4 w-4 mr-2" />
        {isProcessing ? "Processing..." : "Complete Payment - £5/month"}
      </Button>

      <p className="text-xs text-center text-gray-500">
        Secure payment powered by Stripe. Cancel anytime.
      </p>
    </form>
  );
}

export default function Payment() {
  const [, setLocation] = useLocation();
  const [clientSecret, setClientSecret] = useState<string>("");
  const [subscriptionId, setSubscriptionId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    // Check if Stripe is configured
    if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
      console.error("Stripe publishable key not configured");
      setError("Payment processing is not properly configured. Please contact support.");
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const secret = urlParams.get('client_secret');
    const subId = urlParams.get('subscription_id');

    console.log("Payment page loaded with params:", { secret: !!secret, subId: !!subId });

    if (!secret || !subId) {
      console.error("Missing payment parameters - redirecting to assessment");
      toast({
        title: "Payment Error",
        description: "Missing payment information. Please try subscribing again.",
        variant: "destructive"
      });
      setTimeout(() => setLocation('/assessment'), 2000);
      return;
    }

    // Validate client secret format (accept both payment intents and setup intents)
    if ((!secret.startsWith('pi_') && !secret.startsWith('seti_')) || secret.length < 27) {
      console.error("Invalid client secret format:", secret);
      setError("Invalid payment session. Please try subscribing again.");
      return;
    }

    // Validate subscription ID format
    if (!subId.startsWith('sub_') || subId.length < 10) {
      console.error("Invalid subscription ID format:", subId);
      setError("Invalid subscription session. Please try subscribing again.");
      return;
    }

    setClientSecret(secret);
    setSubscriptionId(subId);
  }, [setLocation, toast]);

  if (error) {
    return (
      <MobileLayout>
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-4">
          <div className="max-w-md mx-auto pt-20">
            <Card className="border-red-200">
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-red-600">Payment Error</CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => setLocation('/assessment')}
                  className="w-full"
                >
                  Return to Assessment
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!clientSecret) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card className="border-yellow-200">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-yellow-100 rounded-full w-fit">
                <Crown className="h-8 w-8 text-yellow-600" />
              </div>
              <CardTitle className="text-xl">Complete Your Subscription</CardTitle>
              <CardDescription>
                Enter your payment details to activate HybridX Premium
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="mb-6 p-4 bg-white rounded-lg border border-yellow-100">
                <h3 className="font-semibold mb-2">HybridX Premium - £5/month</h3>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>✓ Professional HYROX training programs</li>
                  <li>✓ Progress tracking & analytics</li>
                  <li>✓ Strava integration</li>
                  <li>✓ Personalized recommendations</li>
                </ul>
              </div>

              <Elements stripe={stripePromise}>
                <CheckoutForm clientSecret={clientSecret} subscriptionId={subscriptionId} />
              </Elements>

              <div className="text-center mt-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setLocation('/assessment')}
                  className="text-sm"
                >
                  ← Back to Assessment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MobileLayout>
  );
}