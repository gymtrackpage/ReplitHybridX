import { MobileNavigation } from "./mobile-navigation";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Mobile Header - Fixed */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-14">
          <img 
              src="/logo-x.png" 
              alt="HybridX Logo" 
              className="h-8 w-8"
              onError={(e) => {
                console.error('Logo failed to load:', e);
                e.currentTarget.style.display = 'none';
              }}
            />
        </div>
      </header>

      {/* Main Content - Scrollable with fixed padding */}
      <main className="flex-1 overflow-y-auto pt-14 pb-16 bg-background">
        <div className="mobile-container min-h-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation - Fixed */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <MobileNavigation />
      </div>
    </div>
  );
}