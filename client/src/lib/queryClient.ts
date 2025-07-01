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
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || `HTTP ${response.status}`;
      } catch {
        errorMessage = await response.text() || `HTTP ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    // Return parsed JSON data directly
    return response.json();
  } catch (error: any) {
    if (error.status) {
      // Already processed API error, re-throw
      throw error;
    } else {
      // Network or other error
      console.error(`Network Error ${method} ${url}:`, error);
      const networkError = new Error('Network error occurred') as any;
      networkError.status = 0;
      networkError.data = { message: 'Network error occurred' };
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