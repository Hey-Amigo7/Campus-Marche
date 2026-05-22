"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

type ToastContextValue = {
  toast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const toast = useCallback((nextMessage: string) => {
    setMessage(nextMessage);
    window.setTimeout(() => setMessage(null), 3200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <div className="fixed bottom-24 left-1/2 z-50 flex w-[calc(100%-32px)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl border border-green-100 bg-white p-4 text-sm font-semibold text-slate-800 shadow-2xl md:bottom-8">
          <CheckCircle2 className="h-5 w-5 text-brand-green" />
          <span className="min-w-0 flex-1">{message}</span>
          <button aria-label="Dismiss toast" onClick={() => setMessage(null)} className="rounded-full p-1 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
