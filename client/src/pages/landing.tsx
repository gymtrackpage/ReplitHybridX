import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Trophy, Calendar, Dumbbell } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="font-bold text-xl text-white">HybridX</span>
            </div>
            <Button onClick={handleLogin} className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              It's Your
              <span className="text-yellow-400">
                {" "}Fitness Journey
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Professional training programs designed to help you achieve your Hyrox and fitness goals with the right training plan for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleLogin}
                size="lg"
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-8 py-3"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              From beginner to pro, our comprehensive platform adapts to your fitness level and goals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-gray-700 border-gray-600">
              <CardHeader className="text-center pb-4">
                <Users className="w-10 h-10 text-yellow-400 mx-auto mb-4" />
                <CardTitle className="text-white">Personalized Programs</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300 text-center">
                  AI-powered program selection based on your fitness level and goals.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-gray-700 border-gray-600">
              <CardHeader className="text-center pb-4">
                <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-4" />
                <CardTitle className="text-white">Progress Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300 text-center">
                  Monitor your improvements and celebrate your achievements.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-gray-700 border-gray-600">
              <CardHeader className="text-center pb-4">
                <Calendar className="w-10 h-10 text-yellow-400 mx-auto mb-4" />
                <CardTitle className="text-white">Smart Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300 text-center">
                  Flexible workout scheduling that fits your lifestyle.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-gray-700 border-gray-600">
              <CardHeader className="text-center pb-4">
                <Dumbbell className="w-10 h-10 text-yellow-400 mx-auto mb-4" />
                <CardTitle className="text-white">Expert Coaching</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300 text-center">
                  Professional guidance from certified Hyrox trainers.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Fitness?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of athletes who have already started their journey with HybridX.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-8 py-3"
          >
            Start Your Journey Today
          </Button>
        </div>
      </section>
    </div>
  );
}