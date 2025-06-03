import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Home, Calendar, Scale, User as UserIcon } from "lucide-react";

export default function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/calendar", icon: Calendar, label: "Calendar" },
    { path: "/weight-tracker", icon: Scale, label: "Weight" },
    { path: "/profile", icon: UserIcon, label: "Profile" },
  ];

  return (
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
  );
}