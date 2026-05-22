"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { api } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (!token) {
      setError("Reset token is missing. Use the link from your email.");
      return;
    }

    setLoading(true);
    try {
      const result = await api.auth.resetPassword(token, password);
      setMessage(result.message || "Password updated successfully.");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-bold text-slate-900">New password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 8 characters, letters and numbers"
          className="input-shell mt-2"
          minLength={8}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-900">Confirm new password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
          className="input-shell mt-2"
          required
        />
      </div>

      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-brand-green">{message}</p> : null}

      <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base font-bold">
        {loading ? "Updating..." : "Set new password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen">
      <div className="py-14 text-white" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #4f46e5 60%, #7c3aed 100%)" }}>
        <div className="container-shell text-center">
          <h1 className="text-4xl font-black tracking-tight">Set New Password</h1>
          <p className="mt-3 text-lg text-indigo-200">Create a strong password for your account</p>
        </div>
      </div>

      <div className="container-shell py-14">
        <div className="mx-auto max-w-md rounded-2xl border border-indigo-100 bg-white p-8 shadow-xl shadow-indigo-100/50">
          <Suspense fallback={<div className="text-sm text-slate-500">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>

          <div className="mt-6 border-t border-indigo-100 pt-6 text-center">
            <p className="text-sm text-slate-600">
              Back to{" "}
              <Link href="/login" className="font-bold text-brand-green hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
