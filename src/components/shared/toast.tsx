"use client";

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-green-500/30 bg-green-50 text-green-800 dark:bg-green-950/60 dark:text-green-200",
  error: "border-red-500/30 bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-200",
  info: "border-[var(--color-brand-teal)]/30 bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200",
};

const VARIANT_ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />,
  error: <XCircle className="h-4 w-4 shrink-0 text-red-500" />,
  info: <Info className="h-4 w-4 shrink-0 text-[var(--color-brand-teal)]" />,
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-in
    const enterTimer = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss after 3s
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 3000);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast.id, onDismiss]);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg text-sm font-medium",
        "transition-all duration-300 ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        VARIANT_STYLES[toast.variant]
      )}
    >
      {VARIANT_ICONS[toast.variant]}
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container — bottom-right */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none w-80">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
