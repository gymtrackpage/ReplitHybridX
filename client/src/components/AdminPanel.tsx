import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Dumbbell, BarChart3, Plus, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface AdminPanelProps {
  users: User[];
}

export default function AdminPanel({ users }: AdminPanelProps) {
  const { toast } = useToast();

  const activeUsers = users.filter(user => user.subscriptionStatus === 'active').length;
  const totalUsers = users.length;

  const quickActions = [
    {
      icon: Users,
      title: "View All Users",
      description: "Manage user accounts and subscriptions",
      action: () => toast({ title: "User management coming soon!" }),
    },
    {
      icon: BarChart3,
      title: "User Analytics",
      description: "View engagement and progress reports",
      action: () => toast({ title: "Analytics dashboard coming soon!" }),
    },
    {
      icon: Plus,
      title: "Create New Program",
      description: "Add new training programs",
      action: () => toast({ title: "Program creation coming soon!" }),
    },
    {
      icon: Edit,
      title: "Edit Programs",
      description: "Modify existing programs and workouts",
      action: () => toast({ title: "Program editing coming soon!" }),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <Users className="h-4 w-4 text-secondary" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Active Subscribers</p>
                <p className="text-2xl font-bold text-foreground">{activeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Dumbbell className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Programs</p>
                <p className="text-2xl font-bold text-foreground">8</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-accent/10 rounded-lg">
                <BarChart3 className="h-4 w-4 text-accent" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Workouts Completed</p>
                <p className="text-2xl font-bold text-foreground">1,247</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 text-primary mr-2" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                variant="ghost"
                className="w-full justify-start h-auto p-3"
                onClick={() => toast({ title: "User management coming soon!" })}
              >
                <div className="text-left">
                  <p className="font-medium">View All Users</p>
                  <p className="text-sm text-muted-foreground">Manage user accounts and subscriptions</p>
                </div>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start h-auto p-3"
                onClick={() => toast({ title: "Analytics coming soon!" })}
              >
                <div className="text-left">
                  <p className="font-medium">User Analytics</p>
                  <p className="text-sm text-muted-foreground">View engagement and progress reports</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Dumbbell className="h-5 w-5 text-secondary mr-2" />
              Program Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                variant="ghost"
                className="w-full justify-start h-auto p-3"
                onClick={() => toast({ title: "Program creation coming soon!" })}
              >
                <div className="text-left">
                  <p className="font-medium">Create New Program</p>
                  <p className="text-sm text-muted-foreground">Add new training programs</p>
                </div>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start h-auto p-3"
                onClick={() => toast({ title: "Program editing coming soon!" })}
              >
                <div className="text-left">
                  <p className="font-medium">Edit Programs</p>
                  <p className="text-sm text-muted-foreground">Modify existing programs and workouts</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Users */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.slice(0, 10).map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center">
                  {user.profileImageUrl ? (
                    <img 
                      src={user.profileImageUrl} 
                      alt="Profile" 
                      className="w-10 h-10 rounded-full object-cover mr-3"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-foreground">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={user.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                    {user.subscriptionStatus || 'inactive'}
                  </Badge>
                  {user.isAdmin && (
                    <Badge variant="destructive">Admin</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
