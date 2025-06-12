import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Home, 
  Calendar, 
  Dumbbell, 
  User, 
  Settings,
  Target,
  BarChart3,
  Zap,
  ClipboardList
} from "lucide-react";

export function MobileNavigation() {
  const [location] = useLocation();

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Calendar, label: "Calendar", path: "/calendar" },
    { icon: Dumbbell, label: "Workouts", path: "/workouts" },
    { icon: Zap, label: "Random", path: "/random-workout" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 dark:bg-gray-900 dark:border-gray-700">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
          
          return (
            <Link key={item.path} href={item.path}>
              <a className={cn(
                "flex flex-col items-center justify-center h-full text-xs font-medium transition-colors",
                isActive 
                  ? "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20" 
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              )}>
                <Icon className={cn("h-5 w-5 mb-1", isActive && "text-yellow-500")} />
                <span className={cn("text-xs", isActive && "text-yellow-500")}>{item.label}</span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}