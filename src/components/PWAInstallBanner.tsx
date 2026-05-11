// src/components/PWAInstallBanner.tsx
import { useState } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { cn } from "@/lib/utils";

/**
 * PWAInstallBanner
 *
 * Shows an unobtrusive install prompt banner when the PWA install criteria
 * are met. Dismissed state persists in sessionStorage so it doesn't re-appear
 * during the same session.
 *
 * Place this once near the root of your app, e.g. inside AppLayout or main.tsx.
 */
export function PWAInstallBanner() {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("pwa-banner-dismissed") === "true";
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem("pwa-banner-dismissed", "true");
    } catch {
      // sessionStorage unavailable — fail silently
    }
  };

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted" || outcome === "unavailable") {
      handleDismiss();
    }
  };

  // Don't render if already installed, not installable, or dismissed
  if (isInstalled || !isInstallable || dismissed) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50",
        "bg-card border border-border rounded-xl shadow-2xl p-4",
        "animate-in slide-in-from-bottom-4 fade-in duration-300"
      )}
      role="banner"
      aria-label="Install SimTrack app"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Install SimTrack</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            Add to your home screen for faster access and offline support.
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleInstall}
              className={cn(
                "flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5",
                "text-xs font-semibold text-primary-foreground",
                "hover:bg-primary/90 transition-colors"
              )}
            >
              <Download className="h-3.5 w-3.5" />
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Not now
            </button>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent transition-colors -mt-1 -mr-1"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}