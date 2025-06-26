
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function CustomLogin() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    // Redirect to your custom auth endpoint that handles OIDC flow
    window.location.href = "/api/auth/login";
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/logo-x.png" 
              alt="HybridX Logo" 
              className="h-12 w-12"
              onError={(e) => {
                e.currentTarget.src = '/icon-192.png';
              }}
            />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Welcome to HybridX
          </CardTitle>
          <CardDescription className="text-gray-400">
            Sign in to access your personalized HYROX training programs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in with Replit"
            )}
          </Button>
          
          <div className="text-center text-sm text-gray-500">
            <p>Secure authentication powered by Replit</p>
          </div>
          
          <div className="border-t border-gray-700 pt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-yellow-400 font-bold">Personalized</div>
                <div className="text-xs text-gray-500">Programs</div>
              </div>
              <div>
                <div className="text-yellow-400 font-bold">Track</div>
                <div className="text-xs text-gray-500">Progress</div>
              </div>
              <div>
                <div className="text-yellow-400 font-bold">Share</div>
                <div className="text-xs text-gray-500">to Strava</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
