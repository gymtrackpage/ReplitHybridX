import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

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
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Today's Workout</h2>
            <p className="text-muted-foreground mb-4">Your scheduled training session</p>
            <Button className="w-full">View Workout</Button>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Progress</h2>
            <p className="text-muted-foreground mb-4">Track your improvements</p>
            <Button variant="outline" className="w-full">View Progress</Button>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Programs</h2>
            <p className="text-muted-foreground mb-4">Manage your training programs</p>
            <Button variant="outline" className="w-full">View Programs</Button>
          </div>
        </div>
      </main>
    </div>
  );
}