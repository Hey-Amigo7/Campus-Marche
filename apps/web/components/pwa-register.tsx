"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Check for updates every 60 s when the page is visible
        const checkUpdate = () => reg.update().catch(() => {});
        const interval = setInterval(checkUpdate, 60_000);
        const onVisible = () => {
          if (document.visibilityState === "visible") checkUpdate();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
          clearInterval(interval);
          document.removeEventListener("visibilitychange", onVisible);
        };
      })
      .catch(() => {
        // SW registration failure is non-fatal — app works without it
      });
  }, []);

  return null;
}
