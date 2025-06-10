import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap } from "lucide-react";
import logoIcon from "@assets/Icon Logo-1.png";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard`,
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
        title: "Payment Successful",
        description: "Welcome to Hybrid X Premium! You now have access to all training programs.",
      });
    }

    setIsProcessing(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Complete Your Subscription</CardTitle>
        <CardDescription className="text-center">
          Start your HYROX training journey today
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <PaymentElement />
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!stripe || isProcessing}
          >
            {isProcessing ? "Processing..." : "Subscribe Now"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Create subscription as soon as the page loads
    apiRequest("POST", "/api/create-subscription", {})
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Subscription creation error:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-4xl mx-auto pt-20">
          <div className="text-center mb-8">
            <Crown className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">Hybrid X Premium</h1>
            <p className="text-xl text-muted-foreground">
              Unlock your HYROX potential with our premium training programs
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Pricing Card */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-sm font-medium">
                Best Value
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Premium Membership
                </CardTitle>
                <div className="space-y-2">
                  <div className="text-3xl font-bold">£5.00<span className="text-sm font-normal text-muted-foreground">/month</span></div>
                  <CardDescription>Everything you need to excel at HYROX</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    "Access to all 6+ specialized programs",
                    "Personalized program recommendations",
                    "Advanced progress tracking & analytics",
                    "Phase-based training progression",
                    "Expert-designed workout plans",
                    "Mobile-optimized training companion",
                    "Priority customer support"
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Programs Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Available Programs</CardTitle>
                <CardDescription>
                  Choose from our comprehensive library of HYROX-specific training programs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "Beginner Program", level: "Beginner", weeks: "14 weeks" },
                  { name: "Intermediate Program", level: "Intermediate", weeks: "14 weeks" },
                  { name: "Advanced Program", level: "Advanced", weeks: "14 weeks" },
                  { name: "Strength Program", level: "Specialized", weeks: "14 weeks" },
                  { name: "Runner Program", level: "Specialized", weeks: "14 weeks" },
                  { name: "Doubles Program", level: "Team", weeks: "14 weeks" }
                ].map((program) => (
                  <div key={program.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{program.name}</div>
                      <div className="text-sm text-muted-foreground">{program.weeks}</div>
                    </div>
                    <Badge variant="secondary">{program.level}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground mb-4">
              Payment processing is currently being set up. Please check back soon or contact support for access.
            </p>
            <Button variant="outline" onClick={() => window.location.href = "/dashboard"}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Make SURE to wrap the form in <Elements> which provides the stripe context.
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto pt-20">
        <div className="text-center mb-8">
          <img src={logoIcon} alt="HybridX" className="h-12 w-12 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Subscribe to HybridX Premium</h1>
          <p className="text-muted-foreground">
            Get unlimited access to all HYROX training programs
          </p>
        </div>

        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <SubscribeForm />
        </Elements>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>Secure payment processing by Stripe</p>
          <p className="mt-2">Cancel anytime. No long-term commitments.</p>
        </div>
      </div>
    </div>
  );
}