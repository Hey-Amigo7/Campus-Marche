"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DISMISS_KEY = "pwa-install-dismissed";

type Platform = "chromium" | "ios" | "none";

function getPlatform(): Platform {
  if (typeof window === "undefined") return "none";
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/.test(ua) && !(ua.indexOf("CriOS") !== -1 && ua.indexOf("FxiOS") !== -1);
  const isSafariIos = isIos && /WebKit/.test(ua) && !/CriOS|FxiOS/.test(ua);
  if (isSafariIos) return "ios";
  // Chromium-based: supports beforeinstallprompt
  return "none";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

// Typed handle for the beforeinstallprompt event (not in TS lib yet)
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>("none");
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Never show if already running as installed app
    if (isStandalone()) return;
    // Never show if user dismissed previously
    if (localStorage.getItem(DISMISS_KEY)) return;

    const detected = getPlatform();
    setPlatform(detected);
    if (detected === "ios") setVisible(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform("chromium");
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setVisible(false);
      }
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  }

  if (platform === "none") return null;

  return (
    <AnimatePresence>
      {visible && (
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
              background: "rgba(15,23,42,0.92)",
              backdropFilter: "blur(20px) saturate(160%)",
              border: "1px solid rgba(127,182,133,0.25)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.2)",
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
              {platform === "chromium" ? (
                <p className="mt-0.5 text-xs leading-snug" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Add to your home screen for faster access.
                </p>
              ) : (
                <p className="mt-0.5 text-xs leading-snug" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Tap{" "}
                  <span
                    className="inline-block rounded px-1 text-[10px] font-bold"
                    style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
                  >
                    Share
                  </span>{" "}
                  then{" "}
                  <span
                    className="inline-block rounded px-1 text-[10px] font-bold"
                    style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
                  >
                    Add to Home Screen
                  </span>
                  .
                </p>
              )}

              {platform === "chromium" && (
                <button
                  onClick={install}
                  disabled={installing}
                  className="mt-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-opacity disabled:opacity-60"
                  style={{ background: "#7FB685", color: "#0F172A" }}
                >
                  {installing ? "Installing…" : "Install app"}
                </button>
              )}
            </div>

            <button
              onClick={dismiss}
              className="mt-0.5 shrink-0 rounded-lg p-1 transition-colors"
              style={{ color: "rgba(255,255,255,0.5)" }}
              aria-label="Dismiss install prompt"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M1.707.293A1 1 0 0 0 .293 1.707L5.586 7 .293 12.293a1 1 0 1 0 1.414 1.414L7 8.414l5.293 5.293a1 1 0 0 0 1.414-1.414L8.414 7l5.293-5.293A1 1 0 0 0 12.293.293L7 5.586 1.707.293Z" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
