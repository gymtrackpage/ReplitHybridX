import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Dumbbell, 
  Calendar,
  Save,
  X,
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Target,
  Activity
} from "lucide-react";

interface Program {
  id: number;
  name: string;
  description: string;
  difficulty: string;
  duration: number;
  frequency: number;
  category: string;
  workouts?: Workout[];
}

interface Workout {
  id: number;
  programId: number;
  name: string;
  description: string;
  week: number;
  day: number;
  duration: number;
  exercises: any[];
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  currentProgramId: number;
  createdAt: string;
}

export default function AdminPanel() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateProgramOpen, setIsCreateProgramOpen] = useState(false);
  const [isEditProgramOpen, setIsEditProgramOpen] = useState(false);
  const [isCreateWorkoutOpen, setIsCreateWorkoutOpen] = useState(false);
  const [isEditWorkoutOpen, setIsEditWorkoutOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [expandedPrograms, setExpandedPrograms] = useState<Set<number>>(new Set());

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !user?.isAdmin)) {
      toast({
        title: "Access Denied",
        description: "Admin access required",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  }, [isAuthenticated, authLoading, user, toast]);

  // Fetch admin data
  const { data: programs, isLoading: programsLoading } = useQuery({
    queryKey: ["/api/admin/programs"],
    enabled: isAuthenticated && user?.isAdmin,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && user?.isAdmin,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Program mutations
  const createProgramMutation = useMutation({
    mutationFn: async (programData: any) => {
      return await apiRequest("POST", "/api/admin/programs", programData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      setIsCreateProgramOpen(false);
      toast({ title: "Success", description: "Program created successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Admin access required",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create program",
        variant: "destructive",
      });
    },
  });

  const updateProgramMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest("PUT", `/api/admin/programs/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      setIsEditProgramOpen(false);
      setSelectedProgram(null);
      toast({ title: "Success", description: "Program updated successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Admin access required",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update program",
        variant: "destructive",
      });
    },
  });

  const deleteProgramMutation = useMutation({
    mutationFn: async (programId: number) => {
      return await apiRequest("DELETE", `/api/admin/programs/${programId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      toast({ title: "Success", description: "Program deleted successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Admin access required",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete program",
        variant: "destructive",
      });
    },
  });

  // User admin mutations
  const updateUserAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      return await apiRequest("POST", `/api/admin/users/${userId}/admin`, { isAdmin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "User admin status updated" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Admin access required",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update user admin status",
        variant: "destructive",
      });
    },
  });

  // Workout mutations
  const createWorkoutMutation = useMutation({
    mutationFn: async ({ programId, ...workoutData }: any) => {
      return await apiRequest("POST", `/api/admin/programs/${programId}/workouts`, workoutData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      setIsCreateWorkoutOpen(false);
      setSelectedProgram(null);
      toast({ title: "Success", description: "Workout created successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Admin access required",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create workout",
        variant: "destructive",
      });
    },
  });

  const updateWorkoutMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest("PUT", `/api/admin/workouts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      setIsEditWorkoutOpen(false);
      setSelectedWorkout(null);
      toast({ title: "Success", description: "Workout updated successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Admin access required",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update workout",
        variant: "destructive",
      });
    },
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: async (workoutId: number) => {
      return await apiRequest("DELETE", `/api/admin/workouts/${workoutId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      toast({ title: "Success", description: "Workout deleted successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Admin access required",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete workout",
        variant: "destructive",
      });
    },
  });

  const toggleProgramExpansion = (programId: number) => {
    setExpandedPrograms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(programId)) {
        newSet.delete(programId);
      } else {
        newSet.add(programId);
      }
      return newSet;
    });
  };

  if (authLoading || !isAuthenticated || !user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header title="Admin Panel" />

      <main className="px-4 py-6">
        <Tabs defaultValue="programs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="programs" className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              Programs
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
          </TabsList>

          {/* Programs Tab */}
          <TabsContent value="programs" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Training Programs</h2>
              <Dialog open={isCreateProgramOpen} onOpenChange={setIsCreateProgramOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Program
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Program</DialogTitle>
                  </DialogHeader>
                  <ProgramForm
                    onSubmit={(data) => createProgramMutation.mutate(data)}
                    isLoading={createProgramMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            </div>

            {programsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="grid gap-4">
                {programs?.map((program: Program) => {
                  const isExpanded = expandedPrograms.has(program.id);
                  return (
                    <Card key={program.id} className="bg-white">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleProgramExpansion(program.id)}
                                className="p-0 h-auto"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                              <CardTitle className="text-lg">{program.name}</CardTitle>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 ml-6">{program.description}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProgram(program);
                                setIsCreateWorkoutOpen(true);
                              }}
                              title="Add Workout"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProgram(program);
                                setIsEditProgramOpen(true);
                              }}
                              title="Edit Program"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this program and all its workouts?")) {
                                  deleteProgramMutation.mutate(program.id);
                                }
                              }}
                              title="Delete Program"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-4 text-sm text-gray-600 mb-4">
                          <Badge variant="outline">{program.difficulty}</Badge>
                          <span>{program.duration} weeks</span>
                          <span>{program.frequency}x/week</span>
                          <span>{program.category}</span>
                          <span>Workouts: {program.workouts?.length || 0}</span>
                        </div>

                        {/* Expanded Workout List */}
                        {isExpanded && (
                          <div className="mt-4 border-t pt-4">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-medium text-gray-900">Workouts</h4>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedProgram(program);
                                  setIsCreateWorkoutOpen(true);
                                }}
                                className="flex items-center gap-1"
                              >
                                <Plus className="h-3 w-3" />
                                Add Workout
                              </Button>
                            </div>
                            
                            {program.workouts && program.workouts.length > 0 ? (
                              <div className="space-y-2">
                                {program.workouts
                                  .sort((a, b) => a.week - b.week || a.day - b.day)
                                  .map((workout) => (
                                    <div
                                      key={workout.id}
                                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                          <Badge variant="secondary" className="text-xs">
                                            W{workout.week}D{workout.day}
                                          </Badge>
                                          <span className="font-medium text-sm">{workout.name}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                          {workout.description}
                                        </p>
                                        <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                          <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {workout.duration}min
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <Activity className="h-3 w-3" />
                                            {workout.exercises?.length || 0} exercises
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedWorkout(workout);
                                            setIsEditWorkoutOpen(true);
                                          }}
                                          className="h-8 w-8 p-0"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            if (confirm("Are you sure you want to delete this workout?")) {
                                              deleteWorkoutMutation.mutate(workout.id);
                                            }
                                          }}
                                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-gray-500 text-sm">
                                No workouts in this program yet
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
            
            {usersLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <Card className="bg-white">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Program</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users?.map((user: User) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {user.id}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {user.isAdmin ? (
                              <Badge variant="default">Admin</Badge>
                            ) : (
                              <Badge variant="outline">User</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.currentProgramId ? (
                              <span className="text-sm">Program {user.currentProgramId}</span>
                            ) : (
                              <span className="text-sm text-gray-500">None</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                updateUserAdminMutation.mutate({
                                  userId: user.id,
                                  isAdmin: !user.isAdmin
                                });
                              }}
                              disabled={updateUserAdminMutation.isPending}
                            >
                              {user.isAdmin ? "Remove Admin" : "Make Admin"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Program Dialog */}
        <Dialog open={isEditProgramOpen} onOpenChange={setIsEditProgramOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Program</DialogTitle>
            </DialogHeader>
            {selectedProgram && (
              <ProgramForm
                initialData={selectedProgram}
                onSubmit={(data) => updateProgramMutation.mutate({ id: selectedProgram.id, ...data })}
                isLoading={updateProgramMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Create Workout Dialog */}
        <Dialog open={isCreateWorkoutOpen} onOpenChange={setIsCreateWorkoutOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Add Workout to {selectedProgram?.name}
              </DialogTitle>
            </DialogHeader>
            {selectedProgram && (
              <WorkoutForm
                programId={selectedProgram.id}
                onSubmit={(data) => createWorkoutMutation.mutate({ programId: selectedProgram.id, ...data })}
                isLoading={createWorkoutMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Workout Dialog */}
        <Dialog open={isEditWorkoutOpen} onOpenChange={setIsEditWorkoutOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Workout</DialogTitle>
            </DialogHeader>
            {selectedWorkout && (
              <WorkoutForm
                initialData={selectedWorkout}
                onSubmit={(data) => updateWorkoutMutation.mutate({ id: selectedWorkout.id, ...data })}
                isLoading={updateWorkoutMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>

      {/* Bottom spacing */}
      <div className="h-16"></div>
      <BottomNav />
    </div>
  );
}

interface ProgramFormProps {
  initialData?: Program;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function ProgramForm({ initialData, onSubmit, isLoading }: ProgramFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    difficulty: initialData?.difficulty || "beginner",
    duration: initialData?.duration || 12,
    frequency: initialData?.frequency || 4,
    category: initialData?.category || "strength"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Program Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="difficulty">Difficulty</Label>
        <Select value={formData.difficulty} onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="duration">Duration (weeks)</Label>
          <Input
            id="duration"
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="frequency">Frequency (per week)</Label>
          <Input
            id="frequency"
            type="number"
            value={formData.frequency}
            onChange={(e) => setFormData(prev => ({ ...prev, frequency: parseInt(e.target.value) }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="strength">Strength</SelectItem>
            <SelectItem value="endurance">Endurance</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
            <SelectItem value="prep">Prep</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading} className="flex-1">
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? "Saving..." : "Save Program"}
        </Button>
      </div>
    </form>
  );
}

interface WorkoutFormProps {
  initialData?: Workout;
  programId?: number;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function WorkoutForm({ initialData, programId, onSubmit, isLoading }: WorkoutFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    week: initialData?.week || 1,
    day: initialData?.day || 1,
    duration: initialData?.duration || 45,
    exercises: initialData?.exercises || []
  });

  const [exerciseText, setExerciseText] = useState(
    initialData?.exercises ? JSON.stringify(initialData.exercises, null, 2) : '[]'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let exercises = [];
    try {
      exercises = JSON.parse(exerciseText);
    } catch (error) {
      // If JSON parsing fails, create a simple exercise array from the text
      exercises = [{ name: exerciseText, sets: 3, reps: 10 }];
    }
    
    onSubmit({
      ...formData,
      exercises,
      programId
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="workoutName">Workout Name</Label>
        <Input
          id="workoutName"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Upper Body Strength"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="workoutDescription">Description</Label>
        <Textarea
          id="workoutDescription"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Detailed workout description..."
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="week">Week</Label>
          <Input
            id="week"
            type="number"
            min="1"
            max="52"
            value={formData.week}
            onChange={(e) => setFormData(prev => ({ ...prev, week: parseInt(e.target.value) }))}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="day">Day</Label>
          <Input
            id="day"
            type="number"
            min="1"
            max="7"
            value={formData.day}
            onChange={(e) => setFormData(prev => ({ ...prev, day: parseInt(e.target.value) }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="workoutDuration">Duration (min)</Label>
          <Input
            id="workoutDuration"
            type="number"
            min="15"
            max="180"
            value={formData.duration}
            onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="exercises">Exercises (JSON format)</Label>
        <Textarea
          id="exercises"
          value={exerciseText}
          onChange={(e) => setExerciseText(e.target.value)}
          placeholder={`Example:
[
  {
    "name": "Push-ups",
    "sets": 3,
    "reps": 12,
    "weight": "bodyweight"
  },
  {
    "name": "Squats", 
    "sets": 4,
    "reps": 15,
    "duration": "60s rest"
  }
]`}
          rows={8}
          className="font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Enter exercises as JSON array or simple text. Invalid JSON will be converted to a single exercise.
        </p>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading} className="flex-1">
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? "Saving..." : "Save Workout"}
        </Button>
      </div>
    </form>
  );
}