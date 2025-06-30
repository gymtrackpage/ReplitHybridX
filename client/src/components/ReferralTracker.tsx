import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export function ReferralTracker() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get referral code from URL parameters and session
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('ref');

    if (referralCode) {
      // Track the referral
      trackReferralMutation.mutate({ referralCode });
      
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [isAuthenticated, user]);

  // Track referral mutation
  const trackReferralMutation = useMutation({
    mutationFn: async ({ referralCode }: { referralCode: string }) => {
      return await apiRequest("POST", "/api/referral/track", { referralCode });
    },
    onSuccess: () => {
      toast({
        title: "Welcome!",
        description: "You've been referred by a friend. Complete 2 months of training and you'll both get rewarded!",
      });
      
      // Clear session referral code
      apiRequest("DELETE", "/api/referral/session-code").catch(() => {
        // Ignore errors for cleanup
      });
    },
    onError: (error: any) => {
      // Only show error if it's not a duplicate referral
      if (!error.message?.includes("already been referred")) {
        console.error("Referral tracking error:", error);
      }
    },
  });

  // This component doesn't render anything visible
  return null;
}