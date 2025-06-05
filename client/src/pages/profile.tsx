import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dumbbell, Calendar as CalendarIcon, User, Calendar, MapPin, Clock, Target, Mail, MessageSquare } from "lucide-react";
import { format } from "date-fns";

export default function Profile() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    hyroxEventDate: "",
    hyroxEventLocation: "",
    targetTime: "",
    fitnessLevel: "",
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
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
  }, [isAuthenticated, authLoading, toast]);

  // Load user data when available
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        hyroxEventDate: user.hyroxEventDate ? format(new Date(user.hyroxEventDate), 'yyyy-MM-dd') : "",
        hyroxEventLocation: user.hyroxEventLocation || "",
        targetTime: user.targetTime || "",
        fitnessLevel: user.fitnessLevel || "",
      });
    }
  }, [user]);

  const { data: programs } = useQuery({
    queryKey: ["/api/programs"],
    enabled: isAuthenticated,
    retry: false,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PUT", "/api/profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error) => {
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
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const changeProgramMutation = useMutation({
    mutationFn: async (programId: number) => {
      await apiRequest("PUT", "/api/change-program", { programId });
    },
    onSuccess: () => {
      toast({
        title: "Program Changed",
        description: "Your training program has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error) => {
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
        description: "Failed to change program. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleSave = () => {
    updateProfileMutation.mutate(profileData);
  };

  const getDaysUntilEvent = () => {
    if (!user?.hyroxEventDate) return null;
    const eventDate = new Date(user.hyroxEventDate);
    const today = new Date();
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilEvent = getDaysUntilEvent();

  return (
    <div className="min-h-screen bg-gray-100">
      <Header title="Profile" />

      <main className="px-4 py-6">
        {/* Hyrox Event Countdown */}
        {user?.hyroxEventDate && (
          <Card className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black rounded-2xl shadow-sm border-0 mb-6">
            <CardContent className="pt-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Hyrox Event Countdown</h2>
                <div className="text-4xl font-bold mb-2">
                  {daysUntilEvent !== null ? `${daysUntilEvent} days` : 'Event Date Set'}
                </div>
                <p className="text-lg">
                  {user.hyroxEventLocation && `${user.hyroxEventLocation} • `}
                  {format(new Date(user.hyroxEventDate), 'MMM d, yyyy')}
                </p>
                {user.targetTime && (
                  <p className="text-lg mt-2">Target Time: {user.targetTime}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Information */}
        <Card className="bg-white rounded-2xl shadow-sm border-0 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-gray-900">Profile Information</CardTitle>
              <Button 
                variant={isEditing ? "default" : "outline"}
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                disabled={updateProfileMutation.isPending}
              >
                {isEditing ? (updateProfileMutation.isPending ? "Saving..." : "Save") : "Edit"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="fitnessLevel">Fitness Level</Label>
              <Select 
                value={profileData.fitnessLevel} 
                onValueChange={(value) => setProfileData(prev => ({ ...prev, fitnessLevel: value }))}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fitness level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Hyrox Event Details */}
        <Card className="bg-white rounded-2xl shadow-sm border-0 mb-6">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Hyrox Event Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="eventDate">Event Date</Label>
              <Input
                id="eventDate"
                type="date"
                value={profileData.hyroxEventDate}
                onChange={(e) => setProfileData(prev => ({ ...prev, hyroxEventDate: e.target.value }))}
                disabled={!isEditing}
              />
            </div>

            <div>
              <Label htmlFor="eventLocation">Event Location</Label>
              <Input
                id="eventLocation"
                placeholder="e.g., London, UK"
                value={profileData.hyroxEventLocation}
                onChange={(e) => setProfileData(prev => ({ ...prev, hyroxEventLocation: e.target.value }))}
                disabled={!isEditing}
              />
            </div>

            <div>
              <Label htmlFor="targetTime">Target Time</Label>
              <Input
                id="targetTime"
                placeholder="e.g., 1:30:00"
                value={profileData.targetTime}
                onChange={(e) => setProfileData(prev => ({ ...prev, targetTime: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Current Program */}
        <Card className="bg-white rounded-2xl shadow-sm border-0 mb-6">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">Current Training Program</CardTitle>
          </CardHeader>
          <CardContent>
            {user?.currentProgramId && programs ? (
              <div className="space-y-4">
                {(() => {
                  const currentProgram = programs.find((p: any) => p.id === user.currentProgramId);
                  return currentProgram ? (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-lg">{currentProgram.name}</h3>
                      <p className="text-gray-600 mb-2">{currentProgram.description}</p>
                      <div className="flex space-x-4 text-sm text-gray-500">
                        <span>Duration: {currentProgram.duration} weeks</span>
                        <span>Difficulty: {currentProgram.difficulty}</span>
                        <span>Frequency: {currentProgram.frequency}x/week</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">Program not found</p>
                  );
                })()}
                
                <div>
                  <Label>Change Program</Label>
                  <Select onValueChange={(value) => changeProgramMutation.mutate(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a new program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((program: any) => (
                        <SelectItem key={program.id} value={program.id.toString()}>
                          {program.name} - {program.difficulty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No program selected</p>
                <Button onClick={() => window.location.href = "/assessment"}>
                  Take Assessment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card className="bg-white rounded-2xl shadow-sm border-0">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Contact Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Have questions, suggestions, or need help with your training? We're here to help!
            </p>
            
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  const subject = encodeURIComponent("Training App Support Request");
                  const body = encodeURIComponent(`Hi Hybrid X Team,

I'm writing regarding the training app. Please describe your question or issue below:

[Your message here]

User Details:
- Name: ${user?.firstName || ''} ${user?.lastName || ''}
- Email: ${user?.email || ''}
- Current Program: ${programs?.find((p: any) => p.id === user?.currentProgramId)?.name || 'Not selected'}

Thank you!`);
                  window.location.href = `mailto:training@hybridx.club?subject=${subject}&body=${body}`;
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Report an Issue
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  const subject = encodeURIComponent("Training Program Suggestion");
                  const body = encodeURIComponent(`Hi Hybrid X Team,

I have a suggestion for improving the training programs:

[Your suggestion here]

User Details:
- Name: ${user?.firstName || ''} ${user?.lastName || ''}
- Email: ${user?.email || ''}
- Current Program: ${programs?.find((p: any) => p.id === user?.currentProgramId)?.name || 'Not selected'}
- Fitness Level: ${user?.fitnessLevel || 'Not specified'}

Thank you for considering my feedback!`);
                  window.location.href = `mailto:training@hybridx.club?subject=${subject}&body=${body}`;
                }}
              >
                <Target className="h-4 w-4 mr-2" />
                Suggest Improvements
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  const subject = encodeURIComponent("General Inquiry - Hybrid X Training");
                  const body = encodeURIComponent(`Hi Hybrid X Team,

I have a general question about:

[Your question here]

User Details:
- Name: ${user?.firstName || ''} ${user?.lastName || ''}
- Email: ${user?.email || ''}

Looking forward to your response!`);
                  window.location.href = `mailto:training@hybridx.club?subject=${subject}&body=${body}`;
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                General Questions
              </Button>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Response Time:</strong> We typically respond within 24-48 hours during business days.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
      
      {/* Bottom spacing to prevent content from being hidden behind bottom nav */}
      <div className="h-16"></div>
      
      <BottomNav />
    </div>
  );
}