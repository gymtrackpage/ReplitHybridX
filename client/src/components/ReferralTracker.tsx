
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, Gift } from "lucide-react";

interface ReferralStats {
  totalReferrals: number;
  qualifiedReferrals: number;
  pendingReferrals: number;
  freeMonthsEarned: number;
  referralCode: string;
}

export function ReferralTracker() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReferralStats();
  }, []);

  const fetchReferralStats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/referrals/stats", {
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error("Failed to fetch referral stats");
      }
    } catch (error) {
      console.error("Error fetching referral stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    if (stats?.referralCode) {
      navigator.clipboard.writeText(stats.referralCode);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Referral Program
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Referral Program
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground">Referral program not available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Referral Program
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <p className="text-sm font-medium">Your Referral Code</p>
            <p className="text-lg font-mono">{stats.referralCode}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={copyReferralCode}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.totalReferrals}</div>
            <div className="text-sm text-muted-foreground">Total Referrals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.qualifiedReferrals}</div>
            <div className="text-sm text-muted-foreground">Qualified</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            <span className="text-sm">Free Months Earned</span>
          </div>
          <Badge variant="secondary">{stats.freeMonthsEarned}</Badge>
        </div>

        {stats.pendingReferrals > 0 && (
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm">
              <strong>{stats.pendingReferrals}</strong> referrals pending qualification
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
