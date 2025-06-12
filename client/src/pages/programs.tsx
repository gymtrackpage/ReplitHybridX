import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Trophy, Clock, Target, Users, Calendar } from "lucide-react";

export default function Programs() {
  const { toast } = useToast();
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);

  const { data: programs, isLoading } = useQuery({
    queryKey: ["/api/programs"],
  });

  const { data: userStatus } = useQuery({
    queryKey: ["/api/user-onboarding-status"],
  });

  const selectProgramMutation = useMutation({
    mutationFn: async (programId: number) => {
      await apiRequest("POST", "/api/select-program", { programId });
    },
    onSuccess: () => {
      toast({
        title: "Program Selected",
        description: "Your training program has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-onboarding-status"] });
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
          {userStatus?.currentProgramId && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-200">
              Current Program: {programs?.find((p: any) => p.id === userStatus.currentProgramId)?.name || "Unknown"}
            </Badge>
          )}
        </div>

        {!userStatus?.assessmentCompleted && (
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs?.map((program: any) => (
            <Card 
              key={program.id} 
              className={`transition-all hover:shadow-lg cursor-pointer ${
                selectedProgram === program.id ? "ring-2 ring-yellow-400" : ""
              }`}
              onClick={() => setSelectedProgram(program.id)}
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
                  variant={userStatus?.currentProgramId === program.id ? "secondary" : "default"}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectProgramMutation.mutate(program.id);
                  }}
                  disabled={selectProgramMutation.isPending}
                >
                  {selectProgramMutation.isPending && selectedProgram === program.id ? (
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  ) : null}
                  {userStatus?.currentProgramId === program.id ? "Current Program" : "Select Program"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {programs?.length === 0 && (
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
    </MainLayout>
  );
}