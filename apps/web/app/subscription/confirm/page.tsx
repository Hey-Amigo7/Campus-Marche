"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { api } from "@/lib/api";

export default function SubscriptionConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref") ?? "";
  const [state, setState] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!reference) { setState("error"); setMessage("No payment reference found."); return; }

    api.verifyPayment(reference)
      .then((tx) => {
        if (tx.status === "Paid" || (tx.status ?? "").toLowerCase().includes("success")) {
          setState("success");
          setMessage("Your subscription is now active!");
        } else {
          setState("error");
          setMessage("Payment was not completed. Please try again.");
        }
      })
      .catch((err) => {
        setState("error");
        setMessage(err instanceof Error ? err.message : "Could not verify payment.");
      });
  }, [reference]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div
        className="mx-auto max-w-md rounded-2xl p-10 text-center"
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
          </>
        ) : state === "success" ? (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12" style={{ color: "#5A9460" }} />
            <p className="mt-4 text-lg font-black" style={{ color: "#0F172A" }}>Subscription activated!</p>
            <p className="mt-2 text-sm" style={{ color: "#64748B" }}>{message}</p>
            <button onClick={() => router.push("/profile")} className="btn-primary mt-6 w-full justify-center">
              Go to profile
            </button>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <p className="mt-4 text-lg font-black" style={{ color: "#0F172A" }}>Payment issue</p>
            <p className="mt-2 text-sm" style={{ color: "#64748B" }}>{message}</p>
            <button onClick={() => router.push("/premium")} className="btn-secondary mt-6 w-full justify-center">
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
