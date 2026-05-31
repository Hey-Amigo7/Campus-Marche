"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, RefreshCw, WifiOff, X } from "lucide-react";
import { useState } from "react";
import { useSystemHealth } from "@/hooks/use-system-health";

const spring = { type: "spring", stiffness: 380, damping: 28 } as const;

export function SystemStatusBanner() {
  const { status, lastChecked } = useSystemHealth();
  const [dismissed, setDismissed] = useState(false);

  // Auto-undismiss when status changes
  const visible = !dismissed && (status === "down" || status === "degraded");

  // Reset dismissed state when the server comes back up
  if (status === "ok" && dismissed) setDismissed(false);

  const isDegraded = status === "degraded";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -56, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          exit={{   y: -56, opacity: 0 }}
          transition={spring}
          className="fixed inset-x-0 top-0 z-[9999]"
          style={{
            background: isDegraded ? "#F59E0B" : "#EF4444",
          }}
          role="alert"
          aria-live="assertive"
        >
          <div className="container-shell flex items-center gap-3 py-2.5">
            {isDegraded
              ? <AlertTriangle size={15} className="shrink-0 text-white" />
              : <WifiOff       size={15} className="shrink-0 text-white" />
            }

            <p className="flex-1 text-sm font-semibold text-white">
              {isDegraded
                ? "Some services are running slow right now. You may experience delays."
                : "Campus Marche can't reach the server. Check your internet or try again in a moment."
              }
              {lastChecked && (
                <span className="ml-2 opacity-70 text-xs">
                  (checked {lastChecked.toLocaleTimeString()})
                </span>
              )}
            </p>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.20)" }}
              >
                <RefreshCw size={12} />
                Retry
              </button>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                aria-label="Dismiss"
                className="grid h-6 w-6 place-items-center rounded-full text-white transition-opacity hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
