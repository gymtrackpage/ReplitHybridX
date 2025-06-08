import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // If there's a 401 error, user is not authenticated
  const isAuthenticated = !error && !!user;

  return {
    user: user || null,
    isLoading,
    isAuthenticated,
    error,
  };
}
