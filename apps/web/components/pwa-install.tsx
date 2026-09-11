"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export function PwaInstall() {
  const { canInstall, install, installing } = usePwaInstall();
  // Session-only dismiss: banner is gone for the rest of this visit,
  // but reappears on the next page load if the browser is still installable.
  const [dismissed, setDismissed] = useState(false);

  return (
    <AnimatePresence>
      {canInstall && !dismissed && (
        <motion.div
          key="pwa-install"
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2"
          aria-live="polite"
        >
          <div
            className="flex items-start gap-3 rounded-2xl px-4 py-3.5"
            style={{
              background:     "rgba(15,23,42,0.92)",
              backdropFilter: "blur(20px) saturate(160%)",
              border:         "1px solid rgba(127,182,133,0.25)",
              boxShadow:      "0 20px 60px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.2)",
            }}
          >
            {/* CM icon */}
            <div
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white"
              style={{ background: "linear-gradient(145deg, #223A6A 0%, #0E1E42 100%)" }}
            >
              CM
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight text-white">
                Install Campus Marche
              </p>
              <p className="mt-0.5 text-xs leading-snug" style={{ color: "rgba(255,255,255,0.6)" }}>
                Get a faster, app-like experience on your device.
              </p>

              <div className="mt-2.5 flex items-center gap-3">
                <button
                  onClick={install}
                  disabled={installing}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold transition-opacity disabled:opacity-60"
                  style={{ background: "#7FB685", color: "#0F172A" }}
                >
                  {installing ? "Installing…" : "Install App"}
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="text-xs transition-colors hover:text-white"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  Not now
                </button>
              </div>
            </div>

            {/* Close / dismiss */}
            <button
              onClick={() => setDismissed(true)}
              className="mt-0.5 shrink-0 rounded-lg p-1 transition-colors hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.5)" }}
              aria-label="Dismiss install prompt"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M1.707.293A1 1 0 0 0 .293 1.707L5.586 7 .293 12.293a1 1 0 1 0 1.414 1.414L7 8.414l5.293 5.293a1 1 0 0 0 1.414-1.414L8.414 7l5.293-5.293A1 1 0 0 0 12.293.293L7 5.586 1.707.293Z" />
              </svg>
            </button>
          </div>

          {/* Nudge toward the install guide for browsers/platforms that
              might not show this banner (e.g. iOS Safari) */}
          <p className="mt-1.5 text-center text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            Banner not showing?{" "}
            <Link
              href="/how-to-install"
              className="underline underline-offset-2 hover:text-white transition-colors"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              See installation guide
            </Link>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
