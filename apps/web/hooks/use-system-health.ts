"use client";

import { useEffect, useState } from "react";

type HealthStatus = "ok" | "degraded" | "down" | "unknown";

const POLL_INTERVAL_MS    = 30_000;  // check every 30 s
const RECOVERY_DELAY_MS   = 5_000;   // confirm recovery after 5 s second clean check

export function useSystemHealth() {
  const [status, setStatus]       = useState<HealthStatus>("unknown");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function check() {
      if (cancelled) return;
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
        const res = await fetch(`${apiBase}/health`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
        if (!cancelled) {
          setStatus(res.ok ? "ok" : "degraded");
          setLastChecked(new Date());
        }
      } catch {
        if (!cancelled) {
          setStatus("down");
          setLastChecked(new Date());
        }
      } finally {
        if (!cancelled) {
          timer = setTimeout(check, POLL_INTERVAL_MS);
        }
      }
    }

    void check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { status, lastChecked, isDown: status === "down" || status === "degraded" };
}
