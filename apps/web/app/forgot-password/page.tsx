"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";

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
    <div className="min-h-screen">
      {/* Header */}
      <div
        className="relative overflow-hidden py-14 text-white"
        style={{ background: "linear-gradient(135deg, #0F172A 0%, #102542 55%, #1a3a2a 100%)" }}
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(198,139,89,0.18), transparent 65%)" }}
        />
        <div className="container-shell text-center">
          <h1 className="text-4xl font-black tracking-tight">Reset Your Password</h1>
          <p className="mt-3 text-lg" style={{ color: "#94A3B8" }}>
            We&apos;ll send you a link to create a new password
          </p>
        </div>
      </div>

      <div className="container-shell py-14">
        <div
          className="mx-auto max-w-md rounded-2xl p-8"
          style={{
            background:    "rgba(255,255,255,0.88)",
            backdropFilter:"blur(20px) saturate(160%)",
            border:        "1px solid rgba(226,232,240,0.70)",
            boxShadow:     "0 8px 32px rgba(15,23,42,0.10)",
          }}
        >
          {message ? (
            <div
              className="rounded-2xl p-5 text-center"
              style={{
                background: "rgba(127,182,133,0.10)",
                border:     "1px solid rgba(127,182,133,0.25)",
              }}
            >
              <p className="font-bold" style={{ color: "#5A9460" }}>{message}</p>
              <p className="mt-2 text-sm" style={{ color: "#64748B" }}>
                Check your email and follow the link to set a new password. The link expires in 1 hour.
              </p>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-bold" style={{ color: "#1E293B" }}>
                  Campus email
                </label>
                <p className="mt-1 text-xs" style={{ color: "#64748B" }}>
                  Enter the email associated with your Campus Marche account
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@htu.edu.gh"
                  className="input-shell mt-3"
                  required
                />
              </div>

              {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3 text-base font-bold"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}

          <div
            className="mt-6 border-t pt-6 text-center"
            style={{ borderColor: "rgba(226,232,240,0.60)" }}
          >
            <p className="text-sm" style={{ color: "#64748B" }}>
              Remembered your password?{" "}
              <Link href="/login" className="font-bold hover:underline" style={{ color: "#5A9460" }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
