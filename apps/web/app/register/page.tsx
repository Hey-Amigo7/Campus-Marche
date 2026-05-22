"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { setAuthToken } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const result = await api.auth.register({ name, email, password });
      if (!result?.token) {
        throw new Error("Registration failed");
      }

      setAuthToken(result.token);

      if (result.requiresOtp) {
        const params = new URLSearchParams({ email });
        if (result.devCode) params.set("devCode", result.devCode);
        router.push(`/verify-email?${params.toString()}`);
        return;
      }

      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next?.startsWith("/") ? next : "/profile");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not create your account. Please verify the form and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="py-14 text-white" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #4f46e5 60%, #7c3aed 100%)" }}>
        <div className="container-shell text-center">
          <h1 className="text-4xl font-black tracking-tight">Join Campus Marche</h1>
          <p className="mt-3 text-lg text-indigo-200">Create your account to start buying and selling on campus</p>
        </div>
      </div>

      <div className="container-shell py-14">
        <div className="mx-auto max-w-md rounded-2xl border border-indigo-100 bg-white p-8 shadow-xl shadow-indigo-100/50">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-bold text-slate-900">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Jane Doe"
                className="input-shell mt-2"
                required
              />
            </div>

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
              <label className="block text-sm font-bold text-slate-900">Create password</label>
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
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="mt-6 border-t border-indigo-100 pt-6 text-center">
            <p className="text-sm text-slate-600">
              Already have an account? <Link href="/login" className="font-bold text-brand-green hover:underline">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
