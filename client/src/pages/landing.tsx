import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Zap, Award, Activity, Clock, TrendingUp } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="font-bold text-2xl text-white">
                HybridX<span className="text-yellow-400">.CLUB</span>
              </span>
            </div>
            <Button onClick={handleLogin} className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-full px-6">
              Explore Training Plans
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
              Stop Guessing. Start{" "}
              <span className="text-yellow-400">Dominating</span>. Your Ultimate Hybrid Training Blueprint Awaits.
            </h1>
            <p className="text-lg text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              Transform your fitness with scientifically-backed training plans, expert guidance, and our revolutionary app. Achieve peak performance, faster.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleLogin}
                size="lg"
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-10 py-4 rounded-full text-lg"
              >
                Explore Training Plans
              </Button>
              <Button 
                onClick={handleLogin}
                variant="outline"
                size="lg"
                className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black font-bold px-10 py-4 rounded-full text-lg"
              >
                Discover the App
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
              Your Path to Elite Hybrid Performance Starts Here
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Step into Elite. Our expertly designed plans are your roadmap to results.
            </p>
          </div>
        </div>
      </section>

      {/* Training Programs Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* Hybrid Running Mastery */}
            <div className="text-center">
              <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Activity className="w-10 h-10 text-black" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Hybrid Running Mastery</h3>
              <p className="text-gray-300 mb-6">
                Crush your next race with our running protocols with targeted strength work for 
                endurance-based race performance.
              </p>
              <Button 
                onClick={handleLogin}
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-full px-8 py-3"
              >
                GET RUNNING FIT
              </Button>
            </div>

            {/* Peak Cardio Engine */}
            <div className="text-center">
              <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-10 h-10 text-black" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Peak Cardio Engine</h3>
              <p className="text-gray-300 mb-6">
                Build an unstoppable cardiovascular engine.
                Develop challenging conditioning to maximize 
                stamina and recovery.
              </p>
              <Button 
                onClick={handleLogin}
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-full px-8 py-3"
              >
                BOOST CARDIO
              </Button>
            </div>

            {/* Strength & Power Blueprint */}
            <div className="text-center">
              <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="w-10 h-10 text-black" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Strength & Power Blueprint</h3>
              <p className="text-gray-300 mb-6">
                Forge functional power. Comprehensive 
                strength training designed for real demands of 
                hybrid competitions.
              </p>
              <Button 
                onClick={handleLogin}
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-full px-8 py-3"
              >
                BUILD STRENGTH
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
            Your Hybrid Coach,{" "}
            <span className="text-yellow-400">In Your Pocket, 24/7</span>
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Track every rep, every run, every win. Our smart app learns your patterns and adapts your training for maximum results.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-10 py-4 rounded-full text-lg"
          >
            Download App & Start Training
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