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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Shield, 
  Users, 
  Edit, 
  Trash2, 
  Plus, 
  Upload, 
  Settings as SettingsIcon,
  Crown,
  CreditCard,
  Calendar,
  Dumbbell,
  FileText,
  Download
} from "lucide-react";

export default function Admin() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isEditingProgram, setIsEditingProgram] = useState(false);
  const [activeTab, setActiveTab] = useState("users");

  // Queries
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: programs, isLoading: programsLoading } = useQuery({
    queryKey: ["/api/admin/programs"],
  });

  const { data: systemStats } = useQuery({
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
      setIsEditingUser(false);
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
      setIsEditingProgram(false);
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

  const handleUserUpdate = (userData: any) => {
    updateUserMutation.mutate(userData);
  };

  const handleProgramUpdate = (programData: any) => {
    updateProgramMutation.mutate(programData);
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

        {/* Admin Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="programs" className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              Programs
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              System
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
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
                    users?.map((user: any) => {
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
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedUser(user)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit User</DialogTitle>
                                  <DialogDescription>Update user information and settings</DialogDescription>
                                </DialogHeader>
                                <UserEditForm 
                                  user={selectedUser} 
                                  onSubmit={handleUserUpdate}
                                  isLoading={updateUserMutation.isPending}
                                />
                              </DialogContent>
                            </Dialog>
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
          </TabsContent>

          {/* Programs Tab */}
          <TabsContent value="programs">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Program Management</CardTitle>
                    <CardDescription>Manage training programs and upload new ones</CardDescription>
                  </div>
                  <div className="flex gap-2">
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
                      Upload CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {programsLoading ? (
                    <div className="text-center py-8">Loading programs...</div>
                  ) : (
                    programs?.map((program: any) => (
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
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedProgram(program)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Program</DialogTitle>
                                <DialogDescription>Update program information</DialogDescription>
                              </DialogHeader>
                              <ProgramEditForm 
                                program={selectedProgram} 
                                onSubmit={handleProgramUpdate}
                                isLoading={updateProgramMutation.isPending}
                              />
                            </DialogContent>
                          </Dialog>
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
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Tools</CardTitle>
                  <CardDescription>Administrative tools and system utilities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Download className="h-4 w-4" />
                    Export All User Data
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <FileText className="h-4 w-4" />
                    Generate System Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Calendar className="h-4 w-4" />
                    Schedule Maintenance
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>CSV Upload Format</CardTitle>
                  <CardDescription>Required columns for program CSV uploads</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-2">
                    <div><strong>Required columns:</strong></div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>week (number): Week of the program</li>
                      <li>day (number): Day within the week</li>
                      <li>name (text): Workout name</li>
                      <li>description (text): Workout description</li>
                      <li>duration (number): Duration in minutes</li>
                      <li>exercises (JSON array): Exercise details</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}

// User Edit Form Component
function UserEditForm({ user, onSubmit, isLoading }: any) {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    fitnessLevel: user?.fitnessLevel || "",
    isAdmin: user?.isAdmin || false,
    currentProgramId: user?.currentProgramId || "",
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
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Updating..." : "Update User"}
      </Button>
    </form>
  );
}

// Program Edit Form Component
function ProgramEditForm({ program, onSubmit, isLoading }: any) {
  const [formData, setFormData] = useState({
    name: program?.name || "",
    description: program?.description || "",
    difficulty: program?.difficulty || "",
    duration: program?.duration || "",
    frequency: program?.frequency || "",
    category: program?.category || "",
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
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Updating..." : "Update Program"}
      </Button>
    </form>
  );
}