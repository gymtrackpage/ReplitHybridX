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
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

interface AssessmentData {
  // Experience Level Assessment
  hyroxEventsCompleted: number;
  bestFinishTime: string;
  generalFitnessYears: number;
  
  // Training Background
  primaryTrainingBackground: string;
  
  // Time Availability
  weeklyTrainingDays: number;
  avgSessionLength: number;
  equipmentAccess: string;
  
  // Fitness Tests
  kilometerRunTime: number;
  squatMaxReps: number;
  
  // Personal Details
  age: number;
  competitionFormat: string;
  injuryHistory: boolean;
  injuryRecent: boolean;
  
  // Goals and Event
  goals: string[];
  eventLocation: string;
  eventDate: string;
}

const questions = [
  {
    id: 'hyroxEventsCompleted',
    title: "How many HYROX events have you completed?",
    type: 'number',
    required: true,
    min: 0,
    description: "Enter 0 if you haven't completed any events yet"
  },
  {
    id: 'bestFinishTime',
    title: "Best HYROX finish time (HH:MM:SS)?",
    type: 'text',
    required: false,
    placeholder: '01:30:00',
    description: 'Leave blank if you haven\'t completed an event'
  },
  {
    id: 'generalFitnessYears',
    title: "Years of consistent training?",
    type: 'number',
    required: true,
    min: 0,
    description: "How many years have you been training regularly?"
  },
  {
    id: 'primaryTrainingBackground',
    title: "Primary training background?",
    type: 'radio',
    required: true,
    options: [
      { value: 'General Fitness', label: 'General Fitness' },
      { value: 'Running/Endurance', label: 'Running/Endurance' },
      { value: 'Strength/CrossFit', label: 'Strength/CrossFit' },
      { value: 'Team Sports', label: 'Team Sports' },
      { value: 'No Significant Background', label: 'No Significant Background' },
    ],
  },
  {
    id: 'weeklyTrainingDays',
    title: "Days per week you can train?",
    type: 'number',
    required: true,
    min: 1,
    max: 7,
    description: "How many days per week can you commit to training?"
  },
  {
    id: 'avgSessionLength',
    title: "Average session length (hours)?",
    type: 'number',
    required: true,
    min: 0.5,
    max: 4,
    step: 0.5,
    description: "How long is each training session on average?"
  },
  {
    id: 'equipmentAccess',
    title: "Equipment access?",
    type: 'radio',
    required: true,
    options: [
      { value: 'Full (HYROX specific)', label: 'Full (HYROX specific)', description: 'Access to SkiErg, sleds, wall balls, etc.' },
      { value: 'Limited (Good Gym)', label: 'Limited (Good Gym)', description: 'Standard gym with most equipment' },
      { value: 'Minimal (Bodyweight/Running)', label: 'Minimal (Bodyweight/Running)', description: 'Limited equipment, mostly bodyweight' },
    ],
  },
  {
    id: 'kilometerRunTime',
    title: "1km run time (minutes)?",
    type: 'number',
    required: false,
    min: 0,
    step: 0.1,
    placeholder: '4.5',
    description: 'Optional fitness test - enter time in minutes (e.g. 4.5 for 4:30)'
  },
  {
    id: 'squatMaxReps',
    title: "Max bodyweight squats in 1 minute?",
    type: 'number',
    required: false,
    min: 0,
    placeholder: '30',
    description: 'Optional fitness test - how many squats can you do in 1 minute?'
  },
  {
    id: 'age',
    title: "Age?",
    type: 'number',
    required: true,
    min: 16,
    max: 99,
    description: "Your current age"
  },
  {
    id: 'competitionFormat',
    title: "Competition format?",
    type: 'radio',
    required: true,
    options: [
      { value: 'Standard', label: 'Standard', description: 'Individual HYROX competition' },
      { value: 'Doubles', label: 'Doubles', description: 'Two-person team competition' },
      { value: 'Relay', label: 'Relay', description: 'Four-person relay team' },
    ],
  },
  {
    id: 'injuryHistory',
    title: "Any significant injury history?",
    type: 'checkbox',
    required: false,
    description: "Check if you have any significant injury history"
  },
  {
    id: 'injuryRecent',
    title: "Any injuries in past 6 months?",
    type: 'checkbox',
    required: false,
    description: "Check if you've had any injuries in the past 6 months"
  },
  {
    id: 'goals',
    title: "Primary goals (select all that apply)",
    type: 'checkbox',
    required: true,
    options: [
      { value: 'Complete first HYROX', label: 'Complete first HYROX' },
      { value: 'Improve HYROX time', label: 'Improve HYROX time' },
      { value: 'Qualify for championships', label: 'Qualify for championships' },
      { value: 'Podium in age group', label: 'Podium in age group' },
      { value: 'Overall fitness improvement', label: 'Overall fitness improvement' },
    ],
  },
  {
    id: 'eventLocation',
    title: "Target Event Location (Optional)",
    type: 'text',
    required: false,
    placeholder: 'e.g., London, Manchester',
    description: 'Where is your target HYROX event?'
  },
  {
    id: 'eventDate',
    title: "Target Event Date (Optional)",
    type: 'date',
    required: false,
    description: 'When is your target HYROX event?'
  },
];

export default function Assessment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Partial<AssessmentData>>({
    goals: [],
    hyroxEventsCompleted: 0,
    generalFitnessYears: 1,
    weeklyTrainingDays: 4,
    avgSessionLength: 1,
    age: 30,
    competitionFormat: 'Standard',
    primaryTrainingBackground: 'General Fitness',
    equipmentAccess: 'Limited (Good Gym)',
    injuryHistory: false,
    injuryRecent: false,
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
    <div className="min-h-screen bg-gray-100">
      <Header title="Fitness Assessment" />
      
      <main className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Fitness Assessment</h1>
            <p className="text-gray-600">
              Help us create the perfect training program for you
            </p>
          </div>

          <Card className="bg-white rounded-2xl shadow-sm border-0">
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
        </div>
      </main>
      
      {/* Bottom spacing to prevent content from being hidden behind bottom nav */}
      <div className="h-16"></div>
      
      <BottomNav />
    </div>
  );
}
