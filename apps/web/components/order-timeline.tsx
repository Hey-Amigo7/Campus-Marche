"use client";

import { CheckCircle2, Circle, XCircle } from "lucide-react";

const PRODUCT_STEPS = [
  { label: "Order placed",      description: "Your order has been received" },
  { label: "Payment confirmed", description: "Funds held securely in escrow" },
  { label: "Out for delivery",  description: "On the way to you" },
  { label: "Completed",         description: "Item received · funds released to seller" },
];

const SERVICE_STEPS = [
  { label: "Booking created",   description: "Your booking request was sent" },
  { label: "Payment confirmed", description: "Funds held securely in escrow" },
  { label: "Service complete",  description: "Seller marked service as done" },
  { label: "Completed",         description: "Funds released to seller" },
];

// Escrow states that mean payment is confirmed
const PAID_ESCROW      = new Set(["ESCROW_HELD", "PROCESSING", "SHIPPED", "DELIVERED", "RELEASE_PENDING", "RELEASED"]);
// Product: delivery is in progress or done
const DELIVERY_ESCROW  = new Set(["SHIPPED", "DELIVERED", "RELEASE_PENDING", "RELEASED"]);
const DELIVERY_STATUS  = new Set(["Out for delivery", "Delivered", "Releasing funds", "Completed"]);
// Product: buyer confirmed delivery
const COMPLETE_ESCROW  = new Set(["RELEASE_PENDING", "RELEASED"]);
const COMPLETE_STATUS  = new Set(["Releasing funds", "Completed"]);
// Service: service marked complete (by seller or auto-release)
const SVC_DONE_ESCROW    = new Set(["RELEASE_PENDING", "RELEASED"]);
const SVC_DONE_STATUS    = new Set(["Releasing funds", "Completed"]);
// Booking statuses that mean the service itself is done (seller finished, awaiting buyer confirm or already confirmed)
const SVC_DONE_BOOKING   = new Set(["AWAITING_CONFIRMATION", "COMPLETED"]);

function isDoneProduct(step: number, status: string, escrow: string): boolean {
  switch (step) {
    case 0: return true;
    case 1: return PAID_ESCROW.has(escrow);
    case 2: return DELIVERY_ESCROW.has(escrow) || DELIVERY_STATUS.has(status);
    case 3: return COMPLETE_ESCROW.has(escrow) || COMPLETE_STATUS.has(status);
    default: return false;
  }
}

function isDoneService(step: number, status: string, escrow: string, bookingStatus?: string): boolean {
  switch (step) {
    case 0: return true;
    case 1: return PAID_ESCROW.has(escrow);
    case 2: return SVC_DONE_ESCROW.has(escrow) || SVC_DONE_STATUS.has(status) || (bookingStatus != null && SVC_DONE_BOOKING.has(bookingStatus));
    case 3: return escrow === "RELEASED" || status === "Completed";
    default: return false;
  }
}

export function OrderTimeline({ status, escrowStatus, isServiceOrder, bookingStatus }: {
  status: string;
  escrowStatus?: string;
  isServiceOrder?: boolean;
  bookingStatus?: string;
}) {
  const escrow = escrowStatus ?? "PENDING_PAYMENT";

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

  const STEPS = isServiceOrder ? SERVICE_STEPS : PRODUCT_STEPS;
  const isDone = isServiceOrder
    ? (i: number, s: string, e: string) => isDoneService(i, s, e, bookingStatus)
    : isDoneProduct;
  const done = STEPS.map((_, i) => isDone(i, status, escrow));
  // The active step is the first one that isn't done yet
  const activeIndex = done.findIndex((d) => !d);

  return (
    <div className="space-y-0">
      {STEPS.map((step, i) => {
        const isStepDone   = done[i]!;
        const isActive     = i === activeIndex;
        const isUpcoming   = !isStepDone && !isActive;

        return (
          <div key={step.label} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
                style={
                  isStepDone
                    ? { background: "#5A9460", color: "#fff" }
                    : isActive
                    ? { background: "#0F172A", color: "#fff" }
                    : { background: "rgba(226,232,240,0.80)", color: "#94A3B8" }
                }
              >
                {isStepDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" fill={isActive ? "currentColor" : "none"} />
                )}
              </span>
              {i < STEPS.length - 1 ? (
                <div
                  className="my-1 w-0.5 flex-1"
                  style={{ background: isStepDone ? "#5A9460" : "rgba(226,232,240,0.80)", minHeight: "24px" }}
                />
              ) : null}
            </div>

            <div className={`pb-5 pt-0.5 ${isUpcoming ? "opacity-40" : ""}`}>
              <p
                className="text-sm font-black"
                style={{ color: isActive ? "#0F172A" : isStepDone ? "#5A9460" : "#64748B" }}
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
