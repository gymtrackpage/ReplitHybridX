import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Share, ExternalLink } from 'lucide-react';

interface ShareToStravaButtonProps {
  workoutId: number;
  workoutName: string;
  defaultDuration?: number;
  className?: string;
}

export function ShareToStravaButton({ 
  workoutId, 
  workoutName, 
  defaultDuration,
  className 
}: ShareToStravaButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState(defaultDuration?.toString() || '60');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check Strava connection status
  const { data: stravaStatus } = useQuery({
    queryKey: ['/api/strava/status'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const shareToStravaMutation = useMutation({
    mutationFn: async ({ workoutId, duration, notes }: { 
      workoutId: number; 
      duration: number; 
      notes: string; 
    }) => {
      const response = await apiRequest('POST', '/api/strava/push-workout', {
        workoutId,
        duration: duration * 60, // Convert to seconds
        notes
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: data.message || "Workout shared to Strava successfully",
      });
      setIsOpen(false);
      setNotes('');
    },
    onError: (error: any) => {
      if (error.needsAuth) {
        toast({
          title: "Connect Strava",
          description: error.message || "Please connect your Strava account first",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to share workout to Strava",
          variant: "destructive",
        });
      }
    },
  });

  const connectStravaMutation = useMutation({
    mutationFn: async () => {
      console.log("Requesting Strava connection...");
      const response = await apiRequest('GET', '/api/strava/connect');
      return response;
    },
    onSuccess: (data) => {
      console.log("Strava connect response:", data);
      if (data.authUrl) {
        console.log("Opening Strava auth URL:", data.authUrl);
        window.open(data.authUrl, '_blank', 'width=600,height=700');
      } else if (!data.configured) {
        toast({
          title: "Configuration Required",
          description: "Strava integration is not configured. Please contact admin.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error("Strava connect error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to get Strava authorization URL",
        variant: "destructive",
      });
    },
  });

  const handleConnectStrava = () => {
    connectStravaMutation.mutate();
  };

  const handleShare = () => {
    shareToStravaMutation.mutate({
      workoutId,
      duration: parseInt(duration) || 60,
      notes: notes.trim() || `Completed ${workoutName} - HybridX Training`
    });
  };

  if (!stravaStatus?.connected) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleConnectStrava}
        disabled={connectStravaMutation.isPending}
        className={className}
      >
        <ExternalLink className="w-4 h-4 mr-2" />
        {connectStravaMutation.isPending ? "Connecting..." : "Connect Strava"}
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
        >
          <Share className="w-4 h-4 mr-2" />
          Share to Strava
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share to Strava</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="workout-name" className="text-right">
              Workout
            </Label>
            <div className="col-span-3 text-sm text-muted-foreground">
              {workoutName}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="text-right">
              Duration (min)
            </Label>
            <Input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="col-span-3"
              min="1"
              max="300"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Add notes about your workout..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={shareToStravaMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleShare}
            disabled={shareToStravaMutation.isPending}
          >
            {shareToStravaMutation.isPending ? "Sharing..." : "Share to Strava"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}