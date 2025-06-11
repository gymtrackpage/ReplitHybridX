import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

function TestComponent() {
  return (
    <div className="p-8 bg-blue-500 text-white">
      <h1>Test App Working</h1>
      <p>If you can see this, React is working properly.</p>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TestComponent />
    </QueryClientProvider>
  );
}