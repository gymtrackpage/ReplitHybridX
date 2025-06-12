import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { 
  Home, 
  Calendar, 
  Dumbbell, 
  User, 
  Settings,
  Target,
  BarChart3,
  Zap,
  ClipboardList,
  Shield
} from "lucide-react";

export function MobileNavigation() {
  const [location] = useLocation();
  const { user } = useAuth();

  const baseNavItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Calendar, label: "Calendar", path: "/calendar" },
    { icon: Dumbbell, label: "Workouts", path: "/workouts" },
    { icon: Zap, label: "Random", path: "/random-workout" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  // Add admin navigation for administrators
  const navItems = (user as any)?.isAdmin 
    ? [...baseNavItems.slice(0, -1), { icon: Shield, label: "Admin", path: "/admin" }, baseNavItems[baseNavItems.length - 1]]
    : baseNavItems;

  return (
    <nav className="bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg">
      <div className={`grid ${navItems.length === 6 ? 'grid-cols-6' : 'grid-cols-5'} h-16`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
          
          return (
            <Link key={item.path} href={item.path}>
              <div className={cn(
                "flex flex-col items-center justify-center h-full text-xs font-medium transition-all duration-200 ease-in-out cursor-pointer",
                isActive 
                  ? "text-yellow-500 bg-yellow-50/80 scale-105" 
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50/50 active:scale-95"
              )}>
                <Icon className={cn("h-5 w-5 mb-1 transition-colors", isActive && "text-yellow-500")} />
                <span className={cn("text-xs font-medium", isActive && "text-yellow-500")}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}