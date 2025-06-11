import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Dumbbell, TrendingUp, Target } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="font-bold text-xl">HybridX</span>
            </div>
            <Button onClick={handleLogout} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}!
          </h1>
          <p className="text-muted-foreground">
            Ready to continue your fitness journey?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Workout</CardTitle>
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Upper Body Power</div>
              <p className="text-xs text-muted-foreground">45 minutes • Intermediate</p>
              <Button className="w-full mt-4">Start Workout</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weekly Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4/5</div>
              <p className="text-xs text-muted-foreground">Workouts completed this week</p>
              <Button variant="outline" className="w-full mt-4">View Details</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Event</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12 weeks</div>
              <p className="text-xs text-muted-foreground">Until your Hyrox event</p>
              <Button variant="outline" className="w-full mt-4">Adjust Plan</Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your last 5 workouts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Lower Body Strength</p>
                    <p className="text-sm text-muted-foreground">Yesterday • 50 min</p>
                  </div>
                  <div className="text-sm font-medium text-green-600">Completed</div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Cardio Endurance</p>
                    <p className="text-sm text-muted-foreground">2 days ago • 35 min</p>
                  </div>
                  <div className="text-sm font-medium text-green-600">Completed</div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Functional Movement</p>
                    <p className="text-sm text-muted-foreground">3 days ago • 40 min</p>
                  </div>
                  <div className="text-sm font-medium text-green-600">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and navigation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                View Calendar
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Target className="mr-2 h-4 w-4" />
                Browse Programs
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <TrendingUp className="mr-2 h-4 w-4" />
                Track Progress
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Dumbbell className="mr-2 h-4 w-4" />
                Random Workout
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}