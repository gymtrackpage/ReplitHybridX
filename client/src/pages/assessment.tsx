import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, Target, Users, Clock, Trophy } from "lucide-react";

const assessmentSchema = z.object({
  hyroxEventsCompleted: z.coerce.number().min(0).default(0),
  bestFinishTime: z.string().optional(),
  generalFitnessYears: z.coerce.number().min(0).max(50).default(0),
  primaryTrainingBackground: z.string().min(1, "Please select your training background"),
  weeklyTrainingDays: z.coerce.number().min(1).max(7).default(3),
  avgSessionLength: z.coerce.number().min(15).max(180).default(60),
  competitionFormat: z.string().min(1, "Please select competition format"),
  age: z.coerce.number().min(16).max(80).default(25),
  injuryHistory: z.boolean().default(false),
  injuryRecent: z.boolean().default(false),
  kilometerRunTime: z.coerce.number().min(180).max(1800).default(300),
  squatMaxReps: z.coerce.number().min(0).max(200).default(20),
  goals: z.array(z.string()).default([]),
  equipmentAccess: z.string().min(1, "Please select equipment access"),
});

type AssessmentData = z.infer<typeof assessmentSchema>;

export default function Assessment() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [goals, setGoals] = useState<string[]>([]);
  const totalSteps = 4;

  const form = useForm<AssessmentData>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      hyroxEventsCompleted: 0,
      generalFitnessYears: 0,
      weeklyTrainingDays: 3,
      avgSessionLength: 60,
      age: 25,
      injuryHistory: false,
      injuryRecent: false,
      kilometerRunTime: 300,
      squatMaxReps: 20,
      goals: [],
    },
  });

  const submitAssessmentMutation = useMutation({
    mutationFn: async (data: AssessmentData) => {
      const response = await apiRequest("POST", "/api/fitness-assessment", { 
        ...data, 
        goals 
      });
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Assessment Complete!",
        description: `Recommended program: ${result.recommendedProgram?.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-onboarding-status"] });
      window.location.href = "/programs";
    },
    onError: (error: any) => {
      toast({
        title: "Assessment Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AssessmentData) => {
    submitAssessmentMutation.mutate({ ...data, goals });
  };

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const toggleGoal = (goal: string) => {
    setGoals(prev => 
      prev.includes(goal) 
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const goalOptions = [
    "Complete first Hyrox race",
    "Improve race time",
    "Build functional strength",
    "Increase cardiovascular endurance", 
    "Lose weight",
    "Gain muscle mass",
    "Improve overall fitness",
    "Compete professionally"
  ];

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Fitness Assessment</h1>
          <p className="text-muted-foreground">
            Help us create the perfect training program for you
          </p>
          <div className="flex justify-center mt-4">
            <div className="flex space-x-2">
              {[...Array(totalSteps)].map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-8 rounded-full ${
                    i + 1 <= step ? "bg-yellow-400" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {step === 1 && <Trophy className="h-5 w-5" />}
                  {step === 2 && <Users className="h-5 w-5" />}
                  {step === 3 && <Clock className="h-5 w-5" />}
                  {step === 4 && <Target className="h-5 w-5" />}
                  
                  {step === 1 && "Hyrox Experience"}
                  {step === 2 && "Training Background"}
                  {step === 3 && "Physical Assessment"}
                  {step === 4 && "Goals & Equipment"}
                </CardTitle>
                <CardDescription>
                  Step {step} of {totalSteps}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {step === 1 && (
                  <>
                    <FormField
                      control={form.control}
                      name="hyroxEventsCompleted"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>How many Hyrox events have you completed?</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bestFinishTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Best Hyrox finish time (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 1:30:00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="competitionFormat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred competition format</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select format" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="individual">Individual</SelectItem>
                              <SelectItem value="doubles">Doubles</SelectItem>
                              <SelectItem value="both">Both</SelectItem>
                              <SelectItem value="undecided">Not sure yet</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {step === 2 && (
                  <>
                    <FormField
                      control={form.control}
                      name="generalFitnessYears"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Years of general fitness training</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" max="50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="primaryTrainingBackground"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary training background</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select background" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="crossfit">CrossFit</SelectItem>
                              <SelectItem value="running">Running</SelectItem>
                              <SelectItem value="weightlifting">Weightlifting</SelectItem>
                              <SelectItem value="bodybuilding">Bodybuilding</SelectItem>
                              <SelectItem value="calisthenics">Calisthenics</SelectItem>
                              <SelectItem value="martial_arts">Martial Arts</SelectItem>
                              <SelectItem value="team_sports">Team Sports</SelectItem>
                              <SelectItem value="general_fitness">General Fitness</SelectItem>
                              <SelectItem value="beginner">Complete Beginner</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="weeklyTrainingDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Days per week you can train</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" max="7" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="avgSessionLength"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Average session length (minutes)</FormLabel>
                          <FormControl>
                            <Input type="number" min="15" max="180" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {step === 3 && (
                  <>
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl>
                            <Input type="number" min="16" max="80" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="kilometerRunTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>1km run time (seconds)</FormLabel>
                          <FormControl>
                            <Input type="number" min="180" max="1800" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="squatMaxReps"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum bodyweight squats</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" max="200" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {step === 4 && (
                  <>
                    <div>
                      <FormLabel className="text-base font-medium">What are your main goals?</FormLabel>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {goalOptions.map((goal) => (
                          <Button
                            key={goal}
                            type="button"
                            variant={goals.includes(goal) ? "default" : "outline"}
                            className="justify-start text-left h-auto p-3"
                            onClick={() => toggleGoal(goal)}
                          >
                            {goals.includes(goal) && <CheckCircle className="h-4 w-4 mr-2" />}
                            {goal}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="equipmentAccess"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Equipment access</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select equipment access" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="full_gym">Full Gym</SelectItem>
                              <SelectItem value="home_basic">Home Basic (dumbbells, etc.)</SelectItem>
                              <SelectItem value="bodyweight_only">Bodyweight Only</SelectItem>
                              <SelectItem value="outdoor_only">Outdoor Only</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={step === 1}
              >
                Previous
              </Button>
              
              {step < totalSteps ? (
                <Button type="button" onClick={nextStep}>
                  Next
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={submitAssessmentMutation.isPending}
                  className="bg-yellow-400 hover:bg-yellow-500 text-black"
                >
                  {submitAssessmentMutation.isPending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  ) : null}
                  Complete Assessment
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </MainLayout>
  );
}