"use client";

import { CheckCircle2, Circle, XCircle } from "lucide-react";
import type { EscrowStatus } from "@/types";

const STEPS: { states: EscrowStatus[]; label: string; description: string }[] = [
  {
    states: ["PENDING_PAYMENT", "PAYMENT_INITIALIZED", "PAYMENT_VERIFIED"],
    label: "Order placed",
    description: "Waiting for payment",
  },
  {
    states: ["ESCROW_HELD", "PROCESSING"],
    label: "Payment confirmed",
    description: "Funds held in escrow",
  },
  {
    states: ["SHIPPED", "DELIVERED"],
    label: "Out for delivery",
    description: "On the way to you",
  },
  {
    states: ["RELEASE_PENDING", "RELEASED"],
    label: "Completed",
    description: "Item received, funds released",
  },
];

function stepIndex(escrow: EscrowStatus): number {
  for (let i = STEPS.length - 1; i >= 0; i--) {
    if (STEPS[i]!.states.includes(escrow)) return i;
  }
  return 0;
}

export function OrderTimeline({ status, escrowStatus }: { status: string; escrowStatus?: string }) {
  const escrow = (escrowStatus ?? "PENDING_PAYMENT") as EscrowStatus;

  if (status === "Cancelled" || escrow === "REFUNDED" || escrow === "FAILED") {
    const isRefunded = escrow === "REFUNDED";
    return (
      <div
        className="flex items-center gap-3 rounded-2xl p-4"
        style={{
          background: isRefunded ? "rgba(241,245,249,0.70)" : "rgba(254,242,242,0.70)",
          border: `1px solid ${isRefunded ? "rgba(148,163,184,0.30)" : "rgba(220,38,38,0.20)"}`,
        }}
      >
        <XCircle className={`h-5 w-5 shrink-0 ${isRefunded ? "text-slate-400" : "text-red-500"}`} />
        <div>
          <p className={`font-black ${isRefunded ? "text-slate-600" : "text-red-700"}`}>
            {isRefunded ? "Order refunded" : "Order cancelled"}
          </p>
          <p className={`text-xs ${isRefunded ? "text-slate-400" : "text-red-500"}`}>
            {isRefunded
              ? "Payment was refunded to the buyer."
              : "This order was cancelled and no funds were transferred."}
          </p>
        </div>
      </div>
    );
  }

  if (escrow === "DISPUTED") {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl p-4"
        style={{ background: "rgba(255,247,237,0.80)", border: "1px solid rgba(251,146,60,0.30)" }}
      >
        <XCircle className="h-5 w-5 shrink-0 text-orange-500" />
        <div>
          <p className="font-black text-orange-700">Under dispute</p>
          <p className="text-xs text-orange-500">This order is being reviewed. Please contact support.</p>
        </div>
      </div>
    );
  }

  const current = stepIndex(escrow);

  return (
    <div className="space-y-0">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const upcoming = i > current;

        return (
          <div key={step.label} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
                style={
                  done
                    ? { background: "#5A9460", color: "#fff" }
                    : active
                    ? { background: "#0F172A", color: "#fff" }
                    : { background: "rgba(226,232,240,0.80)", color: "#94A3B8" }
                }
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" fill={active ? "currentColor" : "none"} />
                )}
              </span>
              {i < STEPS.length - 1 ? (
                <div
                  className="my-1 w-0.5 flex-1"
                  style={{ background: done ? "#5A9460" : "rgba(226,232,240,0.80)", minHeight: "24px" }}
                />
              ) : null}
            </div>

            <div className={`pb-5 pt-0.5 ${upcoming ? "opacity-40" : ""}`}>
              <p
                className="text-sm font-black"
                style={{ color: active ? "#0F172A" : done ? "#5A9460" : "#64748B" }}
              >
                {step.label}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "#94A3B8" }}>{step.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
