import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Scale, TrendingDown, TrendingUp, Plus, Target, Dumbbell } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { WeightEntry } from "@shared/schema";
import { format } from "date-fns";

export default function WeightTracker() {
  const { toast } = useToast();
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [displayUnit, setDisplayUnit] = useState<'lbs' | 'kg'>('lbs'); // Toggle between lbs and kg
  const [newEntry, setNewEntry] = useState({
    weight: "",
    date: new Date().toISOString().split('T')[0],
    notes: ""
  });

  const { data: weightEntries = [], isLoading } = useQuery({
    queryKey: ["/api/weight-entries"],
  });

  // Conversion functions
  const lbsToKg = (lbs: number) => lbs * 0.453592;
  const kgToLbs = (kg: number) => kg * 2.20462;

  // Convert weight based on display unit (weights are stored in lbs in database)
  const convertWeight = (weight: number, toUnit: 'lbs' | 'kg') => {
    if (toUnit === 'kg') {
      return lbsToKg(weight);
    }
    return weight; // Already in lbs
  };

  // Convert weight input for storage (always store as lbs)
  const convertInputWeight = (weight: number, fromUnit: 'lbs' | 'kg') => {
    if (fromUnit === 'kg') {
      return kgToLbs(weight);
    }
    return weight; // Already in lbs
  };

  const addEntryMutation = useMutation({
    mutationFn: async (entry: typeof newEntry) => {
      const inputWeight = parseFloat(entry.weight);
      const storageWeight = convertInputWeight(inputWeight, displayUnit);
      const response = await apiRequest("POST", "/api/weight-entries", {
        weight: storageWeight,
        recordedAt: entry.date,
        unit: displayUnit
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weight-entries"] });
      setNewEntry({ weight: "", date: new Date().toISOString().split('T')[0], notes: "" });
      setIsAddingEntry(false);
      toast({
        title: "Weight Entry Added",
        description: "Your weight has been recorded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add weight entry.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.weight || parseFloat(newEntry.weight) <= 0) {
      toast({
        title: "Invalid Weight",
        description: "Please enter a valid weight value.",
        variant: "destructive",
      });
      return;
    }
    addEntryMutation.mutate(newEntry);
  };

  // Calculate stats
  const sortedEntries = Array.isArray(weightEntries) ? [...weightEntries].sort((a: WeightEntry, b: WeightEntry) => 
    new Date(b.recordedAt || '').getTime() - new Date(a.recordedAt || '').getTime()
  ) : [];
  
  const currentWeightLbs = sortedEntries[0] ? parseFloat(sortedEntries[0].weight) : 0;
  const previousWeightLbs = sortedEntries[1] ? parseFloat(sortedEntries[1].weight) : currentWeightLbs;
  const startWeightLbs = sortedEntries[sortedEntries.length - 1] ? parseFloat(sortedEntries[sortedEntries.length - 1].weight) : currentWeightLbs;
  
  // Convert to display unit
  const currentWeight = convertWeight(currentWeightLbs, displayUnit);
  const previousWeight = convertWeight(previousWeightLbs, displayUnit);
  const startWeight = convertWeight(startWeightLbs, displayUnit);
  const weightChange = currentWeight - previousWeight;
  const totalChange = currentWeight - startWeight;

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Target className="h-4 w-4 text-gray-500" />;
  };

  const getTrendBadge = (change: number) => {
    if (change > 0) return <Badge variant="destructive">+{change.toFixed(1)} {displayUnit}</Badge>;
    if (change < 0) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">{change.toFixed(1)} {displayUnit}</Badge>;
    return <Badge variant="secondary">No change</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header with Logo */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-lg p-2">
              <Dumbbell className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Hybrid X</h1>
              <p className="text-xs text-gray-500">Training Platform</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6 p-4 pb-20">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Weight Tracker</h1>
            <p className="text-gray-600">Monitor your progress towards your fitness goals</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Unit Toggle */}
            <div className="flex items-center space-x-2">
              <Label htmlFor="unit-toggle" className="text-sm font-medium">lbs</Label>
              <Switch
                id="unit-toggle"
                checked={displayUnit === 'kg'}
                onCheckedChange={(checked) => setDisplayUnit(checked ? 'kg' : 'lbs')}
              />
              <Label htmlFor="unit-toggle" className="text-sm font-medium">kg</Label>
            </div>
            <Button onClick={() => setIsAddingEntry(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Weight</CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentWeight.toFixed(1)} {displayUnit}</div>
              <p className="text-xs text-muted-foreground">
                Latest recorded weight
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Change</CardTitle>
              {getTrendIcon(weightChange)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.abs(weightChange).toFixed(1)} {displayUnit}</div>
              <div className="flex items-center gap-2 mt-1">
                {getTrendBadge(weightChange)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Change</CardTitle>
              {getTrendIcon(totalChange)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.abs(totalChange).toFixed(1)} {displayUnit}</div>
              <div className="flex items-center gap-2 mt-1">
                {getTrendBadge(totalChange)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Array.isArray(weightEntries) ? weightEntries.length : 0}</div>
              <p className="text-xs text-muted-foreground">
                Weight recordings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Add Entry Form */}
        {isAddingEntry && (
          <Card>
            <CardHeader>
              <CardTitle>Add Weight Entry</CardTitle>
              <CardDescription>Record your current weight and any notes</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight ({displayUnit})</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder={`Enter weight in ${displayUnit}`}
                      value={newEntry.weight}
                      onChange={(e) => setNewEntry({ ...newEntry, weight: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newEntry.date}
                      onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional notes about your weight measurement..."
                    value={newEntry.notes}
                    onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={addEntryMutation.isPending}>
                    {addEntryMutation.isPending ? "Adding..." : "Add Entry"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddingEntry(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Weight History */}
        <Card>
          <CardHeader>
            <CardTitle>Weight History</CardTitle>
            <CardDescription>
              Your weight tracking history over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : !Array.isArray(weightEntries) || weightEntries.length === 0 ? (
              <div className="text-center py-8">
                <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No weight entries yet</h3>
                <p className="text-muted-foreground mb-4">Start tracking your weight to monitor your progress</p>
                <Button onClick={() => setIsAddingEntry(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Entry
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEntries.map((entry: WeightEntry, index: number) => {
                    const currentWeightLbs = parseFloat(entry.weight);
                    const previousEntry = sortedEntries[index + 1];
                    const previousWeightLbs = previousEntry ? parseFloat(previousEntry.weight) : currentWeightLbs;
                    
                    // Convert to display unit
                    const currentWeight = convertWeight(currentWeightLbs, displayUnit);
                    const previousWeight = convertWeight(previousWeightLbs, displayUnit);
                    const change = previousEntry ? currentWeight - previousWeight : 0;
                    
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div className="font-medium">
                            {entry.recordedAt ? format(new Date(entry.recordedAt), 'MMM dd, yyyy') : 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{currentWeight.toFixed(1)} {displayUnit}</div>
                        </TableCell>
                        <TableCell>
                          {index < sortedEntries.length - 1 ? (
                            <div className="flex items-center gap-2">
                              {getTrendIcon(change)}
                              <span className={`text-sm font-medium ${
                                change > 0 ? 'text-red-600' : 
                                change < 0 ? 'text-green-600' : 'text-gray-600'
                              }`}>
                                {change !== 0 ? `${change > 0 ? '+' : ''}${change.toFixed(1)}` : '—'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">First entry</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground max-w-xs truncate">
                            {entry.notes || '—'}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Bottom spacing to prevent content from being hidden behind bottom nav */}
      <div className="h-16"></div>
      
      <BottomNav />
    </div>
  );
}