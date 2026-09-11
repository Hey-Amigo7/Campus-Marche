"use client";

import { useEffect, useState } from "react";

// Typed handle for the beforeinstallprompt event (not in TS lib yet)
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

/**
 * Provides PWA install capability via the browser's beforeinstallprompt event.
 *
 * canInstall  — true when the browser has a usable install prompt and the app
 *               is not already running in standalone mode.
 * install()   — triggers the native browser install prompt and clears the
 *               deferred event afterwards (prompt objects are single-use).
 *               If the user dismisses without installing, canInstall becomes
 *               false until the browser fires a new beforeinstallprompt.
 * installing  — true while the prompt is open / the install is in progress.
 *
 * No persistent state is written. If the user uninstalls and returns to the
 * site, the browser will re-fire beforeinstallprompt and canInstall becomes
 * true again automatically.
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // already running as installed app

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Clear the prompt when the app is successfully installed (any path)
    const onInstalled = () => setDeferredPrompt(null);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      // Prompt objects are single-use — clear regardless of outcome.
      // The browser will re-fire beforeinstallprompt if the user becomes
      // eligible again (e.g. after uninstalling and returning to the site).
      setDeferredPrompt(null);
    } finally {
      setInstalling(false);
    }
  }

  return { canInstall: deferredPrompt !== null, install, installing };
}
