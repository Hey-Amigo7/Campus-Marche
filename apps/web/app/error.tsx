"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console — wire to Sentry or similar here when ready
    console.error("[Campus Marche] Render error:", error);
  }, [error]);

  const isNetworkError = error.message?.toLowerCase().includes("fetch") ||
    error.message?.toLowerCase().includes("network") ||
    error.message?.toLowerCase().includes("unreachable");

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#F8F5EF", fontFamily: "Inter, system-ui, sans-serif" }}>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
        }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            style={{
              width: "100%",
              maxWidth: 420,
              background: "white",
              borderRadius: 24,
              padding: "2.5rem",
              textAlign: "center",
              border: "1px solid rgba(226,232,240,0.70)",
              boxShadow: "0 8px 32px rgba(15,23,42,0.10)",
            }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(239,68,68,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}>
              <AlertTriangle size={28} style={{ color: "#EF4444" }} />
            </div>

            <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 900, color: "#0F172A" }}>
              {isNetworkError ? "Can't reach the server" : "Something went wrong"}
            </h1>
            <p style={{ margin: "0 0 1.75rem", fontSize: "0.875rem", color: "#64748B", lineHeight: 1.6 }}>
              {isNetworkError
                ? "Campus Marche can't connect to the server right now. Check your internet connection or try again in a moment."
                : "An unexpected error occurred. This has been noted. You can try refreshing or head back to the homepage."}
            </p>

            {error.digest && (
              <p style={{ marginBottom: "1.25rem", fontSize: "0.7rem", color: "#94A3B8", fontFamily: "monospace" }}>
                Error ID: {error.digest}
              </p>
            )}

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button
                type="button"
                onClick={reset}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.5rem",
                  padding: "0.625rem 1.25rem", borderRadius: 12,
                  background: "#0F172A", color: "white",
                  fontSize: "0.875rem", fontWeight: 700, border: "none", cursor: "pointer",
                }}
              >
                <RefreshCw size={14} />
                Try again
              </button>
              <a
                href="/"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.5rem",
                  padding: "0.625rem 1.25rem", borderRadius: 12,
                  background: "rgba(226,232,240,0.40)", color: "#334155",
                  fontSize: "0.875rem", fontWeight: 700, textDecoration: "none",
                  border: "1px solid rgba(226,232,240,0.80)",
                }}
              >
                Go home
              </a>
            </div>
          </motion.div>
        </div>
      </body>
    </html>
  );
}
