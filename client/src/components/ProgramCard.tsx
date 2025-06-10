import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Target, Dumbbell } from "lucide-react";
import type { UserProgress } from "@shared/schema";

interface ProgramCardProps {
  progress: UserProgress;
}

export default function ProgramCard({ progress }: ProgramCardProps) {
  // Calculate progress percentage
  const progressPercentage = progress.totalWorkouts > 0 
    ? (progress.completedWorkouts / progress.totalWorkouts) * 100 
    : 0;

  // Calculate stroke dash offset for progress circle
  const circumference = 2 * Math.PI * 28; // radius = 28
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Program</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Program Image */}
        <div className="w-full h-32 bg-muted rounded-lg mb-4 flex items-center justify-center">
          <Dumbbell className="h-8 w-8 text-muted-foreground" />
        </div>
        
        <div className="mb-4">
          <h4 className="font-semibold text-foreground mb-1">Strength Builder Pro</h4>
          <p className="text-sm text-muted-foreground mb-2">
            Comprehensive strength building program
          </p>
          <div className="flex items-center text-sm text-muted-foreground">
            <span className="flex items-center mr-4">
              <Calendar className="h-3 w-3 mr-1" />
              12 weeks
            </span>
            <span className="flex items-center">
              <Target className="h-3 w-3 mr-1" />
              Intermediate
            </span>
          </div>
        </div>
        
        {/* Progress Circle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="relative w-16 h-16 mr-4">
              <svg className="w-16 h-16 progress-ring">
                <circle 
                  cx="32" 
                  cy="32" 
                  r="28" 
                  stroke="hsl(var(--muted))" 
                  strokeWidth="4" 
                  fill="transparent"
                />
                <circle 
                  cx="32" 
                  cy="32" 
                  r="28" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth="4" 
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-foreground">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Week {progress.currentWeek} of 12
              </p>
              <p className="text-xs text-muted-foreground">
                {12 - progress.currentWeek} weeks remaining
              </p>
            </div>
          </div>
        </div>
        
        <Button variant="outline" className="w-full">
          View Full Program
        </Button>
      </CardContent>
    </Card>
  );
}
