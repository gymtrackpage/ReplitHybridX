import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "./navigation";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="w-64 hidden md:block">
        <Navigation onLogout={handleLogout} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 bg-white border-b border-gray-200 lg:hidden">
            <img 
              src="/logo-x.png" 
              alt="HybridX Logo" 
              className="h-6 w-6"
              onError={(e) => {
                console.error('Logo failed to load:', e);
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}