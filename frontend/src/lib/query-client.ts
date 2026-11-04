import { QueryClient } from "@tanstack/react-query";
import { isAbortError } from "./api-client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (isAbortError(error)) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
    },
    mutations: {
      retry: false,
    },
  },
});
