import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Shield, 
  Users, 
  Edit, 
  Trash2, 
  Upload, 
  Crown,
  CreditCard,
  Dumbbell,
  FileText
} from "lucide-react";

export default function Admin() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [editingUser, setEditingUser] = useState(false);
  const [editingProgram, setEditingProgram] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Queries
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: programs = [], isLoading: programsLoading } = useQuery({
    queryKey: ["/api/admin/programs"],
  });

  const { data: systemStats = {} } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  // Mutations
  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      await apiRequest("PUT", `/api/admin/users/${userData.id}`, userData);
    },
    onSuccess: () => {
      toast({ title: "User Updated", description: "User information has been updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditingUser(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      toast({ title: "User Deleted", description: "User has been deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateProgramMutation = useMutation({
    mutationFn: async (programData: any) => {
      await apiRequest("PUT", `/api/admin/programs/${programData.id}`, programData);
    },
    onSuccess: () => {
      toast({ title: "Program Updated", description: "Program has been updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      setEditingProgram(false);
      setSelectedProgram(null);
    },
    onError: (error: any) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteProgramMutation = useMutation({
    mutationFn: async (programId: number) => {
      await apiRequest("DELETE", `/api/admin/programs/${programId}`);
    },
    onSuccess: () => {
      toast({ title: "Program Deleted", description: "Program has been deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
    },
    onError: (error: any) => {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    },
  });

  const uploadProgramMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/admin/upload-program", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Program Uploaded", 
        description: `Successfully uploaded program with ${data.workoutCount} workouts.` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: any) => {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({ title: "Invalid File", description: "Please upload a CSV file.", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("csvFile", file);
    uploadProgramMutation.mutate(formData);
  };

  const getSubscriptionStatus = (user: any) => {
    if (!user.stripeSubscriptionId) return { status: "Free", color: "bg-gray-100 text-gray-800" };
    return { status: "Premium", color: "bg-green-100 text-green-800" };
  };

  return (
    <MobileLayout>
      <div className="space-y-6">
        {/* Admin Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-red-600" />
            <div>
              <h1 className="text-3xl font-bold">Admin Panel</h1>
              <p className="text-muted-foreground">System administration and management</p>
            </div>
          </div>
          <Badge className="bg-red-100 text-red-800 gap-1">
            <Crown className="h-3 w-3" />
            Administrator
          </Badge>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{systemStats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{systemStats?.activeSubscriptions || 0}</div>
              <p className="text-xs text-muted-foreground">Active Subscriptions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{systemStats?.totalPrograms || 0}</div>
              <p className="text-xs text-muted-foreground">Total Programs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{systemStats?.totalWorkouts || 0}</div>
              <p className="text-xs text-muted-foreground">Total Workouts</p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "overview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "users" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Users className="h-4 w-4 inline mr-1" />
            Users
          </button>
          <button
            onClick={() => setActiveTab("programs")}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "programs" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Dumbbell className="h-4 w-4 inline mr-1" />
            Programs
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
                <CardDescription>Quick actions and system status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadProgramMutation.isPending}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Program CSV
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Export Data
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p><strong>CSV Format:</strong> week, day, name, description, duration, exercises</p>
                  <p>Exercise data should be JSON formatted or plain text description</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "users" && (
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage all registered users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {usersLoading ? (
                  <div className="text-center py-8">Loading users...</div>
                ) : (
                  users.map((user: any) => {
                    const subscription = getSubscriptionStatus(user);
                    return (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-medium">
                                {user.firstName} {user.lastName}
                                {user.isAdmin && <Crown className="inline h-4 w-4 ml-1 text-yellow-600" />}
                              </div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Badge className={subscription.color}>
                              <CreditCard className="h-3 w-3 mr-1" />
                              {subscription.status}
                            </Badge>
                            {user.fitnessLevel && (
                              <Badge variant="outline">{user.fitnessLevel}</Badge>
                            )}
                            {user.currentProgramId && (
                              <Badge variant="outline">Program Active</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setEditingUser(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteUserMutation.mutate(user.id)}
                            disabled={deleteUserMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "programs" && (
          <Card>
            <CardHeader>
              <CardTitle>Program Management</CardTitle>
              <CardDescription>Manage training programs and workouts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {programsLoading ? (
                  <div className="text-center py-8">Loading programs...</div>
                ) : (
                  programs.map((program: any) => (
                    <div key={program.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{program.name}</div>
                        <div className="text-sm text-muted-foreground">{program.description}</div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{program.difficulty}</Badge>
                          <Badge variant="outline">{program.duration} weeks</Badge>
                          <Badge variant="outline">{program.workoutCount || 0} workouts</Badge>
                          {!program.isActive && <Badge variant="destructive">Inactive</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedProgram(program);
                            setEditingProgram(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteProgramMutation.mutate(program.id)}
                          disabled={deleteProgramMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit User Modal */}
        {editingUser && selectedUser && (
          <Card className="fixed inset-4 z-50 bg-background border shadow-lg">
            <CardHeader>
              <CardTitle>Edit User</CardTitle>
              <CardDescription>Update user information and settings</CardDescription>
            </CardHeader>
            <CardContent>
              <UserEditForm 
                user={selectedUser} 
                onSubmit={(userData) => updateUserMutation.mutate(userData)}
                onCancel={() => {
                  setEditingUser(false);
                  setSelectedUser(null);
                }}
                isLoading={updateUserMutation.isPending}
              />
            </CardContent>
          </Card>
        )}

        {/* Edit Program Modal */}
        {editingProgram && selectedProgram && (
          <Card className="fixed inset-4 z-50 bg-background border shadow-lg">
            <CardHeader>
              <CardTitle>Edit Program</CardTitle>
              <CardDescription>Update program information</CardDescription>
            </CardHeader>
            <CardContent>
              <ProgramEditForm 
                program={selectedProgram} 
                onSubmit={(programData) => updateProgramMutation.mutate(programData)}
                onCancel={() => {
                  setEditingProgram(false);
                  setSelectedProgram(null);
                }}
                isLoading={updateProgramMutation.isPending}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}

// User Edit Form Component
function UserEditForm({ user, onSubmit, onCancel, isLoading }: any) {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    fitnessLevel: user?.fitnessLevel || "",
    isAdmin: user?.isAdmin || false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, id: user.id });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="fitnessLevel">Fitness Level</Label>
        <Select value={formData.fitnessLevel} onValueChange={(value) => setFormData({ ...formData, fitnessLevel: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select fitness level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isAdmin"
          checked={formData.isAdmin}
          onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
        />
        <Label htmlFor="isAdmin">Administrator</Label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Updating..." : "Update User"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Program Edit Form Component
function ProgramEditForm({ program, onSubmit, onCancel, isLoading }: any) {
  const [formData, setFormData] = useState({
    name: program?.name || "",
    description: program?.description || "",
    difficulty: program?.difficulty || "",
    duration: program?.duration || "",
    isActive: program?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, id: program.id });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Program Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="difficulty">Difficulty</Label>
          <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="duration">Duration (weeks)</Label>
          <Input
            id="duration"
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
          />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
        />
        <Label htmlFor="isActive">Active Program</Label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Updating..." : "Update Program"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}