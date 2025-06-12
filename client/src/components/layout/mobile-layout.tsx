import { MobileNavigation } from "./mobile-navigation";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Mobile Header - Fixed */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-yellow-500">HybridX</h1>
          </div>
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