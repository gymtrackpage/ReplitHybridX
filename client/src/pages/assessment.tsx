import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Trophy, 
  Calendar,
  CreditCard,
  Zap,
  Crown
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePremiumAccess } from "@/hooks/useSubscription";
import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";

interface AssessmentData {
  hyroxEventsCompleted?: number;
  bestFinishTime?: string;
  generalFitnessYears?: number;
  primaryTrainingBackground?: string;
  weeklyTrainingDays?: number;
  avgSessionLength?: number;
  competitionFormat?: string;
  age?: number;
  injuryHistory?: boolean;
  injuryRecent?: boolean;
  kilometerRunTime?: number;
  squatMaxReps?: number;
  goals?: string[];
  equipmentAccess?: string;
}

interface ProgramRecommendation {
  recommendedProgram: {
    id: number;
    name: string;
    description: string;
    difficulty: string;
    targetEventWeeks: number;
    category: string;
  };
  modifications: string[];
  reasoningExplanation: string;
  experienceLevel: string;
  trainingBackground: string;
  timeAvailability: string;
  specialCategory: string;
}

const assessmentSteps = [
  {
    title: "Experience Level",
    description: "Tell us about your HYROX background"
  },
  {
    title: "Training History", 
    description: "Your fitness and training experience"
  },
  {
    title: "Goals & Equipment",
    description: "What you want to achieve"
  },
  {
    title: "Program Recommendation",
    description: "Your personalized training plan"
  },
  {
    title: "Subscription",
    description: "Choose your plan"
  }
];

export default function Assessment() {
  const [currentStep, setCurrentStep] = useState(0);
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({});
  const [recommendation, setRecommendation] = useState<ProgramRecommendation | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasAccess, isAdmin } = usePremiumAccess();

  const getRecommendationMutation = useMutation({
    mutationFn: async (data: AssessmentData) => {
      console.log("Sending assessment data:", data);
      const response = await apiRequest("POST", "/api/get-program-recommendation", data);
      console.log("Received recommendation response:", response);
      return response;
    },
    onSuccess: (data: any) => {
      console.log("Assessment completed successfully:", data);
      if (data && data.programRecommendation) {
        setRecommendation(data.programRecommendation as ProgramRecommendation);
        setCurrentStep(3);
      } else {
        console.error("No program recommendation in response:", data);
        toast({
          title: "Error",
          description: "No program recommendation received. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error("Assessment error:", error);
      toast({
        title: "Error", 
        description: error.message || "Failed to get program recommendation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const completeAssessmentMutation = useMutation({
    mutationFn: async (data: { assessmentData: AssessmentData; programId: number; subscriptionChoice: string }) => {
      console.log("Completing assessment with data:", data);
      const response = await apiRequest("POST", "/api/complete-assessment", data);
      return response;
    },
    onSuccess: async (data) => {
      console.log("Assessment completed successfully:", data);
      
      // Clear any cached user status data
      queryClient.removeQueries({ queryKey: ["/api/user-onboarding-status"] });
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      
      // Force fresh data fetch
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/user-onboarding-status"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/subscription-status"] })
      ]);
      
      toast({
        title: "Assessment Complete!",
        description: "Welcome to HybridX! You can upgrade to Premium anytime for full access.",
      });
      
      // Longer delay to ensure all state updates propagate
      setTimeout(() => {
        setLocation("/dashboard");
      }, 1000);
    },
    onError: (error: any) => {
      console.error("Assessment completion error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete assessment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Check subscription status to avoid duplicate subscriptions
  const { data: subscriptionStatus } = useQuery({
    queryKey: ['/api/subscription-status'],
    staleTime: 5 * 60 * 1000,
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async () => {
      // Check if user is already subscribed
      if (subscriptionStatus?.isSubscribed) {
        throw new Error("You already have an active subscription");
      }

      console.log("Creating subscription...");
      const response = await apiRequest("POST", "/api/create-subscription");
      console.log("Subscription response:", response);
      return response;
    },
    onSuccess: (data: any) => {
      console.log("Subscription creation initiated:", data);
      if (data.paymentUrl) {
        console.log("Redirecting to payment:", data.paymentUrl);
        window.location.href = data.paymentUrl;
      } else {
        console.error("No payment URL in response:", data);
        toast({
          title: "Error",
          description: "Failed to initiate payment process",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      console.error("Subscription creation failed:", error);

      let errorMessage = "Failed to create subscription. Please try again.";
      if (error.message?.includes("already have an active subscription")) {
        errorMessage = "You already have an active subscription.";
      } else if (error.message?.includes("not configured")) {
        errorMessage = "Payment system not configured. Please contact support.";
      } else if (error.message?.includes("EMAIL")) {
        errorMessage = "Email address required. Please update your profile.";
      } else if (error.message?.includes("STRIPE")) {
        errorMessage = "Payment system error. Please try again or contact support.";
      }

      toast({
        title: "Subscription Error",
        description: errorMessage,
        variant: "destructive"
      });

      // Stay on current step instead of redirecting
      console.log("Staying on current step due to subscription error");
    },
  });

  const updateAssessmentData = (updates: Partial<AssessmentData>) => {
    setAssessmentData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep === 2) {
      getRecommendationMutation.mutate(assessmentData);
    } else if (currentStep === 3) {
      // Always show subscription step after recommendation unless user is admin
      if (!isAdmin) {
        setCurrentStep(4);
      }
    } else if (currentStep < assessmentSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubscribe = () => {
    console.log("Subscribe button clicked");
    console.log("Current state:", {
      currentStep,
      recommendation: !!recommendation,
      assessmentData,
      hasRecommendedProgram: !!recommendation?.recommendedProgram
    });

    if (!recommendation?.recommendedProgram) {
      toast({
        title: "Error",
        description: "Please complete the assessment first to get a program recommendation.",
        variant: "destructive"
      });
      return;
    }

    // Store assessment data in localStorage before payment
    const pendingAssessmentData = {
      assessmentData,
      programId: recommendation.recommendedProgram.id,
      subscriptionChoice: "premium"
    };
    
    localStorage.setItem('pendingAssessment', JSON.stringify(pendingAssessmentData));
    console.log("Stored pending assessment data:", pendingAssessmentData);

    createSubscriptionMutation.mutate();
  };

  const handleFreeTrial = () => {
    completeAssessmentMutation.mutate({
      assessmentData,
      programId: recommendation!.recommendedProgram.id,
      subscriptionChoice: "free_trial"
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card className="mobile-card">
            <CardHeader>
              <CardTitle className="mobile-header">HYROX Experience</CardTitle>
              <CardDescription>Help us understand your competitive background</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-base font-medium">How many HYROX events have you completed?</Label>
                <RadioGroup
                  value={assessmentData.hyroxEventsCompleted?.toString()}
                  onValueChange={(value: string) => updateAssessmentData({ hyroxEventsCompleted: parseInt(value) })}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="0" id="events-0" />
                    <Label htmlFor="events-0">None - I'm new to HYROX</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1" id="events-1" />
                    <Label htmlFor="events-1">1-2 events</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="3" id="events-3" />
                    <Label htmlFor="events-3">3-5 events</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="6" id="events-6" />
                    <Label htmlFor="events-6">6+ events (experienced)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-base font-medium">Competition format preference</Label>
                <RadioGroup
                  value={assessmentData.competitionFormat}
                  onValueChange={(value: string) => updateAssessmentData({ competitionFormat: value })}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="singles" id="singles" />
                    <Label htmlFor="singles">Singles</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="doubles" id="doubles" />
                    <Label htmlFor="doubles">Doubles (with partner)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="both" />
                    <Label htmlFor="both">Both formats</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        );

      case 1:
        return (
          <Card className="mobile-card">
            <CardHeader>
              <CardTitle className="mobile-header">Training Background</CardTitle>
              <CardDescription>Tell us about your fitness journey</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fitness-years">Years of general fitness training</Label>
                <Input
                  id="fitness-years"
                  type="number"
                  placeholder="e.g., 5"
                  value={assessmentData.generalFitnessYears || ""}
                  onChange={(e) => updateAssessmentData({ generalFitnessYears: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="e.g., 30"
                  value={assessmentData.age || ""}
                  onChange={(e) => updateAssessmentData({ age: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label className="text-base font-medium">Primary training background</Label>
                <RadioGroup
                  value={assessmentData.primaryTrainingBackground}
                  onValueChange={(value: string) => updateAssessmentData({ primaryTrainingBackground: value })}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="crossfit" id="crossfit" />
                    <Label htmlFor="crossfit">CrossFit</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="powerlifting" id="powerlifting" />
                    <Label htmlFor="powerlifting">Powerlifting/Strength Training</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="running" id="running" />
                    <Label htmlFor="running">Running/Endurance</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="general" id="general" />
                    <Label htmlFor="general">General Fitness</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="beginner" id="beginner" />
                    <Label htmlFor="beginner">Beginner/New to structured training</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="weekly-days">Training days per week</Label>
                <Input
                  id="weekly-days"
                  type="number"
                  placeholder="e.g., 4"
                  value={assessmentData.weeklyTrainingDays || ""}
                  onChange={(e) => updateAssessmentData({ weeklyTrainingDays: parseInt(e.target.value) })}
                />
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card className="mobile-card">
            <CardHeader>
              <CardTitle className="mobile-header">Goals & Equipment</CardTitle>
              <CardDescription>What do you want to achieve?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-base font-medium">Equipment access</Label>
                <RadioGroup
                  value={assessmentData.equipmentAccess}
                  onValueChange={(value: string) => updateAssessmentData({ equipmentAccess: value })}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full_gym" id="full-gym" />
                    <Label htmlFor="full-gym">Full gym with all HYROX equipment</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="home_basic" id="home-basic" />
                    <Label htmlFor="home-basic">Home gym with basic equipment</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="minimal" id="minimal" />
                    <Label htmlFor="minimal">Minimal equipment (bodyweight focus)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="primary-goal">Primary goal</Label>
                <RadioGroup
                  value={assessmentData.goals?.[0]}
                  onValueChange={(value: string) => updateAssessmentData({ goals: [value] })}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="first-hyrox" id="first-hyrox" />
                    <Label htmlFor="first-hyrox">Complete my first HYROX event</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="improve-time" id="improve-time" />
                    <Label htmlFor="improve-time">Improve my HYROX time</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="general-fitness" id="general-fitness" />
                    <Label htmlFor="general-fitness">Build general fitness</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="strength" id="strength" />
                    <Label htmlFor="strength">Increase strength</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return recommendation ? (
          <div className="space-y-4">
            {!hasAccess && !isAdmin ? (
              <SubscriptionGate 
                feature="Program Recommendations"
                description="Get access to personalized HYROX training programs based on your assessment"
              >
                <div />
              </SubscriptionGate>
            ) : (
              <Card className="mobile-card">
                <CardHeader>
                  <CardTitle className="mobile-header flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Your Recommended Program
                  </CardTitle>
                  <CardDescription>Based on your assessment responses</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-200">
                <h3 className="text-xl font-bold text-yellow-800 mb-2">{recommendation.recommendedProgram.name}</h3>
                <p className="text-sm text-yellow-700 mb-3">{recommendation.recommendedProgram.description}</p>

                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {recommendation.recommendedProgram.difficulty}
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-800">
                    <Calendar className="h-3 w-3 mr-1" />
                    {recommendation.recommendedProgram.targetEventWeeks} weeks
                  </Badge>
                  <Badge className="bg-green-100 text-green-800">
                    {recommendation.recommendedProgram.category}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Why this program?</h4>
                <p className="text-sm text-muted-foreground">{recommendation.reasoningExplanation}</p>
              </div>

              {recommendation.modifications.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Personalized modifications:</h4>
                  <ul className="space-y-1">
                    {recommendation.modifications.map((mod, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        {mod}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
                </CardContent>
              </Card>
            )}
          </div>
        ) : null;

      case 4:
        return (
          <div className="space-y-4">
            <Card className="mobile-card bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
              <CardHeader className="text-center">
                <CardTitle className="mobile-header text-yellow-800">
                  <CreditCard className="h-6 w-6 mx-auto mb-2" />
                  Choose Your Plan
                </CardTitle>
                <CardDescription className="text-yellow-700">
                  Get full access to your personalized training program
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white rounded-lg p-4 border-2 border-yellow-300">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Full Access Plan</h3>
                      <p className="text-sm text-gray-600">Complete HYROX training experience</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">£5</p>
                      <p className="text-sm text-gray-600">/month</p>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-4">
                    {[
                      "Personalized training programs",
                      "Full workout library access",
                      "Progress tracking & analytics",
                      "Calendar scheduling",
                      "Program modifications",
                      "Expert support"
                    ].map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className="w-full"
                    onClick={handleSubscribe}
                    disabled={createSubscriptionMutation.isPending}
                  >
                    {createSubscriptionMutation.isPending ? "Processing..." : "Subscribe Now"}
                  </Button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-700">Limited Access</h3>
                      <p className="text-sm text-gray-600">Try the workout generator only</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-700">Free</p>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-4">
                    {[
                      "Random workout generator",
                      "Basic workout tracking"
                    ].map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                        <Zap className="h-4 w-4 text-gray-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleFreeTrial}
                    disabled={completeAssessmentMutation.isPending}
                  >
                    {completeAssessmentMutation.isPending ? "Setting up..." : "Continue with Limited Access"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return assessmentData.hyroxEventsCompleted !== undefined && 
               assessmentData.competitionFormat;
      case 1:
        return assessmentData.generalFitnessYears && 
               assessmentData.generalFitnessYears > 0 &&
               assessmentData.age && 
               assessmentData.age >= 16 && 
               assessmentData.age <= 100 &&
               assessmentData.primaryTrainingBackground && 
               assessmentData.weeklyTrainingDays && 
               assessmentData.weeklyTrainingDays > 0 && 
               assessmentData.weeklyTrainingDays <= 7;
      case 2:
        return assessmentData.equipmentAccess && 
               assessmentData.goals && 
               assessmentData.goals.length > 0;
      case 3:
        return recommendation !== null && (hasAccess || isAdmin);
      default:
        return true;
    }
  };

  return (
    <MobileLayout>
      <div className="space-y-3">
        {/* Progress Header */}
        <Card className="mobile-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo-x.png" 
                  alt="HybridX Logo" 
                  className="h-8 w-8"
                  onError={(e) => {
                    console.error('Logo failed to load, trying fallback');
                    e.currentTarget.src = '/icon-192.png';
                  }}
                />
                <h1 className="text-lg font-bold">Initial Assessment</h1>
              </div>
              <Badge variant="secondary">
                Step {currentStep + 1} of {assessmentSteps.length}
              </Badge>
            </div>
            <Progress value={((currentStep + 1) / assessmentSteps.length) * 100} className="h-2" />
            <div className="mt-2">
              <p className="text-sm font-medium">{assessmentSteps[currentStep].title}</p>
              <p className="text-xs text-muted-foreground">{assessmentSteps[currentStep].description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation */}
        {currentStep < 4 && (
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button 
                variant="outline" 
                onClick={prevStep}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}

            <Button 
              onClick={nextStep}
              disabled={!canProceed() || getRecommendationMutation.isPending}
              className="flex-1"
            >
              {currentStep === 2 ? (
                getRecommendationMutation.isPending ? "Analyzing..." : "Get Recommendation"
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}