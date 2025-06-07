import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Home, Calendar, Scale, User as UserIcon, Target, Shuffle } from "lucide-react";

export default function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/calendar", icon: Calendar, label: "Calendar" },
    { path: "/weight-tracker", icon: Scale, label: "Weight" },
    { path: "/profile", icon: UserIcon, label: "Profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="relative">
        {/* Main Navigation Grid */}
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
        
        {/* Floating Action Button */}
        <div className="absolute top-[-28px] left-1/2 transform -translate-x-1/2">
          <Link href="/random-workout">
            <Button
              size="lg"
              className={`w-14 h-14 rounded-full shadow-lg border-4 border-white ${
                location === "/random-workout"
                  ? "bg-yellow-400 hover:bg-yellow-500"
                  : "bg-yellow-400 hover:bg-yellow-500"
              }`}
            >
              <Shuffle className="h-6 w-6 text-black" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}