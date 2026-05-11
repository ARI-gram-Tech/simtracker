// src/hooks/useIsMobile.ts
import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768; // md

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    setIsMobile(mql.matches);

    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      window.innerWidth >= MOBILE_BREAKPOINT &&
      window.innerWidth < 1024
  );

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: 1023px)`);
    const handler = (e: MediaQueryListEvent) => setIsTablet(e.matches);
    mql.addEventListener("change", handler);
    setIsTablet(mql.matches);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isTablet;
}