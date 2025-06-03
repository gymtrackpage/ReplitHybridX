import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { MoreVertical, Home, Calendar, User as UserIcon, Scale, Settings } from "lucide-react";
import logoIcon from "@assets/Icon Logo-1.png";
import type { User } from "@shared/schema";

interface NavigationProps {
  user?: User;
}

export default function Navigation({ user }: NavigationProps) {
  const [location] = useLocation();
  
  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/calendar", icon: Calendar, label: "Calendar" },
    { path: "/weight-tracker", icon: Scale, label: "Weight" },
    { path: "/profile", icon: UserIcon, label: "Profile" },
  ];

  return (
    <>
      {/* Top Navigation */}
      <nav className="bg-gray-50 border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <div className="text-lg font-semibold text-gray-900">Train@HybridX</div>
              <div className="text-sm text-gray-600">train.hybridx.club</div>
            </div>
            
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <MoreVertical className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
          
          {/* Logo Section */}
          <div className="flex justify-center mt-4 mb-4">
            <img src={logoIcon} alt="HybridX" className="h-12 w-12" />
          </div>
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="grid grid-cols-4 gap-1 px-2 py-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location === path || (path !== "/" && location.startsWith(path));
            return (
              <Link key={path} href={path}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`flex flex-col items-center gap-1 h-auto py-2 px-1 ${
                    isActive ? "text-yellow-600 bg-yellow-50" : "text-gray-600"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom spacing to prevent content from being hidden behind bottom nav */}
      <div className="h-16"></div>
    </>
  );
}
