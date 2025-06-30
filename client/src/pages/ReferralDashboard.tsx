import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Share2, Users, Gift, TrendingUp } from "lucide-react";

interface ReferralStats {
  totalReferrals: number;
  qualifiedReferrals: number;
  pendingReferrals: number;
  freeMonthsEarned: number;
  referralCode: string;
}

interface ReferralCodeResponse {
  referralCode: string;
  referralUrl: string;
}

export default function ReferralDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [referralUrl, setReferralUrl] = useState("");

  // Fetch referral stats
  const { data: stats, isLoading: statsLoading } = useQuery<ReferralStats>({
    queryKey: ["/api/referral/stats"],
    enabled: isAuthenticated,
  });

  // Generate referral code mutation
  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/referral/generate-code");
    },
    onSuccess: (data: ReferralCodeResponse) => {
      setReferralUrl(data.referralUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/referral/stats"] });
      toast({
        title: "Referral Code Generated",
        description: "Your unique referral code is ready to share!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate referral code",
        variant: "destructive",
      });
    },
  });

  // Set referral URL when stats are loaded
  useEffect(() => {
    if (stats?.referralCode) {
      const currentDomain = window.location.origin;
      setReferralUrl(`${currentDomain}/join?ref=${stats.referralCode}`);
    }
  }, [stats]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const shareNative = async () => {
    const shareText = `I've been using HybridX for my HYROX training and it's been amazing! Join with my link and we both get rewarded: ${referralUrl}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join HybridX Training",
          text: shareText,
          url: referralUrl,
        });
      } catch (err) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard
      copyToClipboard(shareText);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please log in to access your referral dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Referral Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Share HybridX with friends and earn free months when they complete 2 months of training!
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.totalReferrals || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              People you've referred
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualified Referrals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.qualifiedReferrals || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Completed 2+ months
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.pendingReferrals || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Working towards reward
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Months Earned</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.freeMonthsEarned || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Months of free training
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Code Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Referral Code</CardTitle>
          <CardDescription>
            Share this code or link with friends to start earning rewards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats?.referralCode ? (
            <>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Referral Code</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      {stats.referralCode}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(stats.referralCode)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium">Share Link</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={referralUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-input bg-background text-sm rounded-md"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(referralUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareNative}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Suggested Message:</h4>
                <p className="text-sm text-muted-foreground">
                  "I've been using HybridX for my HYROX training and it's been amazing! 
                  Join with my link and we both get rewarded: {referralUrl}"
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                You don't have a referral code yet
              </p>
              <Button 
                onClick={() => generateCodeMutation.mutate()}
                disabled={generateCodeMutation.isPending}
              >
                {generateCodeMutation.isPending ? "Generating..." : "Generate Referral Code"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Referrals Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <h4 className="font-medium">Share Your Link</h4>
                <p className="text-sm text-muted-foreground">
                  Send your unique referral link to friends interested in HYROX training
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <h4 className="font-medium">They Sign Up</h4>
                <p className="text-sm text-muted-foreground">
                  Your friend creates an account using your referral link
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <h4 className="font-medium">They Train</h4>
                <p className="text-sm text-muted-foreground">
                  Your friend completes 2 months of paid training subscription
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                4
              </div>
              <div>
                <h4 className="font-medium">You Get Rewarded</h4>
                <p className="text-sm text-muted-foreground">
                  You automatically receive 1 free month of training added to your account
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}