
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Check if user has previously dismissed the prompt
      try {
        const hasPromptBeenDismissed = localStorage.getItem('pwa-install-dismissed');
        const lastDismissed = localStorage.getItem('pwa-install-dismissed-date');
        
        // Show prompt if never dismissed or if it's been more than 7 days since last dismissal
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const shouldShow = !hasPromptBeenDismissed || 
          (lastDismissed && parseInt(lastDismissed) < sevenDaysAgo);
        
        if (shouldShow) {
          setShowInstallPrompt(true);
        }
      } catch (error) {
        console.error('Error checking PWA install prompt status:', error);
        // Default to showing prompt if localStorage fails
        setShowInstallPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    // Check if app is already installed
    const checkIfInstalled = () => {
      // Check if running in standalone mode (PWA)
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return;
      }
      
      // Check for various PWA indicators
      if ((window.navigator as any).standalone || 
          document.referrer.includes('android-app://') ||
          window.matchMedia('(display-mode: fullscreen)').matches) {
        setIsInstalled(true);
      }
    };

    checkIfInstalled();
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      // Clear any pending timeouts or intervals if they exist
      setDeferredPrompt(null);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setShowInstallPrompt(false);
      } else {
        console.log('User dismissed the install prompt');
        localStorage.setItem('pwa-install-dismissed', 'true');
        localStorage.setItem('pwa-install-dismissed-date', Date.now().toString());
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error during PWA installation:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
    localStorage.setItem('pwa-install-dismissed-date', Date.now().toString());
  };

  // Don't show if already installed or no prompt available
  if (isInstalled || !showInstallPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <Card className="border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Smartphone className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-yellow-800">Install HybridX</CardTitle>
                <CardDescription className="text-yellow-700">
                  Get the full app experience
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8 text-yellow-600 hover:text-yellow-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Offline access to workouts</li>
              <li>• Faster loading times</li>
              <li>• Push notifications</li>
              <li>• Native app experience</li>
            </ul>
            
            <div className="flex gap-2">
              <Button
                onClick={handleInstall}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Install App
              </Button>
              <Button
                variant="outline"
                onClick={handleDismiss}
                size="sm"
                className="text-yellow-700 border-yellow-300"
              >
                Not Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
