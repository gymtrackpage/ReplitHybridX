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
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { 
  Users, 
  Database, 
  Upload, 
  Edit3,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  Crown,
  Settings
} from "lucide-react";

export default function Admin() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("programs");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editingUser, setEditingUser] = useState(false);
  const [expandedPrograms, setExpandedPrograms] = useState<Set<number>>(new Set());
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<any>(null);
  const [programWorkouts, setProgramWorkouts] = useState<{[key: number]: any[]}>({});
  const [uploadForm, setUploadForm] = useState({
    name: "",
    description: "",
    difficulty: "Beginner",
    category: "Hyrox",
    duration: 12,
    frequency: 4
  });

  // Redirect non-admin users
  if (!(user as any)?.isAdmin) {
    setLocation("/");
    return null;
  }

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
      setUploadModalOpen(false);
      setUploadForm({
        name: "",
        description: "",
        difficulty: "Beginner",
        category: "Hyrox",
        duration: 12,
        frequency: 4
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: any) => {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateProgramMutation = useMutation({
    mutationFn: async (programData: { id: number; [key: string]: any }) => {
      return apiRequest("PUT", `/api/admin/programs/${programData.id}`, programData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      setEditingProgram(null);
      toast({
        title: "Success",
        description: "Program updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update program",
        variant: "destructive",
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      toast({ title: "Invalid File", description: "Please upload a CSV or XLSX file.", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", uploadForm.name);
    formData.append("description", uploadForm.description);
    formData.append("difficulty", uploadForm.difficulty);
    formData.append("category", uploadForm.category);
    formData.append("duration", uploadForm.duration.toString());
    formData.append("frequency", uploadForm.frequency.toString());
    
    uploadProgramMutation.mutate(formData);
  };

  const toggleProgramExpansion = async (programId: number) => {
    const newExpanded = new Set(expandedPrograms);
    if (newExpanded.has(programId)) {
      newExpanded.delete(programId);
    } else {
      newExpanded.add(programId);
      // Fetch workouts for this program if not already loaded
      if (!programWorkouts[programId]) {
        try {
          const workouts = await apiRequest("GET", `/api/admin/programs/${programId}/workouts`);
          console.log("Fetched workouts for program", programId, ":", workouts);
          // Ensure workouts is an array and handle various response formats
          let workoutArray = [];
          if (Array.isArray(workouts)) {
            workoutArray = workouts;
          } else if (workouts && Array.isArray(workouts.data)) {
            workoutArray = workouts.data;
          } else if (workouts && typeof workouts === 'object') {
            // If it's an object, try to extract array from common properties
            workoutArray = workouts.workouts || [];
          }
          setProgramWorkouts(prev => ({ ...prev, [programId]: workoutArray }));
        } catch (error) {
          console.error("Failed to fetch workouts:", error);
          setProgramWorkouts(prev => ({ ...prev, [programId]: [] }));
          toast({
            title: "Error",
            description: "Failed to load workouts for this program",
            variant: "destructive"
          });
        }
      }
    }
    setExpandedPrograms(newExpanded);
  };

  const makeUserAdmin = (userId: string) => {
    updateUserMutation.mutate({ id: userId, isAdmin: true });
  };

  const removeAdmin = (userId: string) => {
    updateUserMutation.mutate({ id: userId, isAdmin: false });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black text-white rounded flex items-center justify-center font-bold text-sm">
              HX
            </div>
            <h1 className="text-xl font-semibold">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Admin
            </div>
            <Button variant="outline" size="sm" onClick={() => setLocation("/")}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab("programs")}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "programs" 
                ? "border-yellow-500 text-yellow-600 bg-yellow-50" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Database className="w-4 h-4" />
            Programs
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "users" 
                ? "border-yellow-500 text-yellow-600 bg-yellow-50" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Users className="w-4 h-4" />
            Users
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "programs" && (
          <div className="space-y-4">
            {/* Training Programs Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Training Programs</h2>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => setUploadModalOpen(true)}
                >
                  <Upload className="w-4 h-4" />
                  Upload CSV/XLSX
                </Button>
                <Button className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-black">
                  <Plus className="w-4 h-4" />
                  Add Program
                </Button>
              </div>
            </div>

            {/* Programs List */}
            <div className="space-y-3">
              {programsLoading ? (
                <div className="text-center py-8">Loading programs...</div>
              ) : (
                (programs as any[]).map((program: any) => (
                  <Card key={program.id} className="overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <button
                            onClick={() => toggleProgramExpansion(program.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {expandedPrograms.has(program.id) ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                          </button>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{program.name}</h3>
                            {expandedPrograms.has(program.id) && (
                              <p className="text-gray-600 mt-1 text-sm">{program.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Button variant="outline" size="sm" className="gap-1">
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-1"
                            onClick={() => setEditingProgram(program)}
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-1"
                            onClick={() => deleteProgramMutation.mutate(program.id)}
                            disabled={deleteProgramMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Program Details */}
                      <div className="flex gap-4 mt-3 text-sm">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {program.difficulty}
                        </Badge>
                        <span className="text-gray-600">{program.duration || 12} weeks</span>
                        <span className="text-gray-600">{program.frequency || 4}x/week</span>
                        <span className="text-gray-600">{program.category || "Hyrox"}</span>
                        <span className="text-gray-600">Workouts: {program.workoutCount || 0}</span>
                      </div>

                      {/* Expanded Workouts View */}
                      {expandedPrograms.has(program.id) && (
                        <div className="mt-4 border-t pt-4">
                          <h4 className="font-medium text-gray-900 mb-3">Program Workouts</h4>
                          {programWorkouts[program.id] && Array.isArray(programWorkouts[program.id]) && programWorkouts[program.id].length > 0 ? (
                            <div className="space-y-2">
                              {programWorkouts[program.id].map((workout: any) => (
                                <div key={workout.id} className="bg-gray-50 rounded-lg p-3">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">Week {workout.week}, Day {workout.day}</span>
                                        <span className="text-gray-600 text-sm">•</span>
                                        <span className="text-gray-900 font-medium">{workout.name}</span>
                                      </div>
                                      {workout.description && (
                                        <p className="text-gray-600 text-sm mt-1 line-clamp-2">{workout.description}</p>
                                      )}
                                      <div className="flex gap-3 mt-2 text-xs text-gray-500">
                                        <span>{workout.estimatedDuration || 60}min</span>
                                        <span>•</span>
                                        <span>{Array.isArray(workout.exercises) ? workout.exercises.length : 0} exercises</span>
                                      </div>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                        <Edit3 className="w-3 h-3" />
                                      </Button>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-700">
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : programWorkouts[program.id] && Array.isArray(programWorkouts[program.id]) && programWorkouts[program.id].length === 0 ? (
                            <div className="text-center py-4 text-gray-500">
                              <p className="text-sm">No workouts found for this program</p>
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500">
                              <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                              Loading workouts...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">User Management</h2>
            
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-600">User</th>
                        <th className="text-left p-4 font-medium text-gray-600">Email</th>
                        <th className="text-left p-4 font-medium text-gray-600">Admin</th>
                        <th className="text-left p-4 font-medium text-gray-600">Program</th>
                        <th className="text-left p-4 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersLoading ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8">Loading users...</td>
                        </tr>
                      ) : (
                        (users as any[]).map((user: any) => (
                          <tr key={user.id} className="border-b hover:bg-gray-50">
                            <td className="p-4">
                              <div>
                                <div className="font-medium">
                                  {user.firstName} {user.lastName}
                                  {user.isAdmin && <Crown className="inline w-4 h-4 ml-1 text-yellow-500" />}
                                </div>
                                <div className="text-sm text-gray-500">
                                  ID: {user.id?.slice(0, 8)}
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-gray-600">{user.email}</td>
                            <td className="p-4">
                              {user.isAdmin ? (
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                  Admin
                                </Badge>
                              ) : (
                                <Badge variant="outline">User</Badge>
                              )}
                            </td>
                            <td className="p-4 text-gray-600">
                              {user.currentProgramId ? `Program ${user.currentProgramId}` : "None"}
                            </td>
                            <td className="p-4">
                              {user.isAdmin ? (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => removeAdmin(user.id)}
                                  disabled={updateUserMutation.isPending}
                                >
                                  Remove Admin
                                </Button>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => makeUserAdmin(user.id)}
                                  disabled={updateUserMutation.isPending}
                                >
                                  Make Admin
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Upload Program from CSV/XLSX</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setUploadModalOpen(false)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="programName">Program Name</Label>
                <Input
                  id="programName"
                  placeholder="e.g., Advanced Hyrox Program"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({...uploadForm, name: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Detailed program description..."
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select value={uploadForm.difficulty} onValueChange={(value) => setUploadForm({...uploadForm, difficulty: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={uploadForm.category} onValueChange={(value) => setUploadForm({...uploadForm, category: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hyrox">Hyrox</SelectItem>
                      <SelectItem value="Strength">Strength</SelectItem>
                      <SelectItem value="Cardio">Cardio</SelectItem>
                      <SelectItem value="Mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Duration (weeks)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={uploadForm.duration}
                    onChange={(e) => setUploadForm({...uploadForm, duration: parseInt(e.target.value) || 12})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="frequency">Frequency (days/week)</Label>
                  <Input
                    id="frequency"
                    type="number"
                    value={uploadForm.frequency}
                    onChange={(e) => setUploadForm({...uploadForm, frequency: parseInt(e.target.value) || 4})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="csvFile">CSV/XLSX File</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileUpload}
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload CSV or XLSX file with columns: week, day, name, description, duration, exercises
                </p>
              </div>

              <Button 
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                disabled={uploadProgramMutation.isPending || !uploadForm.name}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Program
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Program Dialog */}
      {editingProgram && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Program</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Program Name</Label>
                <Input
                  id="edit-name"
                  defaultValue={editingProgram.name}
                  onChange={(e) => setEditingProgram({...editingProgram, name: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  defaultValue={editingProgram.description}
                  onChange={(e) => setEditingProgram({...editingProgram, description: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-difficulty">Difficulty</Label>
                  <Select value={editingProgram.difficulty} onValueChange={(value) => setEditingProgram({...editingProgram, difficulty: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="edit-category">Category</Label>
                  <Select value={editingProgram.category} onValueChange={(value) => setEditingProgram({...editingProgram, category: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hyrox">Hyrox</SelectItem>
                      <SelectItem value="CrossFit">CrossFit</SelectItem>
                      <SelectItem value="Running">Running</SelectItem>
                      <SelectItem value="Strength">Strength</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-duration">Duration (weeks)</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    defaultValue={editingProgram.duration}
                    onChange={(e) => setEditingProgram({...editingProgram, duration: parseInt(e.target.value) || 12})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-frequency">Frequency (days/week)</Label>
                  <Input
                    id="edit-frequency"
                    type="number"
                    defaultValue={editingProgram.frequency}
                    onChange={(e) => setEditingProgram({...editingProgram, frequency: parseInt(e.target.value) || 4})}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setEditingProgram(null)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => updateProgramMutation.mutate(editingProgram)}
                disabled={updateProgramMutation.isPending}
              >
                {updateProgramMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Spacer */}
      <div className="h-20"></div>
    </div>
  );
}