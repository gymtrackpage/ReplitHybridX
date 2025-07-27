import { Navigation } from "./navigation";
import { queryClient } from "../../lib/queryClient";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const handleLogout = async () => {
    try {
      // Clear all cached data before logout
      queryClient.clear();
      
      // Remove any stored auth tokens or session data
      if (typeof Storage !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      // Navigate to logout endpoint
      window.location.href = "/api/logout";
    } catch (error) {
      console.error("Error during logout:", error);
      // Force logout even if cleanup fails
      window.location.href = "/api/logout";
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="w-64 hidden md:block">
        <Navigation onLogout={handleLogout} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}