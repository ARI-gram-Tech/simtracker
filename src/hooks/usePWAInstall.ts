// src/hooks/usePWAInstall.ts
import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

interface UsePWAInstallReturn {
  /** True when the browser has fired the install prompt and it's available */
  isInstallable: boolean;
  /** True when the app is already running in standalone mode (already installed) */
  isInstalled: boolean;
  /** Call this to show the native install prompt */
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable]   = useState(false);

  // Detect if already installed (standalone display mode)
  const isInstalled =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent Chrome from showing the mini-infobar automatically
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // If the user installs via browser UI, clear our state
    window.addEventListener("appinstalled", () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const promptInstall = async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferredPrompt) return "unavailable";

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    // The prompt can only be used once
    setDeferredPrompt(null);
    setIsInstallable(false);

    return outcome;
  };

  return { isInstallable, isInstalled, promptInstall };
}