import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import type { WorkoutCompletion } from "@shared/schema";

interface ProgressCalendarProps {
  completions: WorkoutCompletion[];
}

export default function ProgressCalendar({ completions }: ProgressCalendarProps) {
  // Get the last 7 days
  const today = new Date();
  const week = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    week.push(date);
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Check if there's a completion for a given date
  const hasCompletion = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return completions.some(completion => {
      const completionDate = new Date(completion.completedAt).toISOString().split('T')[0];
      return completionDate === dateStr;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Calculate weekly stats
  const completedCount = completions.length;
  const weeklyGoal = 5; // Assuming 5 workouts per week
  const remainingCount = Math.max(0, weeklyGoal - completedCount);

  return (
    <Card>
      <CardHeader>
        <CardTitle>This Week's Progress</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Progress Calendar */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {week.map((date, index) => {
            const completed = hasCompletion(date);
            const isTodayDate = isToday(date);
            
            return (
              <div key={index} className="text-center">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {dayNames[date.getDay()]}
                </p>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${
                  completed 
                    ? 'bg-secondary text-secondary-foreground'
                    : isTodayDate
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  {completed ? (
                    <Check className="h-3 w-3" />
                  ) : isTodayDate ? (
                    <span className="text-xs font-semibold">{date.getDate()}</span>
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Weekly Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{completedCount}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">0</p>
            <p className="text-sm text-muted-foreground">Skipped</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{remainingCount}</p>
            <p className="text-sm text-muted-foreground">Remaining</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
