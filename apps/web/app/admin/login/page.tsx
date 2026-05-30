"use client";

import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Shield } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { setAuthToken } from "@/lib/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.admin.adminLogin(email.trim(), password);
      setAuthToken(res.token);
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4"
      style={{ background: "linear-gradient(160deg, #0F172A 0%, #0d2118 60%, #0F172A 100%)" }}>
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0"
        style={{ backgroundImage: "radial-gradient(circle at 30% 40%, rgba(127,182,133,0.12) 0%, transparent 55%), radial-gradient(circle at 70% 70%, rgba(198,139,89,0.08) 0%, transparent 45%)" }} />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="overflow-hidden rounded-3xl"
          style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 24px 80px rgba(0,0,0,0.40)" }}>
          {/* Header */}
          <div className="px-8 pb-6 pt-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl"
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <Shield className="h-5 w-5" style={{ color: "#EF4444" }} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#EF4444" }}>Restricted access</p>
                <h1 className="text-xl font-black text-white">Admin portal</h1>
              </div>
            </div>

            <p className="text-sm leading-6" style={{ color: "#94A3B8" }}>
              This portal is for platform administrators only.
              Credentials are set in the server environment — no account sign-up required.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-8 pb-8">
            {/* Email */}
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide" style={{ color: "#94A3B8" }}>Admin email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="w-full rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
                placeholder="admin@campus-marche.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide" style={{ color: "#94A3B8" }}>Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-2xl px-4 py-3.5 pr-12 text-sm font-semibold outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{ color: "#64748B" }}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl px-4 py-3 text-sm font-semibold"
                style={{ background: "rgba(239,68,68,0.12)", color: "#FCA5A5", border: "1px solid rgba(239,68,68,0.20)" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="mt-2 w-full rounded-2xl py-3.5 text-sm font-black text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #DC2626, #991B1B)", boxShadow: "0 8px 24px rgba(220,38,38,0.30)" }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Authenticating…
                </span>
              ) : "Sign in to admin"}
            </button>

            <p className="pt-2 text-center text-xs" style={{ color: "#475569" }}>
              Not an admin?{" "}
              <a href="/login" style={{ color: "#7FB685" }} className="font-bold hover:underline">
                Go to regular login
              </a>
            </p>
          </form>
        </div>

      </div>
    </div>
  );
}
