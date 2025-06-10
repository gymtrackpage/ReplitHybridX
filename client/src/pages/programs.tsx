import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, Target, CheckCircle } from "lucide-react";
import { Link } from "wouter";

interface Program {
  id: number;
  name: string;
  description: string;
  difficulty: string;
  duration: number;
  frequency: number;
  category: string;
}

export default function Programs() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [isChangeProgramOpen, setIsChangeProgramOpen] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [startOption, setStartOption] = useState<"beginning" | "eventDate">("beginning");

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  // Fetch programs
  const { data: programs = [], isLoading: programsLoading } = useQuery({
    queryKey: ["/api/programs"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Change program mutation
  const changeProgramMutation = useMutation({
    mutationFn: async ({ programId, eventDate }: { programId: number; eventDate?: string }) => {
      const response = await apiRequest("PUT", "/api/change-program", {
        programId,
        eventDate: eventDate || null
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Program Changed",
        description: "Your training program has been updated successfully.",
      });
      setIsChangeProgramOpen(false);
      setSelectedProgram(null);
      setEventDate("");
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to change program.",
        variant: "destructive",
      });
    },
  });

  const handleProgramSelect = (program: Program) => {
    setSelectedProgram(program);
    setIsChangeProgramOpen(true);
  };

  const handleConfirmChange = () => {
    if (!selectedProgram) return;
    
    changeProgramMutation.mutate({
      programId: selectedProgram.id,
      eventDate: startOption === "eventDate" && eventDate ? eventDate : undefined
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'hyrox':
        return <Target className="h-4 w-4" />;
      case 'strength':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  if (authLoading || programsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="px-4 py-6 pb-20 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Training Programs</h1>
          <p className="text-gray-600">Choose a program that matches your fitness level and goals</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program: Program) => (
            <Card key={program.id} className="bg-white rounded-2xl shadow-sm border-0 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(program.category)}
                    <Badge className={`${getDifficultyColor(program.difficulty)} text-xs`}>
                      {program.difficulty}
                    </Badge>
                  </div>
                  {user?.currentProgramId === program.id && (
                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">Current</Badge>
                  )}
                </div>
                <CardTitle className="text-lg font-bold text-gray-900 leading-tight">
                  {program.name}
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {program.description}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{program.duration} weeks</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{program.frequency}x/week</span>
                  </div>
                </div>

                <Button 
                  onClick={() => handleProgramSelect(program)}
                  disabled={user?.currentProgramId === program.id || changeProgramMutation.isPending}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  {user?.currentProgramId === program.id ? "Current Program" : "Select Program"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Change Program Dialog */}
      <Dialog open={isChangeProgramOpen} onOpenChange={setIsChangeProgramOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Training Program</DialogTitle>
          </DialogHeader>
          
          {selectedProgram && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{selectedProgram.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{selectedProgram.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{selectedProgram.duration} weeks</span>
                  <span>{selectedProgram.frequency}x per week</span>
                  <Badge className={`${getDifficultyColor(selectedProgram.difficulty)} text-xs`}>
                    {selectedProgram.difficulty}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-base font-medium">Program Start Options</Label>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="startBeginning"
                      name="startOption"
                      value="beginning"
                      checked={startOption === "beginning"}
                      onChange={(e) => setStartOption(e.target.value as "beginning" | "eventDate")}
                      className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300"
                    />
                    <label htmlFor="startBeginning" className="text-sm text-gray-700">
                      Start from the beginning today
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="scheduleToEvent"
                      name="startOption"
                      value="eventDate"
                      checked={startOption === "eventDate"}
                      onChange={(e) => setStartOption(e.target.value as "beginning" | "eventDate")}
                      className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300"
                    />
                    <label htmlFor="scheduleToEvent" className="text-sm text-gray-700">
                      Schedule to finish before an event
                    </label>
                  </div>
                </div>
                
                {startOption === "eventDate" && (
                  <div className="mt-4">
                    <Label htmlFor="eventDate">Event Date</Label>
                    <Input
                      id="eventDate"
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="mt-1"
                      required={startOption === "eventDate"}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      The program will be scheduled to finish before your event date
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsChangeProgramOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmChange}
                  disabled={changeProgramMutation.isPending}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600"
                >
                  {changeProgramMutation.isPending ? "Changing..." : "Confirm Change"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}