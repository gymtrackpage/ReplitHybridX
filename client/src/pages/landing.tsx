import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Zap, Award, Activity, Clock, TrendingUp } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    console.log("Initiating login redirect");
    // Use /api/auth/login for consistency with custom login page
    window.location.href = "/api/auth/login";
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px:8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img 
                src="/logo-x.png" 
                alt="HybridX Logo" 
                className="h-8 w-8"
                onError={(e) => {
                  console.error('Logo failed to load:', e);
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="font-bold text-2xl text-white">
                HybridX<span className="text-yellow-400">.CLUB</span>
              </span>
            </div>
            <Button onClick={handleLogin} className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-full px-6">
              Launch App
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
              Your Complete{" "}
              <span className="text-yellow-400">Hybrid Training</span> App Experience Awaits.
            </h1>
            <p className="text-lg text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              Track workouts, monitor progress, share achievements to Strava, and follow personalized training programs—all in one powerful app designed for hybrid athletes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleLogin}
                size="lg"
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-10 py-4 rounded-full text-lg"
              >
                Start Training Today
              </Button>
              <Button 
                onClick={handleLogin}
                variant="outline"
                size="lg"
                className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black font-bold px-10 py-4 rounded-full text-lg"
              >
                View App Features
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Path Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-950">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-16">
            <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Target className="w-8 h-8 text-black" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Everything You Need in One Powerful Training App
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Smart workout tracking, personalized programs, and seamless integration with your favorite fitness platforms.
            </p>
          </div>
        </div>
      </section>

      {/* Training Programs Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

            {/* Smart Workout Tracking */}
            <div className="text-center">
              <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Activity className="w-10 h-10 text-black" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Smart Workout Tracking</h3>
              <p className="text-gray-300 mb-6">
                Log sets, reps, and duration with our intuitive interface. Track your progress across all exercises with detailed workout completion data and performance metrics.
              </p>
              <Button 
                onClick={handleLogin}
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-full px-8 py-3"
              >
                Track Workouts
              </Button>
            </div>

            {/* Strava Integration */}
            <div className="text-center">
              <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-10 h-10 text-black" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Strava Integration</h3>
              <p className="text-gray-300 mb-6">
                Automatically share your completed workouts to Strava with custom workout images and detailed exercise breakdowns. Seamlessly connect your training data.
              </p>
              <Button 
                onClick={handleLogin}
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-full px-8 py-3"
              >
                Connect Strava
              </Button>
            </div>

            {/* Personalized Programs */}
            <div className="text-center">
              <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="w-10 h-10 text-black" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Personalized Programs</h3>
              <p className="text-gray-300 mb-6">
                Get matched with training programs based on your fitness assessment. Follow structured weekly schedules with beginner to advanced progressions.
              </p>
              <Button 
                onClick={handleLogin}
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-full px-8 py-3"
              >
                Find Your Program
              </Button>
            </div>

          </div>
        </div>
      </section>

      {/* Coaching CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-950">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-black" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Your Training Data,{" "}
            <span className="text-yellow-400">Organized & Accessible</span>
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Monitor your progress with detailed analytics, view your workout history, and access your training calendar anytime. All your fitness data in one comprehensive dashboard.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-10 py-4 rounded-full text-lg"
          >
            Access Your Dashboard
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2025 HybridX.CLUB - Elite Hybrid Training Platform
          </p>
        </div>
      </footer>
    </div>
  );
}