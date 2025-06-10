import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-2xl font-bold">Hybrid X Loading...</h1>
      </div>
    </QueryClientProvider>
  );
}

export default App;