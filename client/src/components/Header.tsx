import { Button } from "@/components/ui/button";
import logoPath from "@assets/Icon Logo-1.png";

interface HeaderProps {
  title?: string;
  showLogout?: boolean;
}

export default function Header({ title = "Hybrid X", showLogout = true }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img 
            src={logoPath} 
            alt="Hybrid X Logo" 
            className="h-8 w-8 object-contain"
          />
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        </div>
        
        {showLogout && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = '/api/logout'}
          >
            Logout
          </Button>
        )}
      </div>
    </header>
  );
}