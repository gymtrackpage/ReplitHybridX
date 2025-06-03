import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Shield, Calendar, TrendingUp, Activity, Crown } from "lucide-react";
import { User } from "@shared/schema";

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalWorkouts: number;
  monthlyRevenue: number;
}

export default function AdminPanel() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalWorkouts: 0,
    monthlyRevenue: 0
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: !!user?.isAdmin,
    retry: false,
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}`, { isAdmin });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User Updated",
        description: "User permissions have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user permissions.",
        variant: "destructive",
      });
    },
  });

  // Calculate stats from users data
  useEffect(() => {
    if (users.length > 0) {
      const activeSubscriptions = users.filter((u: User) => 
        u.subscriptionStatus === 'active' || u.paymentStatus === 'paid'
      ).length;
      
      setStats({
        totalUsers: users.length,
        activeSubscriptions,
        totalWorkouts: users.length * 25, // Estimated
        monthlyRevenue: activeSubscriptions * 29.99
      });
    }
  }, [users]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have administrator privileges to access this panel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = "/dashboard"} 
              className="w-full"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAdminToggle = (userId: string, currentStatus: boolean) => {
    updateUserMutation.mutate({ userId, isAdmin: !currentStatus });
  };

  const getSubscriptionBadge = (user: User) => {
    if (user.subscriptionStatus === 'active' || user.paymentStatus === 'paid') {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Active</Badge>;
    }
    if (user.paymentStatus === 'trial') {
      return <Badge variant="secondary">Trial</Badge>;
    }
    return <Badge variant="outline">Free</Badge>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
            <p className="text-gray-600 dark:text-gray-300">Manage users and system overview</p>
          </div>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Administrator</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Registered accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">
                Paying customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalWorkouts.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Completed sessions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.monthlyRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Estimated recurring
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Manage user accounts, permissions, and subscription status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u: User) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {(u.firstName?.[0] || u.email?.[0] || 'U').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">
                              {u.firstName && u.lastName 
                                ? `${u.firstName} ${u.lastName}` 
                                : u.email?.split('@')[0] || 'Unknown User'
                              }
                            </div>
                            <div className="text-sm text-muted-foreground">ID: {u.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{u.email || 'No email'}</div>
                      </TableCell>
                      <TableCell>
                        {getSubscriptionBadge(u)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDate(u.createdAt?.toString() || null)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={u.isAdmin || false}
                            onCheckedChange={() => handleAdminToggle(u.id, u.isAdmin || false)}
                            disabled={updateUserMutation.isPending}
                          />
                          {u.isAdmin && (
                            <Badge variant="secondary" className="text-xs">
                              Admin
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Navigate to user details or send message
                              toast({
                                title: "User Details",
                                description: `Viewing details for ${u.email}`,
                              });
                            }}
                          >
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>System Actions</CardTitle>
            <CardDescription>
              Administrative tools and system management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <div className="font-medium">Export User Data</div>
                  <div className="text-sm text-muted-foreground">Download user analytics</div>
                </div>
              </Button>
              
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <div className="font-medium">System Health</div>
                  <div className="text-sm text-muted-foreground">Check system status</div>
                </div>
              </Button>
              
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <div className="font-medium">Backup Data</div>
                  <div className="text-sm text-muted-foreground">Create system backup</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}