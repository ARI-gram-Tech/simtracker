// src/components/layout/MobileDrawerOverlay.tsx
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface MobileDrawerOverlayProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function MobileDrawerOverlay({ open, onClose, children }: MobileDrawerOverlayProps) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-72 bg-card shadow-2xl transition-transform duration-300 ease-in-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </>
  );
}