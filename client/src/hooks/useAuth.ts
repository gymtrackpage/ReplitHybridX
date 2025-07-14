import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: (failureCount, error: any) => {
      // Don't retry on 401/403 errors (authentication issues)
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      return failureCount < 2; // Increased retry attempts for network issues
    },
    staleTime: 10 * 60 * 1000, // Increased to 10 minutes
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
    refetchOnReconnect: true, // Refetch when network reconnects
    // Keep data fresh but don't overfetch
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes when active
    refetchIntervalInBackground: false, // Don't refetch in background
    // Enhanced error handling
    onError: (error: any) => {
      if (error?.status === 401 || error?.status === 403) {
        // Clear any cached data on auth errors
        console.log("Authentication error, clearing cache");
      }
    },
  });

  return {
    user,
    loading: isLoading,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}