"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { AnimatedSparkles } from "@/components/animated-icons";

const ease = [0.22, 1, 0.36, 1] as const;

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      const result = await api.auth.forgotPassword(email.trim().toLowerCase());
      setMessage(result.message || "If that email is registered, a reset link has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative flex min-h-[calc(100vh-64px)] items-center justify-center overflow-hidden px-4 py-12"
      style={{ background: "linear-gradient(145deg, #060C14 0%, #081209 45%, #070A14 100%)" }}
    >
      {/* Atmospheric caramel glow — top-right */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-[480px] w-[480px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(198,139,89,0.15) 0%, transparent 65%)",
          filter: "blur(1px)",
        }}
      />
      {/* Atmospheric sage glow — bottom-left */}
      <div
        className="pointer-events-none absolute -bottom-24 -left-16 h-[400px] w-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(127,182,133,0.13) 0%, transparent 65%)",
          filter: "blur(1px)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(198,139,89,0.04) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="mb-5 flex justify-center"
        >
          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold"
            style={{
              background: "rgba(127,182,133,0.10)",
              border: "1px solid rgba(127,182,133,0.25)",
              color: "#A8D4AE",
            }}
          >
            <AnimatedSparkles size={12} color="#A8D4AE" />
            HTU Student Marketplace
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease }}
          className="mb-6 text-center text-3xl font-black tracking-tight text-white"
        >
          Campus Marche
        </motion.h1>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18, ease }}
          className="rounded-2xl p-7"
          style={{
            background: "rgba(10,15,26,0.80)",
            backdropFilter: "blur(24px) saturate(150%)",
            border: "1px solid rgba(198,139,89,0.14)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px rgba(198,139,89,0.06)",
          }}
        >
          <h2 className="text-xl font-black text-white">Reset password</h2>
          <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            Enter your email and we&apos;ll send you a reset link
          </p>

          {message ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 rounded-xl p-5 text-center"
              style={{
                background: "rgba(127,182,133,0.10)",
                border: "1px solid rgba(127,182,133,0.25)",
              }}
            >
              <p className="text-2xl">✉️</p>
              <p className="mt-3 font-bold" style={{ color: "#A8D4AE" }}>{message}</p>
              <p className="mt-2 text-xs leading-5" style={{ color: "rgba(255,255,255,0.40)" }}>
                Check your inbox and follow the link to set a new password. Link expires in 1 hour.
              </p>
            </motion.div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Campus email
                </label>
                <p className="mb-2 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Enter the email associated with your Campus Marche account
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@htu.edu.gh"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-[rgba(255,255,255,0.28)]"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    caretColor: "#7FB685",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(127,182,133,0.55)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
                />
              </div>

              {error ? (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold"
                  style={{ background: "rgba(239,68,68,0.10)", color: "#FCA5A5", border: "1px solid rgba(239,68,68,0.20)" }}
                >
                  {error}
                </motion.p>
              ) : null}

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.015, y: loading ? 0 : -1 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="mt-1 w-full rounded-xl py-3 text-sm font-black text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #7FB685 0%, #5A9460 100%)", boxShadow: "0 6px 20px rgba(127,182,133,0.30)" }}
              >
                {loading ? "Sending…" : "Send reset link"}
              </motion.button>
            </form>
          )}

          <p className="mt-5 text-center text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            Remembered your password?{" "}
            <Link href="/login" className="font-bold transition-colors hover:text-white" style={{ color: "rgba(127,182,133,0.80)" }}>
              Sign in
            </Link>
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45, ease }}
          className="mt-5 text-center text-xs"
          style={{ color: "rgba(255,255,255,0.22)" }}
        >
          🔒 Your data stays on campus. No ads. No tracking.
        </motion.p>
      </div>
    </div>
  );
}
