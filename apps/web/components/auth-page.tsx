"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { GoogleLogin } from "@react-oauth/google";
import { mutate } from "swr";
import { api } from "@/lib/api";
import { setAuthToken } from "@/lib/auth";

const GOOGLE_ENABLED = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

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

// ─── Google OAuth button ──────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908C16.658 14.253 17.64 11.945 17.64 9.205Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

type GoogleSuccessPayload = { token: string; user: { id: string; email: string; name: string } };

function GoogleSignInButton({
  mode,
  disabled = false,
  onSuccess,
}: {
  mode: "signin" | "signup";
  disabled?: boolean;
  onSuccess: (payload: GoogleSuccessPayload) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleCredential(credential: string) {
    if (disabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.auth.googleSignIn(credential);
      if (!result?.token) throw new Error("Authentication failed");
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>or continue with</span>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
      </div>

      <div className="flex justify-center" style={{ minHeight: "44px" }}>
        {loading ? (
          <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold w-full justify-center"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.11)", color: "rgba(255,255,255,0.60)" }}>
            <GoogleIcon />
            Connecting to Google…
          </div>
        ) : (
          <GoogleLogin
            onSuccess={(cred) => {
              if (cred.credential) handleCredential(cred.credential);
              else setError("No credential returned from Google. Please try again.");
            }}
            onError={() => setError("Google sign-in was cancelled or failed. Please try again.")}
            theme="filled_black"
            size="large"
            text={mode === "signin" ? "continue_with" : "signup_with"}
            shape="rectangular"
            width="380"
          />
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="rounded-xl px-4 py-2.5 text-xs font-semibold"
            style={{ background: "rgba(239,68,68,0.10)", color: "#FCA5A5", border: "1px solid rgba(239,68,68,0.20)" }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sign-in form ─────────────────────────────────────────────────────────────

function SignInForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword]     = useState("");
  const [message, setMessage]       = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);

  const handleAuthSuccess = useCallback((result: GoogleSuccessPayload) => {
    setAuthToken(result.token);
    mutate("profile", result.user);
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(next?.startsWith("/") ? next : "/");
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const result = await api.auth.login({ identifier, password });
      if (!result?.token) throw new Error("Login failed");
      setAuthToken(result.token);
      mutate("profile", result.user);
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next?.startsWith("/") ? next : "/");
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

      {GOOGLE_ENABLED && (
        <div className="mt-4">
          <GoogleSignInButton mode="signin" disabled={loading} onSuccess={handleAuthSuccess} />
        </div>
      )}

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

  const handleAuthSuccess = useCallback((result: GoogleSuccessPayload) => {
    setAuthToken(result.token);
    mutate("profile", result.user);
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(next?.startsWith("/") ? next : "/");
  }, [router]);

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
      mutate("profile", result.user);
      if (result.requiresOtp) {
        const params = new URLSearchParams({ email });
        if (result.devCode) params.set("devCode", result.devCode);
        router.push(`/verify-email?${params.toString()}`);
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next?.startsWith("/") ? next : "/");
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

      {GOOGLE_ENABLED && (
        <div className="mt-4">
          <GoogleSignInButton mode="signup" disabled={loading} onSuccess={handleAuthSuccess} />
        </div>
      )}

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
