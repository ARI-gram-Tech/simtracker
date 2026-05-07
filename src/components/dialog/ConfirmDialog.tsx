// src/components/dialog/ConfirmDialog.tsx
import { ReactNode } from "react";
import { X, AlertTriangle, CheckCircle, Info, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfirmVariant = "default" | "danger" | "warning" | "success" | "info";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  icon?: ReactNode;
}

const variantConfig = {
  default: {
    confirmBg: "bg-primary",
    confirmHover: "hover:opacity-90",
    confirmText: "text-primary-foreground",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    Icon: Info,
  },
  danger: {
    confirmBg: "bg-destructive",
    confirmHover: "hover:bg-destructive/90",
    confirmText: "text-destructive-foreground",
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    Icon: Trash2,
  },
  warning: {
    confirmBg: "bg-warning",
    confirmHover: "hover:bg-warning/90",
    confirmText: "text-warning-foreground",
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    Icon: AlertTriangle,
  },
  success: {
    confirmBg: "bg-success",
    confirmHover: "hover:bg-success/90",
    confirmText: "text-success-foreground",
    iconBg: "bg-success/10",
    iconColor: "text-success",
    Icon: CheckCircle,
  },
  info: {
    confirmBg: "bg-primary",
    confirmHover: "hover:opacity-90",
    confirmText: "text-primary-foreground",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    Icon: Info,
  },
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  icon,
}: ConfirmDialogProps) {
  if (!open) return null;

  const config = variantConfig[variant];
  const DefaultIcon = config.Icon;
  const hasCustomIcon = icon !== undefined;
  const iconElement = hasCustomIcon ? icon : <DefaultIcon className={cn("h-5 w-5", config.iconColor)} />;

  const handleConfirm = async () => {
    await onConfirm();
    // Don't auto-close here - let the parent handle it after async operation
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", config.iconBg)}>
              {iconElement}
            </div>
            <h3 className="font-heading text-lg font-semibold">{title}</h3>
          </div>
          <button 
            onClick={onClose} 
            disabled={loading}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>

        <div className="flex gap-2 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
              config.confirmBg,
              config.confirmHover,
              config.confirmText
            )}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}