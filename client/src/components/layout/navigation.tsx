import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Home, 
  Calendar, 
  Dumbbell, 
  User, 
  Trophy,
  Settings,
  LogOut,
  Target,
  BarChart3,
  Zap,
  ClipboardList
} from "lucide-react";

interface NavigationProps {
  onLogout: () => void;
}

export function Navigation({ onLogout }: NavigationProps) {
  const [location] = useLocation();

  const navItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: Target, label: "Programs", path: "/programs" },
    { icon: ClipboardList, label: "Assessment", path: "/assessment" },
    { icon: Calendar, label: "Calendar", path: "/calendar" },
    { icon: Dumbbell, label: "Workouts", path: "/workouts" },
    { icon: Zap, label: "Random Workout", path: "/random-workout" },
    { icon: BarChart3, label: "Progress", path: "/progress" },
    { icon: User, label: "Profile", path: "/profile" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <nav className="bg-background border-r border-border h-full flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex flex-col items-center">
          <img 
            src="/logo-x.png" 
            alt="HybridX Logo" 
            className="h-10 w-10 mb-2"
          />
          <h1 className="text-xl font-bold text-yellow-400">HybridX</h1>
          <p className="text-sm text-muted-foreground">Fitness Training</p>
        </div>
      </div></div>
      
      <div className="flex-1 p-4">
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            
            return (
              <Link key={item.path} href={item.path}>
                <a className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-yellow-400 text-black" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </a>
              </Link>
            );
          })}
        </div>
      </div>
      
      <div className="p-4 border-t border-border">
        <Button
          onClick={onLogout}
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </nav>
  );
}