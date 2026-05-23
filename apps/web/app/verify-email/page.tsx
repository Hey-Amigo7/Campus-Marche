"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { api } from "@/lib/api";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email   = searchParams.get("email")   ?? "";
  const devCode = searchParams.get("devCode") ?? "";

  const initialDigits = devCode.length === CODE_LENGTH
    ? devCode.split("")
    : Array(CODE_LENGTH).fill("");

  const [digits, setDigits]               = useState<string[]>(initialDigits);
  const [error, setError]                 = useState<string | null>(null);
  const [success, setSuccess]             = useState(false);
  const [loading, setLoading]             = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(CODE_LENGTH).fill(null));

  useEffect(() => { setResendCooldown(RESEND_COOLDOWN); }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const focusInput = useCallback((index: number) => {
    inputRefs.current[index]?.focus();
  }, []);

  function handleChange(index: number, value: string) {
    const char = value.replace(/\D/g, "").slice(-1);
    const next  = [...digits];
    next[index] = char;
    setDigits(next);
    setError(null);
    if (char && index < CODE_LENGTH - 1) focusInput(index + 1);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      if (digits[index]) {
        const next  = [...digits];
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        focusInput(index - 1);
      }
    } else if (event.key === "ArrowLeft"  && index > 0)              focusInput(index - 1);
    else if  (event.key === "ArrowRight" && index < CODE_LENGTH - 1) focusInput(index + 1);
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]!;
    setDigits(next);
    setError(null);
    focusInput(Math.min(pasted.length, CODE_LENGTH - 1));
  }

  async function handleSubmit() {
    const code = digits.join("");
    if (code.length < CODE_LENGTH) { setError("Please enter all 6 digits."); return; }
    setError(null);
    setLoading(true);
    try {
      await api.auth.verifyEmailOtp(code);
      setSuccess(true);
      setTimeout(() => router.push("/profile"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendMessage(null);
    setError(null);
    try {
      await api.auth.resendEmailOtp();
      setResendMessage("A new code has been sent to your email.");
      setResendCooldown(RESEND_COOLDOWN);
      setDigits(Array(CODE_LENGTH).fill(""));
      focusInput(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }

  const isComplete = digits.join("").length === CODE_LENGTH;

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
          <h1 className="text-4xl font-black tracking-tight">Verify your email</h1>
          <p className="mt-3 text-lg" style={{ color: "#94A3B8" }}>
            {email ? (
              <>We sent a 6-digit code to <span className="font-semibold text-white">{email}</span></>
            ) : (
              "We sent a 6-digit code to your email address"
            )}
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
          {devCode ? (
            <div
              className="mb-5 rounded-xl border px-4 py-3 text-sm"
              style={{
                background:  "rgba(251,191,36,0.08)",
                border:      "1px solid rgba(251,191,36,0.30)",
                color:       "#92400E",
              }}
            >
              <span className="font-bold">Dev mode:</span> OTP auto-filled — SMTP not configured.
              Code: <span className="font-mono font-black tracking-widest">{devCode}</span>
            </div>
          ) : null}

          {success ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: "rgba(127,182,133,0.15)" }}
              >
                <svg className="h-8 w-8" style={{ color: "#5A9460" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-12" />
                </svg>
              </div>
              <p className="text-lg font-bold" style={{ color: "#1E293B" }}>Email verified!</p>
              <p className="text-sm" style={{ color: "#64748B" }}>Taking you to your profile…</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="mb-4 text-sm font-semibold" style={{ color: "#1E293B" }}>
                  Enter verification code
                </p>
                <div className="flex justify-center gap-2">
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      autoFocus={index === 0}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={handlePaste}
                      className="h-14 w-12 rounded-xl border-2 text-center text-xl font-bold transition-colors focus:outline-none"
                      style={{
                        borderColor: error
                          ? "#EF4444"
                          : digit
                          ? "#7FB685"
                          : "#E2E8F0",
                        background: digit ? "rgba(127,182,133,0.08)" : "#ffffff",
                        color:      digit ? "#0F172A" : "#1E293B",
                      }}
                    />
                  ))}
                </div>
              </div>

              {error        ? <p className="text-center text-sm font-semibold text-red-600">{error}</p>         : null}
              {resendMessage ? <p className="text-center text-sm font-semibold" style={{ color: "#5A9460" }}>{resendMessage}</p> : null}

              <button
                type="button"
                disabled={!isComplete || loading}
                onClick={handleSubmit}
                className="btn-primary w-full justify-center py-3 text-base font-bold disabled:opacity-50"
              >
                {loading ? "Verifying…" : "Verify email"}
              </button>

              <div className="text-center text-sm" style={{ color: "#64748B" }}>
                {resendCooldown > 0 ? (
                  <span>
                    Resend code in{" "}
                    <span className="font-semibold" style={{ color: "#1E293B" }}>{resendCooldown}s</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={resendLoading}
                    onClick={handleResend}
                    className="font-semibold hover:underline disabled:opacity-50"
                    style={{ color: "#5A9460" }}
                  >
                    {resendLoading ? "Sending…" : "Resend code"}
                  </button>
                )}
              </div>

              <div
                className="border-t pt-4 text-center text-sm"
                style={{ borderColor: "rgba(226,232,240,0.60)", color: "#64748B" }}
              >
                Wrong email?{" "}
                <a href="/register" className="font-semibold hover:underline" style={{ color: "#0F172A" }}>
                  Register again
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
