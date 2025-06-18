import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
// Temporarily disabled to fix React hook errors
// import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";
// import { usePremiumAccess } from "@/hooks/useSubscription";
import { Trophy, Clock, Target, Users, Calendar } from "lucide-react";

export default function Programs() {
  const { toast } = useToast();
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [programSelectionMode, setProgramSelectionMode] = useState("continue"); // continue, restart, enddate
  const [endDate, setEndDate] = useState("");
  // Temporarily disabled to fix React hook errors
  // const { hasAccess } = usePremiumAccess();
  const hasAccess = true; // Temporarily allow access to fix app

  const { data: programs, isLoading } = useQuery({
    queryKey: ["/api/programs"],
  });

  const { data: userStatus } = useQuery({
    queryKey: ["/api/user-onboarding-status"],
  });

  // Provide default values to prevent property access errors
  const safeUserStatus = userStatus || {};
  const safePrograms = programs || [];

  const selectProgramMutation = useMutation({
    mutationFn: async (programId: number) => {
      await apiRequest("POST", "/api/select-program", { programId, mode: programSelectionMode, endDate });
    },
    onSuccess: () => {
      toast({
        title: "Program Selected",
        description: "Your training program has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-onboarding-status"] });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to select program",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-64 animate-pulse">
                <CardContent className="p-0 h-full bg-gray-100 rounded" />
              </Card>
            ))}
          </div>
        </div>
      </MobileLayout>
    );
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case "beginner": return "bg-green-100 text-green-800";
      case "intermediate": return "bg-yellow-100 text-yellow-800";
      case "advanced": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case "hyrox": return <Trophy className="h-4 w-4" />;
      case "strength": return <Target className="h-4 w-4" />;
      case "conditioning": return <Clock className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const handleProgramSelect = (programId: number) => {
    setSelectedProgram(programId);
    setOpen(true);
  };

  const handleConfirmProgramSelect = () => {
    selectProgramMutation.mutate(selectedProgram!);
  };

  return (
    <MobileLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Training Programs</h1>
            <p className="text-muted-foreground">
              Choose the perfect program to reach your Hyrox goals
            </p>
          </div>
          {safeUserStatus.currentProgramId && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-200">
              Current Program: {safePrograms.find((p: any) => p.id === safeUserStatus.currentProgramId)?.name || "Unknown"}
            </Badge>
          )}
        </div>

        {!safeUserStatus.assessmentCompleted && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Get Your Personalized Recommendation
              </CardTitle>
              <CardDescription>
                Take our fitness assessment to get a program recommendation tailored to your goals and experience level.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="bg-yellow-400 hover:bg-yellow-500 text-black">
                <a href="/assessment">Start Assessment</a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Temporarily disabled subscription gate to fix React hook errors */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {safePrograms.map((program: any) => (
              <Card 
                key={program.id} 
                className={`transition-all hover:shadow-lg cursor-pointer ${
                  selectedProgram === program.id ? "ring-2 ring-yellow-400" : ""
                }`}
                onClick={() => handleProgramSelect(program.id)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(program.category)}
                      <CardTitle className="text-lg">{program.name}</CardTitle>
                    </div>
                    <Badge className={getDifficultyColor(program.difficulty)}>
                      {program.difficulty}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {program.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{program.duration} weeks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{program.frequency}x/week</span>
                    </div>
                  </div>

                  {program.targetEventWeeks && (
                    <div className="text-sm text-muted-foreground">
                      Recommended {program.targetEventWeeks} weeks before event
                    </div>
                  )}

                  <Button 
                    className="w-full"
                    variant={safeUserStatus.currentProgramId === program.id ? "secondary" : "default"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProgramSelect(program.id);
                    }}
                    disabled={selectProgramMutation.isPending}
                  >
                    {selectProgramMutation.isPending && selectedProgram === program.id ? (
                      <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    ) : null}
                    {safeUserStatus.currentProgramId === program.id ? "Current Program" : "Select Program"}
                  </Button>
                </CardContent>
              </Card>
            ))}

            {safePrograms.length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Programs Available</h3>
                  <p className="text-muted-foreground mb-4">
                    Training programs are being loaded. Please check back shortly.
                  </p>
                  <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/programs"] })}>
                    Refresh
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Program Selection Options</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <RadioGroup defaultValue="continue" className="flex flex-col space-y-1.5" onValueChange={(value) => setProgramSelectionMode(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="continue" id="continue" />
                <Label htmlFor="continue">Continue from the same day</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="restart" id="restart" />
                <Label htmlFor="restart">Start at the beginning of the program</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="enddate" id="enddate" />
                <Label htmlFor="enddate">Manually select an end date</Label>
              </div>
            </RadioGroup>

            {programSelectionMode === "enddate" && (
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" onClick={handleConfirmProgramSelect} disabled={selectProgramMutation.isPending}>
              {selectProgramMutation.isPending ? (
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
              ) : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}