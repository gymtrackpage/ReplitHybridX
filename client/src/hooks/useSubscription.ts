import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface SubscriptionStatus {
  isSubscribed: boolean;
  subscriptionStatus?: 'active' | 'inactive' | 'canceled' | 'past_due';
  subscriptionId?: string;
  customerId?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  trialEnd?: string;
}

export function useSubscription() {
  const queryClient = useQueryClient();

  const { data: subscriptionStatus, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription-status'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async () => {
      try {
        const data = await apiRequest("POST", "/api/create-subscription");

        if (data.paymentUrl) {
          // Small delay to ensure mutation state is updated before redirect
          setTimeout(() => {
            window.location.href = data.paymentUrl;
          }, 100);
        } else if (data.clientSecret) {
          // Handle Stripe Elements integration if needed
          return data;
        } else {
          throw new Error("Invalid subscription response - missing payment URL");
        }
        return data;
      } catch (error: any) {
        console.error("Subscription creation failed:", error);
        throw new Error(error.message || "Failed to create subscription");
      }
    },
    onSuccess: (data: any) => {
      console.log("Subscription creation successful:", data);
      if (!data.paymentUrl && !data.clientSecret) {
        toast({
          title: "Success",
          description: "Subscription created successfully!",
        });
      }
    },
    onError: (error: any) => {
      console.error("Subscription creation error:", error);
      toast({
        title: "Subscription Error",
        description: error.message || "Failed to create subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cancel-subscription");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
  });

  const resumeSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/resume-subscription");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
  });

  const downgradeToFreeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/downgrade-to-free");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
  });

  const cancelImmediatelyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cancel-subscription", { immediate: true });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
  });

  const updatePaymentMethodMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/update-payment-method");
      return response.json();
    },
  });

  const retryPaymentMutation = useMutation({
    mutationFn: async (paymentMethodId?: string) => {
      const response = await apiRequest("POST", "/api/retry-payment", { paymentMethodId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
  });

  return {
    subscriptionStatus,
    isLoading,
    isSubscribed: subscriptionStatus?.isSubscribed || false,
    createSubscription: createSubscriptionMutation.mutateAsync,
    cancelSubscription: cancelSubscriptionMutation.mutateAsync,
    resumeSubscription: resumeSubscriptionMutation.mutateAsync,
    downgradeToFree: downgradeToFreeMutation.mutateAsync,
    cancelImmediately: cancelImmediatelyMutation.mutateAsync,
    updatePaymentMethod: updatePaymentMethodMutation.mutateAsync,
    retryPayment: retryPaymentMutation.mutateAsync,
    isCreatingSubscription: createSubscriptionMutation.isPending,
    isCancelingSubscription: cancelSubscriptionMutation.isPending,
    isResumingSubscription: resumeSubscriptionMutation.isPending,
    isDowngrading: downgradeToFreeMutation.isPending,
    isCancelingImmediately: cancelImmediatelyMutation.isPending,
    isUpdatingPaymentMethod: updatePaymentMethodMutation.isPending,
    isRetryingPayment: retryPaymentMutation.isPending,
  };
}

// Hook to check if user has access to premium features
export function usePremiumAccess() {
  const { subscriptionStatus, isLoading } = useSubscription();

  // Get user data to check admin status
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    staleTime: 5 * 60 * 1000,
  });

  // Admins bypass subscription requirements
  const isAdmin = (user as any)?.isAdmin || false;

  return {
    hasAccess: isAdmin || subscriptionStatus?.isSubscribed || false,
    isLoading,
    subscriptionStatus: subscriptionStatus?.subscriptionStatus,
    isAdmin,
  };
}