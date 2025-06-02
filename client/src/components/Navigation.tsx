import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import logoIcon from "@assets/Icon Logo-1.png";
import type { User } from "@shared/schema";

interface NavigationProps {
  user?: User;
}

export default function Navigation({ user }: NavigationProps) {
  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <nav className="bg-gray-50 border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <div className="text-lg font-semibold text-gray-900">Train@HybridX</div>
            <div className="text-sm text-gray-600">train.hybridx.club</div>
          </div>
          
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
        
        {/* Logo Section */}
        <div className="flex justify-center mt-4 mb-4">
          <img src={logoIcon} alt="HybridX" className="h-12 w-12" />
        </div>
      </div>
    </nav>
  );
}
