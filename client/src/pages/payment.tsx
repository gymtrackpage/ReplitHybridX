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

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_...");

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

    // Confirm payment
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      },
    });

    if (error) {
      console.error("Payment failed:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Your payment could not be processed.",
        variant: "destructive"
      });
    } else if (paymentIntent?.status === 'succeeded') {
      // Payment succeeded - complete assessment
      try {
        const pendingAssessment = localStorage.getItem('pendingAssessment');
        if (pendingAssessment) {
          const assessmentData = JSON.parse(pendingAssessment);
          await apiRequest("POST", "/api/complete-assessment", assessmentData);
          localStorage.removeItem('pendingAssessment');
        }

        toast({
          title: "Payment Successful!",
          description: "Welcome to HybridX Premium! Your assessment has been completed.",
        });

        setLocation("/dashboard");
      } catch (error) {
        console.error("Assessment completion error:", error);
        toast({
          title: "Assessment Error",
          description: "Payment succeeded but assessment completion failed. Please contact support.",
          variant: "destructive"
        });
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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const secret = urlParams.get('client_secret');
    const subId = urlParams.get('subscription_id');

    if (!secret || !subId) {
      setLocation('/assessment');
      return;
    }

    setClientSecret(secret);
    setSubscriptionId(subId);
  }, [setLocation]);

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