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
import type { User, Program, Workout } from "@shared/schema";
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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState(false);
  const [expandedPrograms, setExpandedPrograms] = useState<Set<number>>(new Set());
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [editWorkoutOpen, setEditWorkoutOpen] = useState(false);
  const [programWorkouts, setProgramWorkouts] = useState<{[key: number]: Workout[]}>({});
  const [createPromoOpen, setCreatePromoOpen] = useState(false);
  const [editingPromoCode, setEditingPromoCode] = useState<any>(null);
  const [promoForm, setPromoForm] = useState({
    code: "",
    name: "",
    description: "",
    freeMonths: 1,
    maxUses: "",
    expiresAt: "",
  });
  const [uploadForm, setUploadForm] = useState({
    name: "",
    description: "",
    difficulty: "Beginner",
    category: "Hyrox",
    duration: 12,
    frequency: 4,
    racecategory: "Singles"
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

  const { data: promoCodes, isLoading: promoCodesLoading } = useQuery({
    queryKey: ['admin-promo-codes'],
    queryFn: async () => {
      const response = await fetch('/api/admin/promo-codes', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch promo codes');
      return response.json();
    },
    enabled: user?.isAdmin
  });

  // Mutations
  const updateUserMutation = useMutation({
    mutationFn: async (userData: { id: string; isAdmin: boolean }) => {
      return apiRequest("PATCH", `/api/admin/users/${userData.id}`, { isAdmin: userData.isAdmin });
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
        frequency: 4,
        racecategory: "Singles"
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

  const updateWorkoutMutation = useMutation({
    mutationFn: async (workoutData: { id: number; [key: string]: any }) => {
      return apiRequest("PUT", `/api/admin/workouts/${workoutData.id}`, workoutData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      // Refresh the specific program's workouts
      const programId = editingWorkout?.programId;
      if (programId) {
        fetchProgramWorkouts(programId);
      }
      setEditingWorkout(null);
      setEditWorkoutOpen(false);
      toast({
        title: "Success",
        description: "Workout updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update workout",
        variant: "destructive",
      });
    }
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: async (workoutId: number) => {
      return apiRequest("DELETE", `/api/admin/workouts/${workoutId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      // Refresh all expanded program workouts
      expandedPrograms.forEach(programId => {
        fetchProgramWorkouts(programId);
      });
      toast({
        title: "Success",
        description: "Workout deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete workout",
        variant: "destructive",
      });
    }
  });

    // Create promo code mutation
    const createPromoCodeMutation = useMutation({
      mutationFn: async (promoData: any) => {
        const response = await fetch('/api/admin/promo-codes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(promoData)
        });
        if (!response.ok) throw new Error('Failed to create promo code');
        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
        setCreatePromoOpen(false);
        setPromoForm({
          code: '',
          name: '',
          description: '',
          freeMonths: 1,
          maxUses: '',
          expiresAt: ''
        });
        toast({ title: "Success", description: "Promo code created successfully" });
      },
      onError: (error: any) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    });
  
    // Update promo code mutation
    const updatePromoCodeMutation = useMutation({
      mutationFn: async ({ id, ...data }: any) => {
        const response = await fetch(`/api/admin/promo-codes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update promo code');
        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
        setEditingPromoCode(null);
        toast({ title: "Success", description: "Promo code updated successfully" });
      },
      onError: (error: any) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    });
  
    // Delete promo code mutation
    const deletePromoCodeMutation = useMutation({
      mutationFn: async (id: number) => {
        const response = await fetch(`/api/admin/promo-codes/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to delete promo code');
        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
        toast({ title: "Success", description: "Promo code deleted successfully" });
      },
      onError: (error: any) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
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
    formData.append("racecategory", uploadForm.racecategory);

    uploadProgramMutation.mutate(formData);
  };

  const fetchProgramWorkouts = async (programId: number) => {
    try {
      console.log("Fetching workouts for program:", programId);
      const response = await apiRequest("GET", `/api/admin/programs/${programId}/workouts`);

      console.log("API response:", response);

      // Ensure workouts is an array
      let workoutArray = [];
      if (Array.isArray(response)) {
        workoutArray = response;
      } else if (response && response.workouts && Array.isArray(response.workouts)) {
        workoutArray = response.workouts;
      } else if (response && typeof response === 'object') {
        // Handle case where response might be a single workout object
        workoutArray = [response];
      }

      console.log("Final workout array for program", programId, ":", workoutArray);
      console.log("Workout count:", workoutArray.length);

      setProgramWorkouts(prev => ({ ...prev, [programId]: workoutArray }));
    } catch (error) {
      console.error("Failed to fetch workouts for program", programId, ":", error);
      setProgramWorkouts(prev => ({ ...prev, [programId]: [] }));
      toast({
        title: "Error",
        description: `Failed to load workouts for program ${programId}: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const toggleProgramExpansion = async (programId: number) => {
    const newExpanded = new Set(expandedPrograms);
    if (newExpanded.has(programId)) {
      newExpanded.delete(programId);
    } else {
      newExpanded.add(programId);
      // Fetch workouts for this program if not already loaded
      if (!programWorkouts[programId]) {
        await fetchProgramWorkouts(programId);
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
              Back to App
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 relative">
        <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
          {/* Visual scroll indicator */}
          <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white to-transparent pointer-events-none z-10"></div>
          <button
            onClick={() => setActiveTab("programs")}
            className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === "programs" 
                ? "border-yellow-500 text-yellow-600 bg-yellow-50" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Database className="w-4 h-4 flex-shrink-0" />
            <span>Programs</span>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === "users" 
                ? "border-yellow-500 text-yellow-600 bg-yellow-50" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Users className="w-4 h-4 flex-shrink-0" />
            <span>Users</span>
          </button>
          <button
            onClick={() => setActiveTab("promo-codes")}
            className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === "promo-codes" 
                ? "border-yellow-500 text-yellow-600 bg-yellow-50" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Crown className="w-4 h-4 flex-shrink-0" />
            <span>Promo Codes</span>
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
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-medium text-gray-900">Program Workouts</h4>
                            <Button 
                              size="sm" 
                              onClick={() => fetchProgramWorkouts(program.id)}
                              className="flex items-center gap-1 text-xs"
                            >
                              Refresh
                            </Button>
                          </div>
                          {programWorkouts[program.id] !== undefined ? (
                            Array.isArray(programWorkouts[program.id]) && programWorkouts[program.id].length > 0 ? (
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {programWorkouts[program.id]
                                  .sort((a: any, b: any) => a.week - b.week || a.day - b.day)
                                  .map((workout: any) => (
                                  <div key={workout.id} className="bg-gray-50 rounded-lg p-3 border">
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Badge variant="secondary" className="text-xs">
                                            W{workout.week}D{workout.day}
                                          </Badge>
                                          <span className="text-gray-900 font-medium text-sm">{workout.name}</span>
                                        </div>
                                        {workout.description && (
                                          <p className="text-gray-600 text-xs mt-1 line-clamp-2">{workout.description}</p>
                                        )}
                                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                                          <span className="flex items-center gap-1">
                                            ⏱️ {workout.duration || workout.estimatedDuration || 60}min
                                          </span>
                                          <span>•</span>
                                          <span className="flex items-center gap-1">
                                            💪 {(() => {
                                              if (Array.isArray(workout.exercises)) {
                                                return workout.exercises.length;
                                              } else if (typeof workout.exercises === 'string') {
                                                try {
                                                  const parsed = JSON.parse(workout.exercises);
                                                  return Array.isArray(parsed) ? parsed.length : 1;
                                                } catch {
                                                  return workout.exercises ? 1 : 0;
                                                }
                                              } else {
                                                return workout.exercises ? 1 : 0;
                                              }
                                            })()} exercises
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex gap-1 ml-2">
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-6 w-6 p-0"
                                          onClick={() => {
                                            setEditingWorkout(workout);
                                            setEditWorkoutOpen(true);
                                          }}
                                          title="Edit Workout"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                          onClick={() => {
                                            if (confirm("Are you sure you want to delete this workout?")) {
                                              deleteWorkoutMutation.mutate(workout.id);
                                            }
                                          }}
                                          title="Delete Workout"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-gray-500">
                                <p className="text-sm">No workouts found for this program</p>
                                <p className="text-xs mt-1">Upload a CSV file or manually add workouts to get started</p>
                              </div>
                            )
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

        {activeTab === "promo-codes" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Promo Code Management</h2>
              <Button 
                className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-black"
                onClick={() => setCreatePromoOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Create Promo Code
              </Button>
            </div>

            <div className="space-y-3">
              {promoCodesLoading ? (
                <div className="text-center py-8">Loading promo codes...</div>
              ) : (
                (promoCodes as any[]).map((promoCode: any) => (
                  <Card key={promoCode.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                              {promoCode.code}
                            </Badge>
                            <span className="font-semibold">{promoCode.name}</span>
                            {!promoCode.isActive && (
                              <Badge variant="secondary" className="text-red-600 bg-red-50 border-red-200">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          {promoCode.description && (
                            <p className="text-gray-600 text-sm mb-2">{promoCode.description}</p>
                          )}
                          <div className="flex gap-4 text-sm text-gray-500">
                            <span>💳 {promoCode.freeMonths} free months</span>
                            <span>📊 {promoCode.usesCount} uses</span>
                            {promoCode.maxUses && (
                              <span>📈 {promoCode.maxUses} max uses</span>
                            )}
                            {promoCode.expiresAt && (
                              <span>⏰ Expires {new Date(promoCode.expiresAt).toLocaleDateString()}</span>
                            )}
                          </div>

                          {promoCode.uses && promoCode.uses.length > 0 && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <h4 className="font-medium text-sm mb-2">Recent Usage</h4>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {promoCode.uses.slice(0, 5).map((use: any, index: number) => (
                                  <div key={index} className="text-xs text-gray-600 flex justify-between">
                                    <span>User: {use.userId.slice(0, 8)}...</span>
                                    <span>{new Date(use.usedAt).toLocaleDateString()}</span>
                                  </div>
                                ))}
                                {promoCode.uses.length > 5 && (
                                  <div className="text-xs text-gray-500">
                                    +{promoCode.uses.length - 5} more uses
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingPromoCode(promoCode)}
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this promo code?")) {
                                deletePromoCodeMutation.mutate(promoCode.id);
                              }
                            }}
                            disabled={deletePromoCodeMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
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
                      <SelectItem value="Running">Running</SelectItem>
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
                <Label htmlFor="racecategory">Race Category</Label>
                <Select value={uploadForm.racecategory} onValueChange={(value) => setUploadForm({...uploadForm, racecategory: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Singles">Singles</SelectItem>
                    <SelectItem value="Doubles/Relay">Doubles/Relay</SelectItem>
                  </SelectContent>
                </Select>
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
                  defaultValue={editingProgram.name || ""}
                  onChange={(e) => setEditingProgram({...editingProgram, name: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  defaultValue={editingProgram.description || ""}
                  onChange={(e) => setEditingProgram({...editingProgram, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-difficulty">Difficulty</Label>
                  <Select value={editingProgram.difficulty || "Beginner"} onValueChange={(value) => setEditingProgram({...editingProgram, difficulty: value})}>
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
                  <Select value={editingProgram.category || "Hyrox"} onValueChange={(value) => setEditingProgram({...editingProgram, category: value})}>
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
                    defaultValue={editingProgram.duration || 12}
                    onChange={(e) => setEditingProgram({...editingProgram, duration: parseInt(e.target.value) || 12})}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-frequency">Frequency (days/week)</Label>
                  <Input
                    id="edit-frequency"
                    type="number"
                    defaultValue={editingProgram.frequency || 4}
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

      {/* Create Promo Code Modal */}
      {createPromoOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Create Promo Code</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setCreatePromoOpen(false)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="promoCode">Promo Code</Label>
                <Input
                  id="promoCode"
                  placeholder="e.g., TRIAL30"
                  value={promoForm.code}
                  onChange={(e) => setPromoForm({...promoForm, code: e.target.value.toUpperCase()})}
                  className="uppercase"
                />
              </div>

              <div>
                <Label htmlFor="promoName">Display Name</Label>
                <Input
                  id="promoName"
                  placeholder="e.g., 30-Day Trial"
                  value={promoForm.name}
                  onChange={(e) => setPromoForm({...promoForm, name: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="promoDescription">Description (Optional)</Label>
                <Textarea
                  id="promoDescription"
                  placeholder="Brief description of this promo code..."
                  value={promoForm.description}
                  onChange={(e) => setPromoForm({...promoForm, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="freeMonths">Free Months</Label>
                  <Input
                    id="freeMonths"
                    type="number"
                    min="1"
                    value={promoForm.freeMonths}
                    onChange={(e) => setPromoForm({...promoForm, freeMonths: parseInt(e.target.value) || 1})}
                  />
                </div>

                <div>
                  <Label htmlFor="maxUses">Max Uses (Optional)</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={promoForm.maxUses}
                    onChange={(e) => setPromoForm({...promoForm, maxUses: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={promoForm.expiresAt}
                  onChange={(e) => setPromoForm({...promoForm, expiresAt: e.target.value})}
                />
              </div>

              <Button 
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                disabled={createPromoCodeMutation.isPending || !promoForm.code || !promoForm.name}
                onClick={() => createPromoCodeMutation.mutate({
                  ...promoForm,
                  maxUses: promoForm.maxUses ? parseInt(promoForm.maxUses) : null,
                  expiresAt: promoForm.expiresAt || null
                })}
              >
                {createPromoCodeMutation.isPending ? "Creating..." : "Create Promo Code"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Promo Code Modal */}
      {editingPromoCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Edit Promo Code</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setEditingPromoCode(null)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="editPromoCode">Promo Code</Label>
                <Input
                  id="editPromoCode"
                  value={editingPromoCode.code}
                  onChange={(e) => setEditingPromoCode({...editingPromoCode, code: e.target.value.toUpperCase()})}
                  className="uppercase"
                />
              </div>

              <div>
                <Label htmlFor="editPromoName">Display Name</Label>
                <Input
                  id="editPromoName"
                  value={editingPromoCode.name}
                  onChange={(e) => setEditingPromoCode({...editingPromoCode, name: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="editPromoDescription">Description</Label>
                <Textarea
                  id="editPromoDescription"
                  value={editingPromoCode.description || ""}
                  onChange={(e) => setEditingPromoCode({...editingPromoCode, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editFreeMonths">Free Months</Label>
                  <Input
                    id="editFreeMonths"
                    type="number"
                    min="1"
                    value={editingPromoCode.freeMonths}
                    onChange={(e) => setEditingPromoCode({...editingPromoCode, freeMonths: parseInt(e.target.value) || 1})}
                  />
                </div>

                <div>
                  <Label htmlFor="editMaxUses">Max Uses</Label>
                  <Input
                    id="editMaxUses"
                    type="number"
                    min="1"
                    value={editingPromoCode.maxUses || ""}
                    onChange={(e) => setEditingPromoCode({...editingPromoCode, maxUses: e.target.value ? parseInt(e.target.value) : null})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="editExpiresAt">Expires At</Label>
                <Input
                  id="editExpiresAt"
                  type="datetime-local"
                  value={editingPromoCode.expiresAt ? new Date(editingPromoCode.expiresAt).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setEditingPromoCode({...editingPromoCode, expiresAt: e.target.value || null})}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingPromoCode.isActive}
                  onChange={(e) => setEditingPromoCode({...editingPromoCode, isActive: e.target.checked})}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={updatePromoCodeMutation.isPending}
                onClick={() => updatePromoCodeMutation.mutate(editingPromoCode)}
              >
                {updatePromoCodeMutation.isPending ? "Updating..." : "Update Promo Code"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Workout Dialog */}
      {editingWorkout && editWorkoutOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Workout</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-workout-week">Week</Label>
                  <Input
                    id="edit-workout-week"
                    type="number"
                    min="1"
                    defaultValue={editingWorkout.week || 1}
                    onChange={(e) => setEditingWorkout({...editingWorkout, week: parseInt(e.target.value) || 1})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-workout-day">Day</Label>
                  <Input
                    id="edit-workout-day"
                    type="number"
                    min="1"
                    max="7"
                    defaultValue={editingWorkout.day || 1}
                    onChange={(e) => setEditingWorkout({...editingWorkout, day: parseInt(e.target.value) || 1})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-workout-name">Workout Name</Label>
                <Input
                  id="edit-workout-name"
                  defaultValue={editingWorkout.name || ""}
                  onChange={(e) => setEditingWorkout({...editingWorkout, name: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="edit-workout-description">Description</Label>
                <Textarea
                  id="edit-workout-description"
                  rows={4}
                  defaultValue={editingWorkout.description || ""}
                  onChange={(e) => setEditingWorkout({...editingWorkout, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-workout-duration">Duration (minutes)</Label>
                  <Input
                    id="edit-workout-duration"
                    type="number"
                    min="1"
                    defaultValue={editingWorkout.duration || editingWorkout.estimatedDuration || 60}
                    onChange={(e) => setEditingWorkout({...editingWorkout, duration: parseInt(e.target.value) || 60})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-workout-type">Workout Type</Label>
                  <Select 
                    value={editingWorkout.workoutType || "Training"} 
                    onValueChange={(value) => setEditingWorkout({...editingWorkout, workoutType: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Training">Training</SelectItem>
                      <SelectItem value="Recovery">Recovery</SelectItem>
                      <SelectItem value="Testing">Testing</SelectItem>
                      <SelectItem value="Competition">Competition</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-workout-exercises">Exercises (JSON format)</Label>
                <Textarea
                  id="edit-workout-exercises"
                  rows={6}
                  placeholder='[{"name": "Exercise Name", "sets": "3", "reps": "10", "weight": "20kg"}]'
                  defaultValue={typeof editingWorkout.exercises === 'string' ? editingWorkout.exercises : JSON.stringify(editingWorkout.exercises || [], null, 2)}
                  onChange={(e) => {
                    try {
                      const exercises = JSON.parse(e.target.value);
                      setEditingWorkout({...editingWorkout, exercises: exercises});
                    } catch {
                      // Keep the string value for now, validation will happen on save
                      setEditingWorkout({...editingWorkout, exercises: e.target.value});
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter exercises as a JSON array. Each exercise should have name, sets, reps, and optional weight fields.
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setEditingWorkout(null);
                  setEditWorkoutOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  // Validate exercises JSON if it's a string
                  let exercisesToSave = editingWorkout.exercises;
                  if (typeof editingWorkout.exercises === 'string') {
                    try {
                      exercisesToSave = JSON.parse(editingWorkout.exercises);
                    } catch {
                      toast({
                        title: "Invalid JSON",
                        description: "Please enter valid JSON for exercises",
                        variant: "destructive"
                      });
                      return;
                    }
                  }

                  updateWorkoutMutation.mutate({
                    ...editingWorkout,
                    exercises: exercisesToSave
                  });
                }}
                disabled={updateWorkoutMutation.isPending}
              >
                {updateWorkoutMutation.isPending ? "Saving..." : "Save Changes"}
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