import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "../lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: (failureCount, error: any) => {
      // Don't retry on 401/403 errors (authentication issues)
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      return failureCount < 1;
    },
    staleTime: 60 * 60 * 1000, // 1 hour - much longer stale time
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch on focus
    refetchOnMount: false, // Don't always check on mount - trust cache
    refetchOnReconnect: true, // Only refetch on reconnect
    refetchInterval: false, // Disable periodic refetching
    refetchIntervalInBackground: false,
    networkMode: 'online',
  });

  return {
    user,
    loading: isLoading,
    isLoading,
    isAuthenticated: !!user && user !== null,
    error,
    refetch,
  };
}