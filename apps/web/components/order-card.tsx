"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, MessageCircle, XCircle } from "lucide-react";
import type { Order } from "@/types";
import { api } from "@/lib/api";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import { ProductArt } from "@/components/product-card";

const STATUS_COLORS: Record<string, string> = {
  "Payment pending": "bg-amber-100 text-amber-700",
  "In progress": "bg-blue-100 text-blue-700",
  "Out for delivery": "bg-sky-100 text-sky-700",
  Completed: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

function canCancel(order: Order): boolean {
  if (order.role === "buyer") return order.status === "In progress";
  if (order.role === "seller") return order.status === "Payment pending" || order.status === "In progress";
  return false;
}

export function OrderCard({ order, onStatusChange }: { order: Order; onStatusChange?: () => void }) {
  const router = useRouter();
  const statusClass = STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-700";

  const [chatLoading, setChatLoading] = useState(false);
  const [cancelStep, setCancelStep] = useState<"idle" | "confirm">("idle");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChat() {
    if (!order.counterpartId) return;
    setChatLoading(true);
    setError(null);
    try {
      const { id } = await api.startConversation(order.counterpartId, order.product.id);
      router.push(`/messages?c=${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open chat.");
    } finally {
      setChatLoading(false);
    }
  }

  async function handleCancel() {
    setCancelLoading(true);
    setError(null);
    try {
      await api.updateOrderStatus(order.id, "Cancelled");
      onStatusChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel order.");
      setCancelStep("idle");
    } finally {
      setCancelLoading(false);
    }
  }

  const cancellable = canCancel(order);

  return (
    <article className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[120px_1fr_auto] sm:items-start">
      <ProductArt style={order.product.imageStyle} className="min-h-28 rounded-xl" />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass}`}>{order.status}</span>
          <span className="text-xs font-semibold text-slate-400">{formatRelativeDate(order.updatedAt)}</span>
        </div>
        <h3 className="mt-3 text-lg font-black text-slate-950">{order.product.title}</h3>
        <p className="mt-1 text-base font-black text-brand-navy">{formatCurrency(order.product.price)}</p>
        {order.meetupLocation ? (
          <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-slate-500">
            <MapPin className="h-4 w-4" />
            {order.meetupLocation}{order.counterpart ? ` · ${order.counterpart}` : ""}
          </p>
        ) : null}
        {error ? (
          <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>
        ) : null}
        {cancelStep === "confirm" ? (
          <div className="mt-3 rounded-xl border p-3 space-y-2" style={{ borderColor: "rgba(220,38,38,0.30)", background: "rgba(254,242,242,0.60)" }}>
            <p className="text-xs font-bold text-red-700">Cancel this order? This cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setCancelStep("idle")}
                className="flex-1 rounded-xl border px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                style={{ borderColor: "rgba(226,232,240,0.70)" }}
              >
                Keep
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                className="flex-1 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
                style={{ background: cancelLoading ? "#FCA5A5" : "#DC2626" }}
              >
                {cancelLoading ? "Cancelling…" : "Yes, cancel"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex gap-2 sm:flex-col">
        <Link href={`/orders/${order.id}`} className="btn-primary min-h-10 flex-1 rounded-xl px-3 py-2 text-center text-xs">
          View
        </Link>
        {order.counterpartId ? (
          <button
            onClick={handleChat}
            disabled={chatLoading}
            className="btn-secondary min-h-10 flex-1 rounded-xl px-3 py-2 text-xs"
          >
            <MessageCircle className="h-4 w-4" />
            {chatLoading ? "…" : "Chat"}
          </button>
        ) : null}
        {cancellable && cancelStep === "idle" ? (
          <button
            onClick={() => setCancelStep("confirm")}
            className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors hover:bg-red-50"
            style={{ color: "#DC2626", borderColor: "rgba(220,38,38,0.25)" }}
          >
            <XCircle className="h-4 w-4" />
            Cancel
          </button>
        ) : null}
      </div>
    </article>
  );
}
