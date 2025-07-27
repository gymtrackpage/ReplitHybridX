import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: (failureCount, error: any) => {
      // Don't retry on 401/403 errors (authentication issues)
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      return failureCount < 1; // Reduced retry attempts
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - much longer stale time
    gcTime: 2 * 60 * 60 * 1000, // 2 hours - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch on focus
    refetchOnMount: false, // Don't refetch on every mount
    refetchOnReconnect: true, // Only refetch on reconnect
    refetchInterval: false, // Disable periodic refetching
    refetchIntervalInBackground: false,
    // Only fetch when explicitly needed
    networkMode: 'offlineFirst',
  });

  return {
    user,
    loading: isLoading,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}