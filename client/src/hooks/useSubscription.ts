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
      const response = await apiRequest("POST", "/api/create-subscription");
      const data = await response.json();
      
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else if (data.clientSecret && data.subscriptionId) {
        window.location.href = `/payment?client_secret=${data.clientSecret}&subscription_id=${data.subscriptionId}`;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
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