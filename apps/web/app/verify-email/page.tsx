"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { api } from "@/lib/api";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(CODE_LENGTH).fill(null));

  // Start cooldown timer after mount (code was just sent on register)
  useEffect(() => {
    setResendCooldown(RESEND_COOLDOWN);
  }, []);

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
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setError(null);

    if (char && index < CODE_LENGTH - 1) {
      focusInput(index + 1);
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        focusInput(index - 1);
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      focusInput(index - 1);
    } else if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      focusInput(index + 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i]!;
    }
    setDigits(next);
    setError(null);
    focusInput(Math.min(pasted.length, CODE_LENGTH - 1));
  }

  async function handleSubmit() {
    const code = digits.join("");
    if (code.length < CODE_LENGTH) {
      setError("Please enter all 6 digits.");
      return;
    }

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

  const code = digits.join("");
  const isComplete = code.length === CODE_LENGTH;

  return (
    <div className="min-h-screen">
      <div className="py-14 text-white" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #4f46e5 60%, #7c3aed 100%)" }}>
        <div className="container-shell text-center">
          <h1 className="text-4xl font-black tracking-tight">Verify your email</h1>
          <p className="mt-3 text-lg text-indigo-200">
            {email ? (
              <>We sent a 6-digit code to <span className="font-semibold text-white">{email}</span></>
            ) : (
              "We sent a 6-digit code to your email address"
            )}
          </p>
        </div>
      </div>

      <div className="container-shell py-14">
        <div className="mx-auto max-w-md rounded-2xl border border-indigo-100 bg-white p-8 shadow-xl shadow-indigo-100/50">
          {success ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-12" />
                </svg>
              </div>
              <p className="text-lg font-bold text-slate-900">Email verified!</p>
              <p className="text-sm text-slate-500">Taking you to your profile…</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="mb-4 text-sm font-semibold text-slate-700">Enter verification code</p>
                <div className="flex gap-2 justify-center">
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
                      className={[
                        "h-14 w-12 rounded-xl border-2 text-center text-xl font-bold transition-colors focus:outline-none",
                        digit
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-white text-slate-900 focus:border-indigo-400",
                        error ? "border-red-400" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    />
                  ))}
                </div>
              </div>

              {error ? <p className="text-center text-sm font-semibold text-red-600">{error}</p> : null}
              {resendMessage ? <p className="text-center text-sm font-semibold text-green-600">{resendMessage}</p> : null}

              <button
                type="button"
                disabled={!isComplete || loading}
                onClick={handleSubmit}
                className="btn-primary w-full justify-center py-3 text-base font-bold disabled:opacity-50"
              >
                {loading ? "Verifying…" : "Verify email"}
              </button>

              <div className="text-center text-sm text-slate-500">
                {resendCooldown > 0 ? (
                  <span>Resend code in <span className="font-semibold text-slate-700">{resendCooldown}s</span></span>
                ) : (
                  <button
                    type="button"
                    disabled={resendLoading}
                    onClick={handleResend}
                    className="font-semibold text-indigo-600 hover:underline disabled:opacity-50"
                  >
                    {resendLoading ? "Sending…" : "Resend code"}
                  </button>
                )}
              </div>

              <div className="border-t border-indigo-100 pt-4 text-center text-sm text-slate-500">
                Wrong email?{" "}
                <a href="/register" className="font-semibold text-brand-navy hover:underline">
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
