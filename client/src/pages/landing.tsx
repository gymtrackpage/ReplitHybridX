import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Trophy, Calendar, Dumbbell } from "lucide-react";
import logoFull from "@assets/white full logo.png";
import logoIcon from "@assets/Icon Logo-1.png";

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
              <img src={logoIcon} alt="HybridX" className="h-8 w-8 mr-3" />
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
            <div className="mb-8">
              <img src={logoFull} alt="HybridX Club" className="h-32 mx-auto mb-6" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              It's Your
              <span className="text-yellow-400">
                {" "}Fitness Journey
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Professional personal training programs designed to help you achieve your fitness goals with expert guidance and personalized workouts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleLogin}
                size="lg"
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-8 py-3"
              >
                Start Your Journey
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-gray-600 text-gray-300 hover:bg-gray-800 px-8 py-3"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Choose HybridX?
            </h2>
            <p className="text-xl text-gray-400">
              Everything you need to reach your fitness goals
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center bg-gray-700 border-gray-600 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-400/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-yellow-400" />
                </div>
                <CardTitle className="text-white">Expert Trainers</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Work with certified personal trainers who design programs specifically for your goals and fitness level.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center bg-gray-700 border-gray-600 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-400/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-6 w-6 text-yellow-400" />
                </div>
                <CardTitle className="text-white">Personalized Programs</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Get custom workout plans based on your fitness assessment, schedule, and equipment availability.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center bg-gray-700 border-gray-600 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-400/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Trophy className="h-6 w-6 text-yellow-400" />
                </div>
                <CardTitle className="text-white">Track Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Monitor your progress with detailed analytics, workout completion tracking, and achievement badges.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join thousands of members who have transformed their lives with HybridX
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-8 py-3"
          >
            Sign Up Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <img src={logoIcon} alt="HybridX" className="h-6 w-6 mr-2" />
            <span className="font-semibold text-white">HybridX</span>
            <span className="text-gray-400 ml-4">
              © 2024 All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
