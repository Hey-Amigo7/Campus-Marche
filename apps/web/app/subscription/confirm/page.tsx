"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Crown, Loader2, XCircle } from "lucide-react";
import { api } from "@/lib/api";

export default function SubscriptionConfirmPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: "#5A9460" }} />
      </div>
    }>
      <ConfirmInner />
    </Suspense>
  );
}

function ConfirmInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref") ?? "";
  const [state, setState] = useState<"verifying" | "success" | "error">("verifying");
  const [plan, setPlan] = useState<string>("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!reference) {
      setState("error");
      setMessage("No payment reference found. Please try again.");
      return;
    }

    api.verifySubscription(reference)
      .then((result) => {
        setPlan(result.plan ?? "");
        setState("success");
        setMessage("Your subscription is now active!");
      })
      .catch((err) => {
        setState("error");
        setMessage(err instanceof Error ? err.message : "Could not verify payment.");
      });
  }, [reference]);

  const planLabel = plan === "featured" ? "Featured" : plan === "daily" ? "Daily Boost" : "Seller Pro";

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div
        className="mx-auto w-full max-w-md rounded-2xl p-10 text-center"
        style={{
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(226,232,240,0.70)",
          boxShadow: "0 8px 32px rgba(15,23,42,0.10)",
        }}
      >
        {state === "verifying" ? (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin" style={{ color: "#5A9460" }} />
            <p className="mt-4 text-lg font-black" style={{ color: "#0F172A" }}>Confirming your payment…</p>
            <p className="mt-2 text-sm" style={{ color: "#64748B" }}>This usually takes just a moment.</p>
          </>
        ) : state === "success" ? (
          <>
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full" style={{ background: "rgba(127,182,133,0.15)" }}>
              <CheckCircle2 className="h-9 w-9" style={{ color: "#5A9460" }} />
            </div>
            <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-black" style={{ background: "rgba(198,139,89,0.12)", color: "#C68B59" }}>
              <Crown className="h-4 w-4" /> {planLabel} activated
            </div>
            <p className="mt-2 text-lg font-black" style={{ color: "#0F172A" }}>Welcome to premium!</p>
            <p className="mt-2 text-sm leading-6" style={{ color: "#64748B" }}>
              Your plan is now active. Unlimited listings, verified badge, and analytics are all ready.
            </p>
            <button onClick={() => router.push("/profile")} className="btn-primary mt-6 w-full justify-center">
              View your profile
            </button>
            <button onClick={() => router.push("/sell")} className="btn-secondary mt-3 w-full justify-center">
              Create a listing
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full" style={{ background: "rgba(239,68,68,0.08)" }}>
              <XCircle className="h-9 w-9 text-red-500" />
            </div>
            <p className="mt-2 text-lg font-black" style={{ color: "#0F172A" }}>Payment issue</p>
            <p className="mt-2 text-sm leading-6" style={{ color: "#64748B" }}>{message}</p>
            <button onClick={() => router.push("/premium")} className="btn-primary mt-6 w-full justify-center">
              Try again
            </button>
            <button onClick={() => router.push("/")} className="btn-secondary mt-3 w-full justify-center">
              Go home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
