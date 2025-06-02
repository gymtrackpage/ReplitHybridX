import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Navigation from "@/components/Navigation";

interface AssessmentData {
  fitnessLevel: string;
  goals: string[];
  experience: string;
  timeAvailability: number;
  equipmentAccess: string[];
}

const questions = [
  {
    id: 'fitnessLevel',
    title: "What's your current fitness level?",
    type: 'radio',
    options: [
      { value: 'beginner', label: 'Beginner', description: 'Little to no regular exercise' },
      { value: 'intermediate', label: 'Intermediate', description: 'Regular exercise 2-3 times per week' },
      { value: 'advanced', label: 'Advanced', description: 'Consistent training 4+ times per week' },
    ],
  },
  {
    id: 'goals',
    title: "What are your primary fitness goals?",
    type: 'checkbox',
    options: [
      { value: 'strength', label: 'Build Strength' },
      { value: 'muscle', label: 'Gain Muscle Mass' },
      { value: 'weight_loss', label: 'Lose Weight' },
      { value: 'endurance', label: 'Improve Endurance' },
      { value: 'flexibility', label: 'Increase Flexibility' },
      { value: 'athletic', label: 'Athletic Performance' },
    ],
  },
  {
    id: 'experience',
    title: "How much weight training experience do you have?",
    type: 'radio',
    options: [
      { value: 'none', label: 'No Experience', description: 'Never lifted weights before' },
      { value: 'some', label: 'Some Experience', description: '6 months - 2 years' },
      { value: 'experienced', label: 'Experienced', description: '2+ years of consistent training' },
    ],
  },
  {
    id: 'timeAvailability',
    title: "How much time can you dedicate per workout?",
    type: 'radio',
    options: [
      { value: '30', label: '30 minutes', description: 'Quick, efficient workouts' },
      { value: '45', label: '45 minutes', description: 'Standard workout duration' },
      { value: '60', label: '60 minutes', description: 'Comprehensive training sessions' },
      { value: '90', label: '90+ minutes', description: 'Extended training sessions' },
    ],
  },
  {
    id: 'equipmentAccess',
    title: "What equipment do you have access to?",
    type: 'checkbox',
    options: [
      { value: 'bodyweight', label: 'Bodyweight Only' },
      { value: 'dumbbells', label: 'Dumbbells' },
      { value: 'barbells', label: 'Barbells' },
      { value: 'resistance_bands', label: 'Resistance Bands' },
      { value: 'gym', label: 'Full Gym Access' },
      { value: 'home_gym', label: 'Home Gym Setup' },
    ],
  },
];

export default function Assessment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Partial<AssessmentData>>({
    goals: [],
    equipmentAccess: [],
  });

  const assessmentMutation = useMutation({
    mutationFn: async (data: AssessmentData) => {
      await apiRequest("POST", "/api/assessment", data);
    },
    onSuccess: () => {
      toast({
        title: "Assessment Complete!",
        description: "We'll recommend the perfect program for you.",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save assessment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAnswer = (value: string | string[]) => {
    const question = questions[currentQuestion];
    setAnswers(prev => ({
      ...prev,
      [question.id]: question.type === 'checkbox' ? value : 
                    question.id === 'timeAvailability' ? parseInt(value as string) : value,
    }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Submit assessment
      assessmentMutation.mutate(answers as AssessmentData);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const isAnswered = () => {
    const question = questions[currentQuestion];
    const answer = answers[question.id as keyof AssessmentData];
    
    if (question.type === 'checkbox') {
      return Array.isArray(answer) && answer.length > 0;
    }
    return answer !== undefined && answer !== '';
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const question = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} />
      
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Fitness Assessment</h1>
          <p className="text-muted-foreground">
            Help us create the perfect training program for you
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Progress</span>
              <span>{currentQuestion + 1} of {questions.length}</span>
            </div>
            <Progress value={progress} className="mb-4" />
            <CardTitle>{question.title}</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {question.type === 'radio' ? (
              <RadioGroup
                value={answers[question.id as keyof AssessmentData] as string || ''}
                onValueChange={handleAnswer}
              >
                {question.options.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <div className="flex-1">
                      <Label htmlFor={option.value} className="font-medium cursor-pointer">
                        {option.label}
                      </Label>
                      {option.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {option.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="space-y-3">
                {question.options.map((option) => {
                  const currentAnswers = (answers[question.id as keyof AssessmentData] as string[]) || [];
                  return (
                    <div key={option.value} className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50">
                      <Checkbox
                        id={option.value}
                        checked={currentAnswers.includes(option.value)}
                        onCheckedChange={(checked) => {
                          const newAnswers = checked
                            ? [...currentAnswers, option.value]
                            : currentAnswers.filter(a => a !== option.value);
                          handleAnswer(newAnswers);
                        }}
                      />
                      <Label htmlFor={option.value} className="font-medium cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
              >
                Previous
              </Button>
              <Button
                onClick={handleNext}
                disabled={!isAnswered() || assessmentMutation.isPending}
              >
                {currentQuestion === questions.length - 1 
                  ? (assessmentMutation.isPending ? "Submitting..." : "Complete Assessment")
                  : "Next"
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
