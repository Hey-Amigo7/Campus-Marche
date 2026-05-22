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
      if (!result?.token) {
        throw new Error("Login failed");
      }

      setAuthToken(result.token);
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next?.startsWith("/") ? next : "/profile");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not sign you in. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="py-14 text-white" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #4f46e5 60%, #7c3aed 100%)" }}>
        <div className="container-shell text-center">
          <h1 className="text-4xl font-black tracking-tight">Welcome Back</h1>
          <p className="mt-3 text-lg text-indigo-200">Access your listings, chats, and marketplace tools</p>
        </div>
      </div>

      <div className="container-shell py-14">
        <div className="mx-auto max-w-md rounded-2xl border border-indigo-100 bg-white p-8 shadow-xl shadow-indigo-100/50">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-bold text-slate-900">Campus email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@htu.edu.gh"
                className="input-shell mt-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="input-shell mt-2"
                required
              />
            </div>

            {message ? <p className="text-sm font-semibold text-red-600">{message}</p> : null}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base font-bold">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 border-t border-indigo-100 pt-6 text-center">
            <p className="text-sm text-slate-600">
              <Link href="/forgot-password" className="font-semibold text-brand-navy hover:underline">Forgot password?</Link>
            </p>
            <p className="mt-4 text-sm text-slate-600">
              Do not have an account? <Link href="/register" className="font-bold text-brand-green hover:underline">Register</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
