"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { useSWRConfig } from "swr";
import { api } from "@/lib/api";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

type Step = "phone" | "otp";

export default function VerifyPhonePage() {
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const [step, setStep]           = useState<Step>("phone");
  const [phone, setPhone]         = useState("");
  const [devCode, setDevCode]     = useState<string | null>(null);
  const [digits, setDigits]       = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading]   = useState(false);

  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(CODE_LENGTH).fill(null));

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const focusInput = useCallback((index: number) => {
    inputRefs.current[index]?.focus();
  }, []);

  async function handleSendOtp(event: FormEvent) {
    event.preventDefault();
    if (!phone.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const result = await api.auth.sendPhoneOtp(phone.trim());
      if (result.devCode) setDevCode(result.devCode);
      setStep("otp");
      setResendCooldown(RESEND_COOLDOWN);
      setTimeout(() => focusInput(0), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send SMS. Please check the number and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleDigitChange(index: number, value: string) {
    const char = value.replace(/\D/g, "").slice(-1);
    const next  = [...digits];
    next[index] = char;
    setDigits(next);
    setError(null);
    if (char && index < CODE_LENGTH - 1) focusInput(index + 1);
  }

  function handleDigitKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
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

  async function handleVerify() {
    const code = digits.join("");
    if (code.length < CODE_LENGTH) { setError("Please enter all 6 digits."); return; }
    setError(null);
    setLoading(true);
    try {
      await api.auth.verifyPhoneOtp(code);
      await Promise.all([mutate("profile"), mutate("notifications")]);
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
    setError(null);
    try {
      const result = await api.auth.sendPhoneOtp(phone);
      if (result.devCode) setDevCode(result.devCode);
      setResendCooldown(RESEND_COOLDOWN);
      setDigits(Array(CODE_LENGTH).fill(""));
      focusInput(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code.");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div
        className="relative overflow-hidden py-14 text-white"
        style={{ background: "linear-gradient(135deg, #0F172A 0%, #102542 55%, #1a3a2a 100%)" }}
      >
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(127,182,133,0.18), transparent 65%)" }}
        />
        <div className="container-shell text-center">
          <h1 className="text-4xl font-black tracking-tight">Verify your phone</h1>
          <p className="mt-3 text-lg" style={{ color: "#94A3B8" }}>
            {step === "phone"
              ? "Add your Ghana number to unlock secure transactions"
              : <>We sent a code to <span className="font-semibold text-white">{phone}</span></>}
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
          {success ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "rgba(127,182,133,0.15)" }}>
                <svg className="h-8 w-8" style={{ color: "#5A9460" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-12" />
                </svg>
              </div>
              <p className="text-lg font-bold" style={{ color: "#1E293B" }}>Phone number verified!</p>
              <p className="text-sm" style={{ color: "#64748B" }}>Taking you to your profile…</p>
            </div>
          ) : step === "phone" ? (
            <form className="space-y-5" onSubmit={handleSendOtp}>
              <div>
                <label className="block text-sm font-bold" style={{ color: "#1E293B" }}>Ghana phone number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0244 123 456"
                  className="input-shell mt-2"
                  required
                />
                <p className="mt-2 text-xs" style={{ color: "#94A3B8" }}>Supports MTN, Telecel, and AirtelTigo numbers.</p>
              </div>

              {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base font-bold disabled:opacity-50">
                {loading ? "Sending code…" : "Send verification code"}
              </button>

              {/* Cross-link */}
              <p className="text-center text-sm" style={{ color: "#64748B" }}>
                No Ghana number?{" "}
                <Link href="/verify-email" className="font-semibold hover:underline" style={{ color: "#5A9460" }}>
                  Verify email instead →
                </Link>
              </p>
            </form>
          ) : (
            <div className="space-y-6">
              {devCode && (
                <div className="rounded-xl border px-4 py-3 text-sm"
                  style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.30)", color: "#92400E" }}>
                  <span className="font-bold">Dev mode:</span> SMS not delivered — code: <span className="font-mono font-black tracking-widest">{devCode}</span>
                </div>
              )}

              <div>
                <p className="mb-4 text-sm font-semibold" style={{ color: "#1E293B" }}>Enter verification code</p>
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
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(index, e)}
                      onPaste={handlePaste}
                      className="h-14 w-12 rounded-xl border-2 text-center text-xl font-bold transition-colors focus:outline-none"
                      style={{
                        borderColor: error ? "#EF4444" : digit ? "#7FB685" : "#E2E8F0",
                        background:  digit ? "rgba(127,182,133,0.08)" : "#ffffff",
                        color:       digit ? "#0F172A" : "#1E293B",
                      }}
                    />
                  ))}
                </div>
              </div>

              {error ? <p className="text-center text-sm font-semibold text-red-600">{error}</p> : null}

              <button
                type="button"
                disabled={digits.join("").length < CODE_LENGTH || loading}
                onClick={handleVerify}
                className="btn-primary w-full justify-center py-3 text-base font-bold disabled:opacity-50"
              >
                {loading ? "Verifying…" : "Verify phone"}
              </button>

              <div className="text-center text-sm" style={{ color: "#64748B" }}>
                {resendCooldown > 0 ? (
                  <span>Resend in <span className="font-semibold" style={{ color: "#1E293B" }}>{resendCooldown}s</span></span>
                ) : (
                  <button type="button" disabled={resendLoading} onClick={handleResend}
                    className="font-semibold hover:underline disabled:opacity-50" style={{ color: "#5A9460" }}>
                    {resendLoading ? "Sending…" : "Resend code"}
                  </button>
                )}
              </div>

              <div className="border-t pt-4 space-y-2 text-center text-sm" style={{ borderColor: "rgba(226,232,240,0.60)", color: "#64748B" }}>
                <p>
                  Wrong number?{" "}
                  <button type="button" onClick={() => { setStep("phone"); setDigits(Array(CODE_LENGTH).fill("")); setError(null); setDevCode(null); }}
                    className="font-semibold hover:underline" style={{ color: "#0F172A" }}>
                    Change it
                  </button>
                </p>
                <p>
                  Having trouble?{" "}
                  <Link href="/verify-email" className="font-semibold hover:underline" style={{ color: "#5A9460" }}>
                    Verify email instead →
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
