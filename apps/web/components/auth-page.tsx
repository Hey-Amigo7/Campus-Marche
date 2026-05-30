"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { api } from "@/lib/api";
import { setAuthToken } from "@/lib/auth";
import { AnimatedSparkles } from "@/components/animated-icons";

const spring = { type: "spring", stiffness: 340, damping: 30 } as const;
const ease   = [0.22, 1, 0.36, 1] as const;

// ─── Password strength ────────────────────────────────────────────────────────

type Req = { label: string; met: boolean };

function getStrength(pw: string): { score: number; reqs: Req[] } {
  const reqs: Req[] = [
    { label: "At least 8 characters",            met: pw.length >= 8 },
    { label: "One uppercase letter (A–Z)",        met: /[A-Z]/.test(pw) },
    { label: "One number (0–9)",                  met: /\d/.test(pw) },
    { label: "One special character (!@#$%^&*…)", met: /[^A-Za-z0-9]/.test(pw) },
  ];
  return { score: reqs.filter((r) => r.met).length, reqs };
}

const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"] as const;
const STRENGTH_COLOR = ["", "rgba(239,68,68,0.85)", "rgba(251,191,36,0.90)", "rgba(127,182,133,0.80)", "#7FB685"] as const;

// ─── Sign-in form ─────────────────────────────────────────────────────────────

function SignInForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword]     = useState("");
  const [message, setMessage]       = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const result = await api.auth.login({ identifier, password });
      if (!result?.token) throw new Error("Login failed");
      setAuthToken(result.token);
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next?.startsWith("/") ? next : "/profile");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "We could not sign you in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div key="signin" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.32, ease }}>
      <h2 className="text-xl font-black text-white">Sign In</h2>
      <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
        Enter your credentials below to access your account
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
            Email, phone, or @handle
          </label>
          <input
            type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
            placeholder="you@htu.edu.gh · 0244… · @ama" autoComplete="username" required
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-[rgba(255,255,255,0.28)]"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", caretColor: "#7FB685" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(127,182,133,0.55)"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.65)" }}>Password</label>
            <Link href="/forgot-password" className="text-xs font-semibold transition-colors hover:text-white" style={{ color: "rgba(127,182,133,0.80)" }}>
              Forgot password?
            </Link>
          </div>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" autoComplete="current-password" required
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-[rgba(255,255,255,0.28)]"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", caretColor: "#7FB685" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(127,182,133,0.55)"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
          />
        </div>

        <AnimatePresence>
          {message && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{ background: "rgba(239,68,68,0.10)", color: "#FCA5A5", border: "1px solid rgba(239,68,68,0.20)" }}>
              {message}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button type="submit" disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.015, y: loading ? 0 : -1 }}
          whileTap={{ scale: 0.97 }} transition={spring}
          className="mt-1 w-full rounded-xl py-3 text-sm font-black text-white disabled:opacity-60 transition-opacity"
          style={{ background: "linear-gradient(135deg, #7FB685 0%, #5A9460 100%)", boxShadow: "0 6px 20px rgba(127,182,133,0.30)" }}>
          {loading ? "Signing in…" : "Sign in"}
        </motion.button>
      </form>

      <p className="mt-5 text-center text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
        Don&apos;t have an account?{" "}
        <button onClick={onSwitch} className="font-bold transition-colors hover:text-white" style={{ color: "rgba(127,182,133,0.80)" }}>
          Create one free
        </button>
      </p>
    </motion.div>
  );
}

// ─── Sign-up form ─────────────────────────────────────────────────────────────

function SignUpForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [showCf, setShowCf]           = useState(false);
  const [message, setMessage]         = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);

  const { score, reqs } = getStrength(password);
  const passwordsMatch  = confirm === "" || password === confirm;
  const canSubmit       = score === 4 && password === confirm && confirm.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setMessage("Passwords do not match."); return; }
    if (score < 4)            { setMessage("Please meet all password requirements."); return; }
    setMessage(null);
    setLoading(true);
    try {
      const result = await api.auth.register({ name, email, password });
      if (!result?.token) throw new Error("Registration failed");
      setAuthToken(result.token);
      if (result.requiresOtp) {
        const params = new URLSearchParams({ email });
        if (result.devCode) params.set("devCode", result.devCode);
        router.push(`/verify-email?${params.toString()}`);
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next?.startsWith("/") ? next : "/profile");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "We could not create your account. Please verify the form and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div key="signup" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.32, ease }}>
      <h2 className="text-xl font-black text-white">Create account</h2>
      <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
        Join thousands of HTU students on the marketplace
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {/* Full name */}
        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>Full name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe"
            autoComplete="name" required
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-[rgba(255,255,255,0.28)]"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", caretColor: "#7FB685" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(127,182,133,0.55)"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>Campus email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@htu.edu.gh"
            autoComplete="email" required
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-[rgba(255,255,255,0.28)]"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", caretColor: "#7FB685" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(127,182,133,0.55)"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>Create password</label>
          <div className="relative">
            <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password" autoComplete="new-password" required
              className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white outline-none transition-all placeholder:text-[rgba(255,255,255,0.28)]"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", caretColor: "#7FB685" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(127,182,133,0.55)"; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
            />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold"
              style={{ color: "rgba(255,255,255,0.40)" }}>
              {showPw ? "Hide" : "Show"}
            </button>
          </div>

          <AnimatePresence>
            {password.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="mt-2.5 space-y-2 overflow-hidden">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                      style={{ background: score >= i ? STRENGTH_COLOR[score] : "rgba(255,255,255,0.10)" }} />
                  ))}
                </div>
                {score > 0 && (
                  <p className="text-xs font-bold" style={{ color: STRENGTH_COLOR[score] }}>
                    {STRENGTH_LABEL[score]} password
                  </p>
                )}
                <ul className="space-y-1">
                  {reqs.map((r) => (
                    <li key={r.label} className="flex items-center gap-2 text-xs transition-colors duration-200"
                      style={{ color: r.met ? "#7FB685" : "rgba(255,255,255,0.40)" }}>
                      <span className="text-[10px]">{r.met ? "✓" : "○"}</span>
                      {r.label}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>Confirm password</label>
          <div className="relative">
            <input type={showCf ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your password" autoComplete="new-password" required
              className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white outline-none transition-all placeholder:text-[rgba(255,255,255,0.28)]"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${confirm.length > 0 ? (passwordsMatch ? "rgba(127,182,133,0.45)" : "rgba(239,68,68,0.50)") : "rgba(255,255,255,0.10)"}`,
                caretColor: "#7FB685",
              }}
              onFocus={(e) => { if (confirm.length === 0) e.currentTarget.style.borderColor = "rgba(127,182,133,0.55)"; }}
              onBlur={(e)  => { if (confirm.length === 0) e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
            />
            <button type="button" onClick={() => setShowCf(!showCf)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold"
              style={{ color: "rgba(255,255,255,0.40)" }}>
              {showCf ? "Hide" : "Show"}
            </button>
          </div>
          <AnimatePresence>
            {confirm.length > 0 && !passwordsMatch && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="mt-1.5 text-xs font-semibold" style={{ color: "rgba(239,68,68,0.85)" }}>
                Passwords do not match
              </motion.p>
            )}
            {confirm.length > 0 && passwordsMatch && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="mt-1.5 text-xs font-semibold" style={{ color: "#7FB685" }}>
                Passwords match
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {message && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{ background: "rgba(239,68,68,0.10)", color: "#FCA5A5", border: "1px solid rgba(239,68,68,0.20)" }}>
              {message}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button type="submit" disabled={loading || !canSubmit}
          whileHover={{ scale: (loading || !canSubmit) ? 1 : 1.015, y: (loading || !canSubmit) ? 0 : -1 }}
          whileTap={{ scale: 0.97 }} transition={spring}
          className="mt-1 w-full rounded-xl py-3 text-sm font-black text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #7FB685 0%, #5A9460 100%)", boxShadow: "0 6px 20px rgba(127,182,133,0.30)" }}>
          {loading ? "Creating account…" : "Create account"}
        </motion.button>
      </form>

      <p className="mt-5 text-center text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
        Already have an account?{" "}
        <button onClick={onSwitch} className="font-bold transition-colors hover:text-white" style={{ color: "rgba(127,182,133,0.80)" }}>
          Sign in
        </button>
      </p>
    </motion.div>
  );
}

// ─── Unified AuthPage ─────────────────────────────────────────────────────────

export function AuthPage({ defaultTab }: { defaultTab: "signin" | "signup" }) {
  const router = useRouter();
  const [tab, setTab] = useState<"signin" | "signup">(defaultTab);

  const switchTo = useCallback((next: "signin" | "signup") => {
    setTab(next);
    router.replace(next === "signin" ? "/login" : "/register", { scroll: false });
  }, [router]);

  return (
    <div
      className="relative flex min-h-[calc(100vh-64px)] items-center justify-center overflow-hidden px-4 py-12"
      style={{ background: "linear-gradient(145deg, #060C14 0%, #081209 45%, #070A14 100%)" }}
    >
      {/* Animated orbs */}
      <div
        className="orb-animate pointer-events-none absolute -left-32 -top-32 h-[560px] w-[560px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(127,182,133,0.18) 0%, transparent 65%)", filter: "blur(1px)" }}
      />
      <div
        className="orb-animate-alt pointer-events-none absolute -bottom-24 right-0 h-[420px] w-[420px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(198,139,89,0.12) 0%, transparent 65%)", filter: "blur(1px)" }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(127,182,133,0.05) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Badge */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}
          className="mb-5 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold"
            style={{ background: "rgba(127,182,133,0.10)", border: "1px solid rgba(127,182,133,0.25)", color: "#A8D4AE" }}>
            <AnimatedSparkles size={12} color="#A8D4AE" />
            HTU Student Marketplace
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08, ease }}
          className="mb-6 text-center text-3xl font-black tracking-tight text-shimmer">
          Campus Marche
        </motion.h1>

        {/* Tab switcher with morphing pill */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.14, ease }}
          className="mb-5 flex justify-center">
          <div className="relative inline-flex items-center rounded-full p-1 gap-0.5"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
            {(["signin", "signup"] as const).map((t) => (
              <button key={t} onClick={() => switchTo(t)}
                className="relative rounded-full px-5 py-2 text-sm font-semibold transition-colors z-10"
                style={{ color: tab === t ? "#fff" : "rgba(255,255,255,0.45)", fontWeight: tab === t ? 800 : 600 }}>
                {tab === t && (
                  <motion.span layoutId="auth-tab-pill"
                    className="absolute inset-0 rounded-full"
                    style={{ background: "rgba(255,255,255,0.12)" }}
                    transition={spring}
                  />
                )}
                <span className="relative">{t === "signin" ? "Sign In" : "Sign Up"}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Card — layout animates height as content morphs */}
        <motion.div
          layout
          transition={{ layout: spring }}
          className="rounded-2xl p-7 overflow-hidden"
          style={{
            background: "rgba(10,15,26,0.80)",
            backdropFilter: "blur(24px) saturate(150%)",
            border: "1px solid rgba(127,182,133,0.14)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px rgba(127,182,133,0.06)",
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {tab === "signin"
              ? <SignInForm key="signin" onSwitch={() => switchTo("signup")} />
              : <SignUpForm key="signup" onSwitch={() => switchTo("signin")} />
            }
          </AnimatePresence>
        </motion.div>

        {/* Trust line */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.45, ease }}
          className="mt-5 text-center text-xs" style={{ color: "rgba(255,255,255,0.22)" }}>
          🔒 {tab === "signin" ? "Your data stays on campus. No ads. No tracking." : "Free to join. No credit card required. Campus only."}
        </motion.p>
      </div>
    </div>
  );
}
