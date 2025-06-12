import { MobileNavigation } from "./mobile-navigation";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-yellow-500">HybridX</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mobile-container min-h-[calc(100vh-3.5rem-4rem)]">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNavigation />
    </div>
  );
}