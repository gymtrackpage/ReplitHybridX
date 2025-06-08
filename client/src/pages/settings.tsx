import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Settings, Weight, Mail } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUnit, setSelectedUnit] = useState<string>("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/profile"],
    enabled: !!user,
    onSuccess: (data: any) => {
      if (data?.user?.weightUnit) {
        setSelectedUnit(data.user.weightUnit);
      }
    }
  });

  const updateWeightUnitMutation = useMutation({
    mutationFn: async (weightUnit: string) => {
      return await apiRequest("PATCH", "/api/user/weight-unit", { weightUnit });
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Your weight unit preference has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error: Error) => {
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
        description: "Failed to update weight unit preference. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleWeightUnitChange = (value: string) => {
    setSelectedUnit(value);
    updateWeightUnitMutation.mutate(value);
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent("Hybrid X App Support Request");
    const body = encodeURIComponent(`Hello Hybrid X Team,

I need assistance with:
[Please describe your issue here]

User ID: ${user?.id || 'Not available'}
Current Program: ${profile?.progress?.programId ? `Program ${profile.progress.programId}` : 'None selected'}

Thank you!`);
    
    window.location.href = `mailto:training@hybridx.club?subject=${subject}&body=${body}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto pt-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-32"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6 pt-8">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        {/* Weight Unit Preference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Weight className="h-5 w-5" />
              Weight Units
            </CardTitle>
            <CardDescription>
              Choose your preferred weight unit for exercises and tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedUnit || profile?.user?.weightUnit || "kg"}
              onValueChange={handleWeightUnitChange}
              disabled={updateWeightUnitMutation.isPending}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="kg" id="kg" />
                <Label htmlFor="kg" className="cursor-pointer">
                  Kilograms (kg)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lbs" id="lbs" />
                <Label htmlFor="lbs" className="cursor-pointer">
                  Pounds (lbs)
                </Label>
              </div>
            </RadioGroup>
            {updateWeightUnitMutation.isPending && (
              <p className="text-sm text-muted-foreground mt-2">
                Updating preference...
              </p>
            )}
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Support
            </CardTitle>
            <CardDescription>
              Need help? Get in touch with our training team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleContactSupport}
              variant="outline" 
              className="w-full"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email training@hybridx.club
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Your user information will be included to help us assist you better
            </p>
          </CardContent>
        </Card>

        {/* User Info */}
        {profile?.user && (
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span>{profile.user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member since:</span>
                <span>{new Date(profile.user.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total workouts:</span>
                <span>{profile.user.totalWorkouts || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current streak:</span>
                <span>{profile.user.streak || 0} days</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}