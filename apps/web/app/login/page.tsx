"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { setAuthToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const result = await api.auth.login({ email, password });
      if (!result?.token) throw new Error("Login failed");

      setAuthToken(result.token);
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next?.startsWith("/") ? next : "/profile");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "We could not sign you in. Please check your email and password.",
      );
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
          style={{ background: "radial-gradient(circle, rgba(127,182,133,0.20), transparent 65%)" }}
        />
        <div className="container-shell text-center">
          <h1 className="text-4xl font-black tracking-tight">Welcome Back</h1>
          <p className="mt-3 text-lg" style={{ color: "#94A3B8" }}>
            Access your listings, chats, and marketplace tools
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
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-bold" style={{ color: "#1E293B" }}>
                Campus email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@htu.edu.gh"
                className="input-shell mt-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold" style={{ color: "#1E293B" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-shell mt-2"
                required
              />
            </div>

            {message ? (
              <p className="text-sm font-semibold text-red-600">{message}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base font-bold"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div
            className="mt-6 border-t pt-6 text-center"
            style={{ borderColor: "rgba(226,232,240,0.60)" }}
          >
            <p className="text-sm" style={{ color: "#64748B" }}>
              <Link href="/forgot-password" className="font-semibold hover:underline" style={{ color: "#0F172A" }}>
                Forgot password?
              </Link>
            </p>
            <p className="mt-4 text-sm" style={{ color: "#64748B" }}>
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-bold hover:underline" style={{ color: "#5A9460" }}>
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
