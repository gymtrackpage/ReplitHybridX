import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Landing from "@/pages/landing";

function SimpleApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <Landing />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default SimpleApp;