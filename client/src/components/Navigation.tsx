import { Button } from "@/components/ui/button";
import { Dumbbell, Bell, User as UserIcon } from "lucide-react";
import type { User } from "@shared/schema";

interface NavigationProps {
  user?: User;
}

export default function Navigation({ user }: NavigationProps) {
  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <nav className="bg-white border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Dumbbell className="h-8 w-8 text-primary mr-3" />
              <span className="font-bold text-xl text-foreground">Hybrid X</span>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <a 
                href="/" 
                className="text-primary border-b-2 border-primary px-3 py-2 text-sm font-medium"
              >
                Dashboard
              </a>
              <a 
                href="/workouts" 
                className="text-muted-foreground hover:text-foreground px-3 py-2 text-sm font-medium"
              >
                Workouts
              </a>
              <a 
                href="/progress" 
                className="text-muted-foreground hover:text-foreground px-3 py-2 text-sm font-medium"
              >
                Progress
              </a>
              <a 
                href="/programs" 
                className="text-muted-foreground hover:text-foreground px-3 py-2 text-sm font-medium"
              >
                Programs
              </a>
              {user?.isAdmin && (
                <a 
                  href="/admin" 
                  className="text-muted-foreground hover:text-foreground px-3 py-2 text-sm font-medium"
                >
                  Admin
                </a>
              )}
            </div>
          </div>
          
          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-2">
              {user?.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserIcon className="h-4 w-4 text-primary" />
                </div>
              )}
              <span className="text-sm font-medium text-foreground">
                {user?.firstName || 'User'}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
