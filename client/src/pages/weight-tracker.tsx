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
import { Scale, TrendingDown, TrendingUp, Plus, Target } from "lucide-react";
import { WeightEntry } from "@shared/schema";
import { format } from "date-fns";

export default function WeightTracker() {
  const { toast } = useToast();
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    weight: "",
    date: new Date().toISOString().split('T')[0],
    notes: ""
  });

  const { data: weightEntries = [], isLoading } = useQuery({
    queryKey: ["/api/weight-entries"],
  });

  const addEntryMutation = useMutation({
    mutationFn: async (entry: typeof newEntry) => {
      const response = await apiRequest("POST", "/api/weight-entries", {
        weight: parseFloat(entry.weight),
        recordedAt: entry.date,
        notes: entry.notes.trim() || null
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
  const sortedEntries = [...weightEntries].sort((a: WeightEntry, b: WeightEntry) => 
    new Date(b.recordedAt || '').getTime() - new Date(a.recordedAt || '').getTime()
  );
  
  const currentWeight = sortedEntries[0] ? parseFloat(sortedEntries[0].weight) : 0;
  const previousWeight = sortedEntries[1] ? parseFloat(sortedEntries[1].weight) : currentWeight;
  const weightChange = currentWeight - previousWeight;
  const startWeight = sortedEntries[sortedEntries.length - 1] ? parseFloat(sortedEntries[sortedEntries.length - 1].weight) : currentWeight;
  const totalChange = currentWeight - startWeight;

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Target className="h-4 w-4 text-gray-500" />;
  };

  const getTrendBadge = (change: number) => {
    if (change > 0) return <Badge variant="destructive">+{change.toFixed(1)} lbs</Badge>;
    if (change < 0) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">{change.toFixed(1)} lbs</Badge>;
    return <Badge variant="secondary">No change</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Weight Tracker</h1>
            <p className="text-gray-600 dark:text-gray-300">Monitor your progress towards your fitness goals</p>
          </div>
          <Button onClick={() => setIsAddingEntry(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Weight</CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentWeight.toFixed(1)} lbs</div>
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
              <div className="text-2xl font-bold">{Math.abs(weightChange).toFixed(1)} lbs</div>
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
              <div className="text-2xl font-bold">{Math.abs(totalChange).toFixed(1)} lbs</div>
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
              <div className="text-2xl font-bold">{weightEntries.length}</div>
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
                    <Label htmlFor="weight">Weight (lbs)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="Enter weight"
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
            ) : weightEntries.length === 0 ? (
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
                    const currentWeight = parseFloat(entry.weight);
                    const previousEntry = sortedEntries[index + 1];
                    const previousWeight = previousEntry ? parseFloat(previousEntry.weight) : currentWeight;
                    const change = previousEntry ? currentWeight - previousWeight : 0;
                    
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div className="font-medium">
                            {entry.recordedAt ? format(new Date(entry.recordedAt), 'MMM dd, yyyy') : 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{currentWeight.toFixed(1)} lbs</div>
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
    </div>
  );
}