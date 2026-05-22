"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      <div className="py-14 text-white" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #4f46e5 60%, #7c3aed 100%)" }}>
        <div className="container-shell text-center">
          <h1 className="text-4xl font-black tracking-tight">Reset Your Password</h1>
          <p className="mt-3 text-lg text-indigo-200">We will send you a link to create a new password</p>
        </div>
      </div>

      <div className="container-shell py-14">
        <div className="mx-auto max-w-md rounded-2xl border border-indigo-100 bg-white p-8 shadow-xl shadow-indigo-100/50">
          {message ? (
            <div className="rounded-2xl bg-green-50 p-5 text-center ring-1 ring-green-100">
              <p className="font-bold text-brand-green">{message}</p>
              <p className="mt-2 text-sm text-slate-600">
                Check your email and follow the link to set a new password. The link expires in 1 hour.
              </p>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-bold text-slate-900">Campus email</label>
                <p className="mt-1 text-xs text-slate-600">
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
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-indigo-100 pt-6 text-center">
            <p className="text-sm text-slate-600">
              Remembered your password?{" "}
              <Link href="/login" className="font-bold text-brand-green hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
