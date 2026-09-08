"use client";

import Link from "next/link";
import { CalendarCheck, CalendarX2, Check, CheckCircle2, ChevronRight, Clock, Loader2, X } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useSWRConfig } from "swr";
import { api } from "@/lib/api";
import { formatRelativeDate } from "@/lib/format";
import { AuthGate } from "@/components/auth-gate";
import { EmptyState } from "@/components/ui";
import { useBookings, useProfile } from "@/hooks/use-api";
import { useToast } from "@/providers/toast-provider";
import type { ServiceBooking, ServiceBookingStatus } from "@/types";

const snap = { type: "spring", stiffness: 380, damping: 22 } as const;

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  REQUESTED:  { bg: "rgba(217,119,6,0.10)",   color: "#B45309", label: "Awaiting confirmation" },
  ACCEPTED:   { bg: "rgba(59,130,246,0.10)",  color: "#2563EB", label: "Accepted — awaiting payment" },
  DECLINED:   { bg: "rgba(239,68,68,0.10)",   color: "#DC2626", label: "Declined" },
  CONFIRMED:  { bg: "rgba(22,163,74,0.10)",   color: "#16A34A", label: "Confirmed" },
  IN_SERVICE:             { bg: "rgba(168,85,247,0.10)",  color: "#9333EA", label: "In progress" },
  AWAITING_CONFIRMATION:  { bg: "rgba(217,119,6,0.10)",  color: "#B45309", label: "Awaiting your confirmation" },
  COMPLETED:              { bg: "rgba(22,163,74,0.10)",  color: "#16A34A", label: "Completed" },
  CANCELLED:  { bg: "rgba(113,113,122,0.10)", color: "#71717A", label: "Cancelled" },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? { bg: "#F4F4F5", color: "#71717A", label: status };
  return (
    <span className="rounded-full px-2.5 py-1 text-xs font-black"
      style={{ background: style.bg, color: style.color }}>
      {style.label}
    </span>
  );
}

function BookingCard({ booking, isSeller, onAction }: {
  booking: ServiceBooking;
  isSeller: boolean;
  onAction: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);

  const scheduledDate = new Date(booking.scheduledAt);
  const dateStr = scheduledDate.toLocaleDateString("en-GH", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });
  const timeStr = scheduledDate.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });

  async function act(fn: () => Promise<unknown>, key: string, successMsg: string) {
    setLoading(key);
    try {
      await fn();
      toast(successMsg);
      onAction();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={snap}
      className="rounded-2xl p-5 space-y-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 2px 12px rgba(9,9,11,0.04)" }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-black text-sm" style={{ color: "var(--on-surface)" }}>
            {booking.product.title}
          </p>
          <p className="mt-0.5 text-xs font-semibold" style={{ color: "var(--muted)" }}>
            {isSeller ? `Buyer: ${booking.buyer.name}` : `Seller: ${booking.seller.name}`}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* Time */}
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--muted)" }}>
        <Clock size={14} style={{ color: "var(--green)" }} />
        <span>{dateStr} · {timeStr}</span>
        <span style={{ color: "var(--subtle)" }}>· {booking.durationMin}min</span>
      </div>

      {/* Amount */}
      <div className="flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-black"
        style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
        <span style={{ color: "var(--muted)" }}>Total</span>
        <span style={{ color: "var(--green)" }}>GHS {booking.totalAmount.toFixed(2)}</span>
      </div>

      {/* Notes */}
      {booking.notes && (
        <p className="text-xs leading-5" style={{ color: "var(--muted)" }}>
          &ldquo;{booking.notes}&rdquo;
        </p>
      )}

      {/* Cancel reason */}
      {booking.cancelReason && (
        <p className="text-xs" style={{ color: "#EF4444" }}>
          Reason: {booking.cancelReason}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {/* Seller actions */}
        {isSeller && booking.status === "REQUESTED" && (
          <>
            <button type="button" onClick={() => act(() => api.acceptBooking(booking.id), "accept", "Booking accepted. Buyer will be notified to pay.")}
              disabled={!!loading}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-white disabled:opacity-50"
              style={{ background: "var(--green)" }}>
              {loading === "accept" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Accept
            </button>
            <button type="button" onClick={() => act(() => api.declineBooking(booking.id), "decline", "Booking declined.")}
              disabled={!!loading}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black disabled:opacity-50"
              style={{ background: "rgba(239,68,68,0.10)", color: "#DC2626", border: "1px solid rgba(239,68,68,0.20)" }}>
              {loading === "decline" ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
              Decline
            </button>
          </>
        )}

        {isSeller && booking.status === "CONFIRMED" && (
          <button type="button" onClick={() => act(() => api.startService(booking.id), "start", "Service marked as in progress.")}
            disabled={!!loading}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-white disabled:opacity-50"
            style={{ background: "var(--green)" }}>
            {loading === "start" ? <Loader2 size={12} className="animate-spin" /> : <CalendarCheck size={12} />}
            Mark In Progress
          </button>
        )}

        {isSeller && booking.status === "IN_SERVICE" && (
          <button type="button" onClick={() => act(() => api.completeService(booking.id), "complete", "Service marked complete. The buyer has 48 hours to confirm.")}
            disabled={!!loading}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-white disabled:opacity-50"
            style={{ background: "var(--green)" }}>
            {loading === "complete" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Complete Service
          </button>
        )}

        {/* Buyer confirms service delivery — releases escrow to seller */}
        {!isSeller && booking.status === "AWAITING_CONFIRMATION" && (
          <div className="w-full space-y-2">
            <button type="button"
              onClick={() => act(() => api.confirmServiceCompletion(booking.id), "confirm", "Service confirmed. Payment has been released to the seller.")}
              disabled={!!loading}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-white disabled:opacity-50"
              style={{ background: "var(--green)" }}>
              {loading === "confirm" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Confirm service complete
            </button>
            <p className="text-[10px] leading-4 font-semibold" style={{ color: "var(--subtle)" }}>
              If you don&apos;t respond, the service will be marked complete automatically after 48 hours and payment will be released.
            </p>
          </div>
        )}

        {/* Pay link for accepted bookings (buyer) */}
        {!isSeller && booking.status === "ACCEPTED" && booking.orderId && (
          <Link href={`/orders/${booking.orderId}`}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-white"
            style={{ background: "var(--green)" }}>
            Pay now <ChevronRight size={12} />
          </Link>
        )}

        {/* Cancel (buyer only, for REQUESTED/ACCEPTED/CONFIRMED) */}
        {!isSeller && ["REQUESTED", "ACCEPTED", "CONFIRMED"].includes(booking.status) && (
          <>
            {!showCancelForm ? (
              <button type="button" onClick={() => setShowCancelForm(true)}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black disabled:opacity-50"
                style={{ background: "rgba(239,68,68,0.10)", color: "#DC2626", border: "1px solid rgba(239,68,68,0.20)" }}>
                <CalendarX2 size={12} />
                Cancel booking
              </button>
            ) : (
              <div className="w-full space-y-2">
                <input type="text" value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation (optional)"
                  className="w-full rounded-xl px-3 py-2 text-xs outline-none"
                  style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--on-surface)" }} />
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => act(() => api.cancelBooking(booking.id, cancelReason || undefined), "cancel", "Booking cancelled.")}
                    disabled={!!loading}
                    className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                    style={{ background: "#DC2626" }}>
                    {loading === "cancel" ? <Loader2 size={12} className="animate-spin" /> : null}
                    Confirm cancel
                  </button>
                  <button type="button" onClick={() => setShowCancelForm(false)}
                    className="rounded-xl px-4 py-2 text-xs font-bold"
                    style={{ color: "var(--muted)" }}>
                    Keep booking
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Dispute link from AWAITING_CONFIRMATION */}
        {!isSeller && booking.status === "AWAITING_CONFIRMATION" && booking.orderId && (
          <Link href={`/orders/${booking.orderId}?dispute=1`}
            className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold"
            style={{ color: "#DC2626", border: "1px solid rgba(239,68,68,0.20)", background: "rgba(239,68,68,0.06)" }}>
            Raise dispute
          </Link>
        )}

        {/* Link to order for all */}
        {booking.orderId && booking.status !== "ACCEPTED" && (
          <Link href={`/orders/${booking.orderId}`}
            className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold"
            style={{ color: "var(--muted)", border: "1px solid var(--border)" }}>
            View order <ChevronRight size={11} />
          </Link>
        )}

        {/* Link to product */}
        <Link href={`/products/${booking.productId}`}
          className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold"
          style={{ color: "var(--muted)", border: "1px solid var(--border)" }}>
          View service <ChevronRight size={11} />
        </Link>
      </div>

      <p className="text-[10px] font-semibold" style={{ color: "var(--subtle)" }}>
        Requested {formatRelativeDate(booking.createdAt)}
      </p>
    </motion.div>
  );
}

export default function BookingsPage() {
  const { data: profile } = useProfile();
  const { data: bookings, isLoading, mutate } = useBookings();
  const { mutate: globalMutate } = useSWRConfig();
  const [tab, setTab] = useState<"buyer" | "seller">("buyer");

  function refresh() {
    mutate();
    globalMutate("bookings");
  }

  const myId = profile?.id;

  const buyerBookings  = (bookings ?? []).filter(b => b.buyerId  === myId);
  const sellerBookings = (bookings ?? []).filter(b => b.sellerId === myId);

  const shown = tab === "buyer" ? buyerBookings : sellerBookings;

  const activeStatuses: ServiceBookingStatus[] = ["REQUESTED", "ACCEPTED", "CONFIRMED", "IN_SERVICE", "AWAITING_CONFIRMATION"];
  const active = shown.filter(b => activeStatuses.includes(b.status as ServiceBookingStatus));
  const past   = shown.filter(b => !activeStatuses.includes(b.status as ServiceBookingStatus));

  return (
    <AuthGate>
      <div className="min-h-screen" style={{ background: "var(--background)" }}>

        {/* Header */}
        <div className="relative overflow-hidden py-10 text-white"
          style={{ background: "linear-gradient(135deg, #0F172A 0%, #102542 55%, #1a3a2a 100%)" }}>
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(114,204,35,0.18), transparent 65%)" }} />
          <div className="container-shell">
            <p className="mb-2 text-xs font-black uppercase tracking-widest" style={{ color: "#72CC23" }}>Service bookings</p>
            <h1 className="text-3xl font-black tracking-tight">My Bookings</h1>
            <p className="mt-2 text-sm leading-6" style={{ color: "#94A3B8" }}>
              Manage your service appointments in one place.
            </p>
          </div>
        </div>

        <div className="container-shell py-8">
          {/* Tab toggle */}
          <div className="mb-6 grid grid-cols-2 gap-1.5 rounded-2xl p-1.5 max-w-xs"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {(["buyer", "seller"] as const).map(t => (
              <motion.button key={t} type="button" onClick={() => setTab(t)}
                whileTap={{ scale: 0.97 }} transition={snap}
                className="rounded-xl py-2 text-sm font-black transition-colors"
                style={tab === t
                  ? { background: "var(--on-surface)", color: "var(--background)" }
                  : { color: "var(--muted)" }}>
                {t === "buyer" ? "My bookings" : "As seller"}
              </motion.button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={32} className="animate-spin" style={{ color: "var(--green)" }} />
            </div>
          ) : shown.length === 0 ? (
            <EmptyState
              title={tab === "buyer" ? "No bookings yet" : "No service requests yet"}
              description={tab === "buyer"
                ? "Browse services on campus and request your first booking."
                : "When students request your services, they'll appear here."}
              action={
                tab === "buyer"
                  ? <Link href="/products?category=Services" className="btn-primary">Browse services</Link>
                  : <Link href="/sell" className="btn-primary">List a service</Link>
              }
            />
          ) : (
            <div className="space-y-8">
              {active.length > 0 && (
                <section>
                  <h2 className="mb-4 text-sm font-black uppercase tracking-wider" style={{ color: "var(--subtle)" }}>
                    Active · {active.length}
                  </h2>
                  <div className="space-y-3">
                    {active.map(b => (
                      <BookingCard key={b.id} booking={b} isSeller={tab === "seller"} onAction={refresh} />
                    ))}
                  </div>
                </section>
              )}

              {past.length > 0 && (
                <section>
                  <h2 className="mb-4 text-sm font-black uppercase tracking-wider" style={{ color: "var(--subtle)" }}>
                    Past · {past.length}
                  </h2>
                  <div className="space-y-3">
                    {past.map(b => (
                      <BookingCard key={b.id} booking={b} isSeller={tab === "seller"} onAction={refresh} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGate>
  );
}
