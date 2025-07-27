import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      // Clone the response to avoid "Body stream already used" error
      const clonedRes = res.clone();
      const text = await clonedRes.text();

      if (text) {
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || text;
        } catch {
          errorMessage = text;
        }
      }
    } catch (error) {
      // If we can't read the response body, use status text
      errorMessage = res.statusText;
    }

    throw new Error(`${res.status}: ${errorMessage}`);
  }
}

export async function apiRequest(method: string, url: string, body?: any) {
  const options: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      let errorMessage;
      let errorData: any = {};

      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
          errorMessage = errorData.message || `HTTP ${response.status}`;
        } else {
          const textError = await response.text();
          errorMessage = textError || `HTTP ${response.status}`;
          errorData = { message: errorMessage };
        }
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
        errorMessage = `HTTP ${response.status} - Unable to parse error response`;
      }

      const error = new Error(errorMessage) as any;
      error.status = response.status;
      error.data = errorData;
      error.needsAuth = errorData.needsAuth || response.status === 401;

      // Handle authentication errors consistently
      if (response.status === 401) {
        console.warn('Authentication required, redirecting to login');
        // You might want to trigger a global auth state update here
      }

      throw error;
    }

    // Ensure we always return JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    } else {
      // Wrap non-JSON responses
      const text = await response.text();
      return { data: text, success: true };
    }
  } catch (error: any) {
    if (error.status) {
      // Already processed API error, re-throw
      throw error;
    } else {
      // Network or other error
      console.error(`Network Error ${method} ${url}:`, error);
      const networkError = new Error('Network connection failed') as any;
      networkError.status = 0;
      networkError.data = { message: 'Network connection failed' };
      networkError.originalError = error;
      throw networkError;
    }
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Export the queryClient instance
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 401/403 errors (authentication issues)
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 15 * 60 * 1000, // 15 minutes - increased to reduce refetching
      gcTime: 60 * 60 * 1000, // 60 minutes - keep data longer
      refetchOnWindowFocus: false, // Disable to prevent auth checks on every focus
      refetchOnMount: false, // Don't always refetch on mount
      refetchOnReconnect: true,
      networkMode: 'offlineFirst',
      // More lenient error handling
      throwOnError: false, // Don't throw errors automatically
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry mutations on auth errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 1;
      },
      networkMode: 'offlineFirst',
    },
  },
});