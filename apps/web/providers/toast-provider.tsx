"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export type Toast = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
};

type ToastInput = Omit<Toast, "id"> | string;

type ToastApi = {
  toast: (opts: ToastInput) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES: Record<ToastType, { icon: string; border: string; bg: string }> = {
  success: {
    icon: "#5A9460",
    border: "rgba(127,182,133,0.35)",
    bg: "rgba(223,243,227,0.96)",
  },
  error: {
    icon: "#DC2626",
    border: "rgba(220,38,38,0.30)",
    bg: "rgba(254,242,242,0.96)",
  },
  warning: {
    icon: "#D97706",
    border: "rgba(217,119,6,0.30)",
    bg: "rgba(255,251,235,0.96)",
  },
  info: {
    icon: "#0F172A",
    border: "rgba(15,23,42,0.18)",
    bg: "rgba(248,250,252,0.96)",
  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const Icon = ICONS[toast.type];
  const s = STYLES[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      role="alert"
      style={{
        background: s.bg,
        backdropFilter: "blur(20px) saturate(180%)",
        border: `1px solid ${s.border}`,
        boxShadow: "0 8px 32px rgba(15,23,42,0.12)",
      }}
      className="flex w-full max-w-sm items-start gap-3 rounded-2xl p-4 text-sm"
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: s.icon }} />
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-tight" style={{ color: "#0F172A" }}>{toast.title}</p>
        {toast.message ? (
          <p className="mt-1 leading-snug" style={{ color: "#475569" }}>{toast.message}</p>
        ) : null}
      </div>
      <button
        aria-label="Dismiss"
        onClick={() => onDismiss(toast.id)}
        className="mt-0.5 shrink-0 rounded-full p-0.5 transition-colors hover:bg-black/[0.06]"
        style={{ color: "#94A3B8" }}
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const opts: Omit<Toast, "id"> = typeof input === "string"
      ? { type: "success", title: input }
      : input;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const duration = opts.duration ?? (opts.type === "error" ? 6000 : 4000);
    setToasts((prev) => [{ ...opts, id }, ...prev].slice(0, 5));
    const t = setTimeout(() => dismiss(id), duration);
    timers.current.set(id, t);
  }, [dismiss]);

  const success = useCallback((title: string, message?: string) => toast({ type: "success", title, message }), [toast]);
  const error   = useCallback((title: string, message?: string) => toast({ type: "error",   title, message }), [toast]);
  const warning = useCallback((title: string, message?: string) => toast({ type: "warning", title, message }), [toast]);
  const info    = useCallback((title: string, message?: string) => toast({ type: "info",    title, message }), [toast]);

  const value = useMemo(() => ({ toast, success, error, warning, info, dismiss }), [toast, success, error, warning, info, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="assertive"
        className="pointer-events-none fixed right-4 top-4 z-[200] flex w-full max-w-sm flex-col gap-2.5 md:right-6 md:top-6"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
