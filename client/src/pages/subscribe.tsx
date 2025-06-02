import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!stripe || !elements) {
      setIsLoading(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
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
        description: "You are now subscribed to Hybrid X Premium!",
      });
    }

    setIsLoading(false);
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
          <Crown className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Upgrade to Premium</CardTitle>
        <CardDescription>
          Get access to unlimited workouts and premium features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <PaymentElement />
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!stripe || isLoading}
          >
            {isLoading ? "Processing..." : "Subscribe - $29.99/month"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default function Subscribe() {
  const { user } = useAuth();
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    apiRequest("POST", "/api/create-subscription")
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error creating subscription:", error);
        toast({
          title: "Error",
          description: "Failed to initialize payment. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
      });
  }, [toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={user} />
        <div className="flex items-center justify-center pt-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={user} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Payment Error</h1>
            <p className="text-muted-foreground mb-6">
              Unable to initialize payment. Please try again.
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Subscribe to Premium</h1>
          <p className="text-muted-foreground">
            Unlock unlimited access to all training programs and premium features
          </p>
        </div>

        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <SubscribeForm />
        </Elements>

        {/* Premium Features */}
        <div className="max-w-2xl mx-auto mt-12">
          <h2 className="text-2xl font-bold text-center mb-8">Premium Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="text-center p-6 rounded-lg border bg-card">
              <h3 className="font-semibold mb-2">Unlimited Programs</h3>
              <p className="text-sm text-muted-foreground">
                Access to all training programs and new releases
              </p>
            </div>
            <div className="text-center p-6 rounded-lg border bg-card">
              <h3 className="font-semibold mb-2">Progress Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Detailed progress tracking and performance insights
              </p>
            </div>
            <div className="text-center p-6 rounded-lg border bg-card">
              <h3 className="font-semibold mb-2">Nutrition Guidance</h3>
              <p className="text-sm text-muted-foreground">
                Personalized meal plans and nutrition advice
              </p>
            </div>
            <div className="text-center p-6 rounded-lg border bg-card">
              <h3 className="font-semibold mb-2">Priority Support</h3>
              <p className="text-sm text-muted-foreground">
                Direct access to trainers and priority customer support
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
