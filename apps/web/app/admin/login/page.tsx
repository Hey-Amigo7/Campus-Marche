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
  const [bootstrapping, setBootstrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleBootstrap() {
    setBootstrapping(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/auth/bootstrap-admin`, { method: "POST" });
      const data = await res.json() as { message: string; email?: string; password?: string };
      setNotice(data.message);
      if (data.email) { setEmail(data.email); setPassword(data.password ?? ""); }
    } catch {
      setError("Bootstrap failed. Check your API connection.");
    } finally {
      setBootstrapping(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.login({ email: email.trim().toLowerCase(), password });
      // Verify admin role
      if ((res as { user: { id: string; email: string; name: string; role?: string } }).user) {
        const profile = await api.getProfile();
        if (!profile || profile.role !== "ADMIN") {
          setError("Access denied. This portal is for administrators only.");
          return;
        }
        setAuthToken(res.token);
        router.push("/admin");
        router.refresh();
      }
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
          {/* Header stripe */}
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
              Unauthorised access attempts are logged.
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
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                }}
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
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                  }}
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

        {/* First-time setup */}
        <div className="mt-4 rounded-2xl px-5 py-4"
          style={{ background: "rgba(198,139,89,0.10)", border: "1px solid rgba(198,139,89,0.20)" }}>
          <p className="text-xs font-black" style={{ color: "#C68B59" }}>First-time setup</p>
          {notice && (
            <p className="mt-1 rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: "rgba(127,182,133,0.15)", color: "#A8D4AE" }}>{notice}</p>
          )}
          <p className="mt-1 text-xs leading-5" style={{ color: "#94A3B8" }}>
            No admin account yet? Click below to create the default admin.
            Change the credentials immediately after your first login.
          </p>
          <button onClick={handleBootstrap} disabled={bootstrapping}
            className="mt-2 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: "rgba(198,139,89,0.25)", color: "#C68B59" }}>
            {bootstrapping ? <Loader2 className="h-3 w-3 animate-spin" /> : "⚙️"}
            {bootstrapping ? "Creating…" : "Bootstrap default admin"}
          </button>
        </div>
      </div>
    </div>
  );
}
