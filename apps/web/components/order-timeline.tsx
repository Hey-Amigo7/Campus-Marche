import { CheckCircle2, Circle, XCircle } from "lucide-react";

type Status = string;

const STEPS = [
  { key: "Payment pending", label: "Order placed", description: "Waiting for payment" },
  { key: "In progress", label: "Payment confirmed", description: "Funds held in escrow" },
  { key: "Out for delivery", label: "Out for delivery", description: "On the way to you" },
  { key: "Completed", label: "Completed", description: "Item received, funds released" },
];

function stepIndex(status: Status) {
  if (status === "Cancelled") return -1;
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

export function OrderTimeline({ status }: { status: Status }) {
  const cancelled = status === "Cancelled";
  const current = stepIndex(status);

  if (cancelled) {
    return (
      <div className="flex items-center gap-3 rounded-2xl p-4" style={{ background: "rgba(254,242,242,0.70)", border: "1px solid rgba(220,38,38,0.20)" }}>
        <XCircle className="h-5 w-5 shrink-0 text-red-500" />
        <div>
          <p className="font-black text-red-700">Order cancelled</p>
          <p className="text-xs text-red-500">This order was cancelled and no funds were transferred.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const upcoming = i > current;

        return (
          <div key={step.key} className="flex gap-4">
            {/* Icon + line */}
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
                  style={{
                    background: done ? "#5A9460" : "rgba(226,232,240,0.80)",
                    minHeight: "24px",
                  }}
                />
              ) : null}
            </div>

            {/* Label */}
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
