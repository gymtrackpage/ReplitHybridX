
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Dumbbell, Target, Trophy, Users } from "lucide-react";

export default function CustomLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);

  const features = [
    { icon: Target, text: "Personalized Programs", desc: "AI-powered training" },
    { icon: Dumbbell, text: "Track Progress", desc: "Comprehensive analytics" },
    { icon: Trophy, text: "Share to Strava", desc: "Connect with community" },
    { icon: Users, text: "Expert Support", desc: "Get guidance when needed" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = () => {
    setIsLoading(true);
    // Redirect to your custom auth endpoint that handles OIDC flow
    window.location.href = "/api/auth/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 bg-yellow-400 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-yellow-600 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-3xl opacity-20 animate-spin" style={{ animationDuration: '20s' }}></div>
      </div>

      <Card className="w-full max-w-md bg-gray-900/90 backdrop-blur-xl border-gray-800/50 shadow-2xl relative z-10">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-lg opacity-30 animate-pulse"></div>
            <img 
              src="/logo-x.png" 
              alt="HybridX Logo" 
              className="h-16 w-16 relative z-10 drop-shadow-lg"
              onError={(e) => {
                e.currentTarget.src = '/icon-192.png';
              }}
            />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
            Welcome to HybridX
          </CardTitle>
          <CardDescription className="text-gray-400 text-base leading-relaxed">
            Join thousands of athletes training smarter with personalized HYROX programs
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Enhanced login button */}
          <Button 
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold text-lg py-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-yellow-500/25"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Trophy className="mr-3 h-5 w-5" />
                Start Your Journey
              </>
            )}
          </Button>

          {/* Security badge */}
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-900/30 border border-green-700/50 text-green-400 text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              Secure authentication via Replit
            </div>
          </div>

          {/* Animated features showcase */}
          <div className="border-t border-gray-700/50 pt-6">
            <div className="h-20 flex items-center justify-center">
              <div className="text-center transition-all duration-500 ease-in-out">
                <div className="flex items-center justify-center mb-2">
                  {React.createElement(features[currentFeature].icon, {
                    className: "h-8 w-8 text-yellow-400 animate-bounce"
                  })}
                </div>
                <div className="text-yellow-400 font-bold text-lg">
                  {features[currentFeature].text}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {features[currentFeature].desc}
                </div>
              </div>
            </div>

            {/* Feature indicators */}
            <div className="flex justify-center space-x-2 mt-4">
              {features.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentFeature
                      ? "bg-yellow-400 w-8"
                      : "bg-gray-600"
                  }`}
                ></div>
              ))}
            </div>
          </div>

          {/* Social proof */}
          <div className="text-center pt-4">
            <div className="text-xs text-gray-500 mb-2">Trusted by athletes worldwide</div>
            <div className="flex justify-center items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-8 h-8 bg-gray-700 rounded-full border-2 border-gray-600 flex items-center justify-center">
                  <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"></div>
                </div>
              ))}
              <span className="text-yellow-400 text-sm font-medium ml-2">+2.5k athletes</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
