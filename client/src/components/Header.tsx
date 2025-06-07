import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import logoPath from "@assets/Untitled design_20250607_123708_0000_1749296269592.png";

interface HeaderProps {
  title?: string;
  showLogout?: boolean;
}

export default function Header({ title = "Hybrid X", showLogout = true }: HeaderProps) {
  const { user } = useAuth();
  
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
        
        <div className="flex items-center gap-2">
          {(user as any)?.isAdmin && (
            <Link href="/admin">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Admin
              </Button>
            </Link>
          )}
          
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
      </div>
    </header>
  );
}