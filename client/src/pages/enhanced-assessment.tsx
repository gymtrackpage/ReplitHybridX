import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Navigation from "@/components/Navigation";

interface AssessmentData {
  hyroxEventsCompleted: number;
  bestFinishTime: string;
  generalFitnessYears: number;
  primaryTrainingBackground: string;
  weeklyTrainingDays: number;
  avgSessionLength: number;
  equipmentAccess: string;
  kilometerRunTime: number;
  squatMaxReps: number;
  age: number;
  competitionFormat: string;
  injuryHistory: boolean;
  injuryRecent: boolean;
  goals: string[];
  eventLocation: string;
  eventDate: string;
}

const assessmentSections = [
  {
    title: "Experience Level",
    description: "Help us understand your HYROX and fitness background",
    fields: [
      {
        id: 'hyroxEventsCompleted',
        label: 'How many HYROX events have you completed?',
        type: 'number',
        min: 0,
        required: true
      },
      {
        id: 'bestFinishTime',
        label: 'Best HYROX finish time (HH:MM:SS)',
        type: 'text',
        placeholder: '01:30:00',
        required: false,
        description: 'Leave blank if you haven\'t completed an event'
      },
      {
        id: 'generalFitnessYears',
        label: 'Years of consistent training?',
        type: 'number',
        min: 0,
        required: true
      }
    ]
  },
  {
    title: "Training Background",
    description: "Your previous training experience",
    fields: [
      {
        id: 'primaryTrainingBackground',
        label: 'Primary training background?',
        type: 'select',
        options: ['General Fitness', 'Running/Endurance', 'Strength/CrossFit', 'Team Sports', 'No Significant Background'],
        required: true
      }
    ]
  },
  {
    title: "Time Availability",
    description: "How much time can you dedicate to training?",
    fields: [
      {
        id: 'weeklyTrainingDays',
        label: 'Days per week you can train?',
        type: 'number',
        min: 1,
        max: 7,
        required: true
      },
      {
        id: 'avgSessionLength',
        label: 'Average session length (hours)?',
        type: 'number',
        step: 0.5,
        min: 0.5,
        max: 4,
        required: true
      },
      {
        id: 'equipmentAccess',
        label: 'Equipment access?',
        type: 'select',
        options: ['Full (HYROX specific)', 'Limited (Good Gym)', 'Minimal (Bodyweight/Running)'],
        required: true
      }
    ]
  },
  {
    title: "Fitness Assessment",
    description: "Optional fitness tests to better tailor your program",
    fields: [
      {
        id: 'kilometerRunTime',
        label: '1km run time (minutes)?',
        type: 'number',
        min: 0,
        step: 0.1,
        placeholder: 'e.g., 4.5 for 4:30',
        required: false,
        description: 'Optional, but helps tailor your program'
      },
      {
        id: 'squatMaxReps',
        label: 'Max bodyweight squats in 1 minute?',
        type: 'number',
        min: 0,
        placeholder: 'e.g., 30',
        required: false
      }
    ]
  },
  {
    title: "Personal Details",
    description: "Personal information for program customization",
    fields: [
      {
        id: 'age',
        label: 'Age?',
        type: 'number',
        min: 16,
        max: 99,
        required: true
      },
      {
        id: 'competitionFormat',
        label: 'Competition format?',
        type: 'select',
        options: ['Standard', 'Doubles', 'Relay'],
        required: true
      },
      {
        id: 'injuryHistory',
        label: 'Any significant injury history?',
        type: 'checkbox',
        required: false
      },
      {
        id: 'injuryRecent',
        label: 'Any injuries in past 6 months?',
        type: 'checkbox',
        required: false
      }
    ]
  },
  {
    title: "Goals & Event",
    description: "Your training goals and target event",
    fields: [
      {
        id: 'goals',
        label: 'Primary goals (select all that apply)',
        type: 'multiselect',
        options: ['Complete first HYROX', 'Improve HYROX time', 'Qualify for championships', 'Podium in age group', 'Overall fitness improvement'],
        required: true
      },
      {
        id: 'eventLocation',
        label: 'Target Event Location (Optional)',
        type: 'text',
        placeholder: 'e.g., London, Manchester',
        required: false
      },
      {
        id: 'eventDate',
        label: 'Target Event Date (Optional)',
        type: 'date',
        required: false
      }
    ]
  }
];

export default function EnhancedAssessment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState<Partial<AssessmentData>>({
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
    injuryRecent: false
  });
  const [programRecommendation, setProgramRecommendation] = useState<any>(null);

  const assessmentMutation = useMutation({
    mutationFn: async (data: AssessmentData) => {
      const response = await apiRequest("POST", "/api/assessment", data);
      return response.json();
    },
    onSuccess: (data) => {
      setProgramRecommendation(data.programRecommendation);
      toast({
        title: "Assessment Complete!",
        description: "Your personalized program has been recommended.",
      });
    },
    onError: (error) => {
      toast({
        title: "Assessment Failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleGoalsChange = (goal: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      goals: checked 
        ? [...(prev.goals || []), goal]
        : (prev.goals || []).filter(g => g !== goal)
    }));
  };

  const isCurrentSectionValid = () => {
    const section = assessmentSections[currentSection];
    return section.fields.every(field => {
      if (!field.required) return true;
      const value = formData[field.id as keyof AssessmentData];
      if (field.type === 'multiselect') {
        return Array.isArray(value) && value.length > 0;
      }
      return value !== undefined && value !== '' && value !== null;
    });
  };

  const handleNext = () => {
    if (currentSection < assessmentSections.length - 1) {
      setCurrentSection(currentSection + 1);
    } else {
      // Submit assessment
      assessmentMutation.mutate(formData as AssessmentData);
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  if (programRecommendation) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={user} />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-center">Your Personalized HYROX Program</CardTitle>
                <CardDescription className="text-center">
                  Based on your assessment, here's your recommended training program
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-primary/10 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-2">{programRecommendation.program?.name}</h3>
                  <p className="text-muted-foreground mb-4">{programRecommendation.program?.description}</p>
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Experience Level:</strong> {programRecommendation.experienceLevel}
                    </div>
                    <div>
                      <strong>Training Background:</strong> {programRecommendation.trainingBackground}
                    </div>
                    <div>
                      <strong>Time Availability:</strong> {programRecommendation.timeAvailability}
                    </div>
                    <div>
                      <strong>Category:</strong> {programRecommendation.specialCategory}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Why This Program?</h4>
                  <p className="text-muted-foreground">{programRecommendation.reasoning}</p>
                </div>

                {programRecommendation.modifications && programRecommendation.modifications.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Recommended Modifications</h4>
                    <ul className="space-y-2">
                      {programRecommendation.modifications.map((mod: any, index: number) => (
                        <li key={index} className="text-sm">
                          <strong>{mod.type}:</strong> {mod.action} - {mod.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button 
                  onClick={() => window.location.href = '/dashboard'} 
                  className="w-full"
                >
                  Start Your Training Program
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const currentSectionData = assessmentSections[currentSection];

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-center mb-4">HYROX Training Assessment</h1>
            <div className="flex justify-center mb-4">
              <div className="flex space-x-2">
                {assessmentSections.map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full ${
                      index <= currentSection ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-center text-muted-foreground">
              Section {currentSection + 1} of {assessmentSections.length}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{currentSectionData.title}</CardTitle>
              <CardDescription>{currentSectionData.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentSectionData.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  
                  {field.type === 'text' && (
                    <Input
                      id={field.id}
                      type="text"
                      placeholder={field.placeholder}
                      value={formData[field.id as keyof AssessmentData] as string || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    />
                  )}
                  
                  {field.type === 'number' && (
                    <Input
                      id={field.id}
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      placeholder={field.placeholder}
                      value={formData[field.id as keyof AssessmentData] as number || ''}
                      onChange={(e) => handleInputChange(field.id, parseInt(e.target.value) || 0)}
                    />
                  )}
                  
                  {field.type === 'date' && (
                    <Input
                      id={field.id}
                      type="date"
                      value={formData[field.id as keyof AssessmentData] as string || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    />
                  )}
                  
                  {field.type === 'select' && (
                    <Select
                      value={formData[field.id as keyof AssessmentData] as string || ''}
                      onValueChange={(value) => handleInputChange(field.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {field.type === 'checkbox' && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={field.id}
                        checked={formData[field.id as keyof AssessmentData] as boolean || false}
                        onCheckedChange={(checked) => handleInputChange(field.id, checked)}
                      />
                      <Label htmlFor={field.id}>Yes</Label>
                    </div>
                  )}
                  
                  {field.type === 'multiselect' && (
                    <div className="space-y-2">
                      {field.options?.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${field.id}_${option}`}
                            checked={(formData.goals || []).includes(option)}
                            onCheckedChange={(checked) => handleGoalsChange(option, checked as boolean)}
                          />
                          <Label htmlFor={`${field.id}_${option}`}>{option}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {field.description && (
                    <p className="text-sm text-muted-foreground">{field.description}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentSection === 0}
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={!isCurrentSectionValid() || assessmentMutation.isPending}
            >
              {assessmentMutation.isPending ? (
                "Processing..."
              ) : currentSection === assessmentSections.length - 1 ? (
                "Get My Program"
              ) : (
                "Next"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}