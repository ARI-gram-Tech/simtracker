// src/registerSW.ts
// Call this once in main.tsx: import "./registerSW";

export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("[SimTrack] SW registered:", reg.scope))
        .catch((err) => console.warn("[SimTrack] SW registration failed:", err));
    });
  }
}