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

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});