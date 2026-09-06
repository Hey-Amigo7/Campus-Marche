"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Shield,
  Square,
  Truck,
  User,
} from "lucide-react";
import { api } from "@/lib/api";
import { useOrder } from "@/hooks/use-api";
import { useSocket } from "@/hooks/use-socket";
import { ESCROW_LABELS, PAID_ESCROW_STATES, type EscrowStatus } from "@/types";
import { useToast } from "@/providers/toast-provider";
import { AuthGate } from "@/components/auth-gate";
import { OrderTimeline } from "@/components/order-timeline";
import { ProductArt } from "@/components/product-card";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import type { DeliveryCoords } from "@/components/delivery-map";

// Leaflet reads window on import — must be client-only
const DeliveryMap = dynamic(
  () => import("@/components/delivery-map").then(m => m.DeliveryMap),
  { ssr: false, loading: () => <div className="h-64 w-full animate-pulse rounded-2xl bg-slate-100" /> }
);

const ESCROW_COLORS: Partial<Record<EscrowStatus, string>> & Record<string, string> = {
  PENDING_PAYMENT:     "bg-amber-100 text-amber-800",
  PAYMENT_INITIALIZED: "bg-amber-100 text-amber-800",
  PAYMENT_VERIFIED:    "bg-blue-100 text-blue-800",
  ESCROW_HELD:         "bg-blue-100 text-blue-800",
  PROCESSING:          "bg-sky-100 text-sky-800",
  SHIPPED:             "bg-sky-100 text-sky-800",
  DELIVERED:           "bg-emerald-100 text-emerald-800",
  RELEASE_PENDING:     "bg-violet-100 text-violet-800",
  RELEASED:            "bg-green-100 text-green-800",
  DISPUTED:            "bg-orange-100 text-orange-800",
  REFUNDED:            "bg-slate-100 text-slate-700",
  FAILED:              "bg-red-100 text-red-800",
};


function ChatButton({ counterpartId, productId }: { counterpartId: string; productId: string }) {
  const router = useRouter();
  const { error } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleChat() {
    setLoading(true);
    try {
      const { id } = await api.startConversation(counterpartId, productId);
      router.push(`/messages?c=${id}`);
    } catch (err) {
      error("Could not open chat", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleChat}
      disabled={loading}
      className="btn-secondary mt-3 w-full justify-center text-sm disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
      {loading ? "Opening…" : "Message"}
    </button>
  );
}

function headingToCompass(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8] ?? "N";
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { data: order, mutate } = useOrder(id);

  // Auto-verify payment when Paystack returns with ?reference= or ?trxref=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference") || params.get("trxref");
    if (!ref) return;
    // Remove the query params immediately so a reload doesn't re-trigger
    router.replace(`/orders/${id}`, { scroll: false });
    api.verifyPayment(ref)
      .then(() => { toast("Payment confirmed! Your order is now active."); return mutate(); })
      .catch(() => { toast("Payment received — your order will update shortly."); return mutate(); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Delivery details form
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [savingDelivery, setSavingDelivery] = useState(false);

  // Assign delivery person
  const [deliveryContact, setDeliveryContact] = useState("");
  const [deliveryContactName, setDeliveryContactName] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Live delivery tracking
  const [liveCoords, setLiveCoords] = useState<DeliveryCoords | null>(
    order?.tracking ? { lat: order.tracking.latitude, lng: order.tracking.longitude, heading: order.tracking.heading, speed: order.tracking.speed, updatedAt: order.tracking.updatedAt } : null
  );
  const [buyerCoords, setBuyerCoords] = useState<DeliveryCoords | null>(
    (order as (typeof order & { buyerLocation?: { latitude: number; longitude: number; updatedAt?: string | null } | null }))?.buyerLocation
      ? { lat: (order as never as { buyerLocation: { latitude: number; longitude: number; updatedAt?: string | null } }).buyerLocation.latitude, lng: (order as never as { buyerLocation: { latitude: number; longitude: number } }).buyerLocation.longitude }
      : null
  );
  const [sharingLocation, setSharingLocation]       = useState(false);
  const [sharingBuyerLoc, setSharingBuyerLoc]       = useState(false);
  const watchRef      = useRef<number | null>(null);
  const buyerWatchRef = useRef<number | null>(null);
  const { socketRef } = useSocket();

  // Sync delivery coords from fresh order data
  useEffect(() => {
    if (order?.tracking && !sharingLocation) {
      setLiveCoords({ lat: order.tracking.latitude, lng: order.tracking.longitude, heading: order.tracking.heading, speed: order.tracking.speed, updatedAt: order.tracking.updatedAt });
    }
  }, [order?.tracking, sharingLocation]);

  // Join order socket room — receive delivery location, buyer location, and payment updates
  useEffect(() => {
    if (!id) return;
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("join:order", id);

    const onDelivery = (data: unknown) => {
      const d = data as { lat: number; lng: number; heading?: number; speed?: number; updatedAt: string };
      setLiveCoords({ lat: d.lat, lng: d.lng, heading: d.heading, speed: d.speed, updatedAt: d.updatedAt });
    };
    const onBuyer = (data: unknown) => {
      const d = data as { lat: number; lng: number; updatedAt: string };
      setBuyerCoords({ lat: d.lat, lng: d.lng, updatedAt: d.updatedAt });
    };
    const onOrderUpdated = () => {
      void mutate();
    };

    socket.on("delivery:location", onDelivery);
    socket.on("buyer:location",    onBuyer);
    socket.on("order:updated",     onOrderUpdated);
    return () => {
      socket.emit("leave:order", id);
      socket.off("delivery:location", onDelivery);
      socket.off("buyer:location",    onBuyer);
      socket.off("order:updated",     onOrderUpdated);
    };
  }, [id, socketRef.current]); // eslint-disable-line

  // ── Delivery person location sharing ──
  function startSharingLocation() {
    if (!navigator.geolocation) { toast("Geolocation not supported on this device."); return; }
    setSharingLocation(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading, speed } = pos.coords;
        setLiveCoords({ lat: latitude, lng: longitude, heading, speed, updatedAt: new Date().toISOString() });
        api.updateDeliveryLocation(id, latitude, longitude, heading ?? undefined, speed ? speed * 3.6 : undefined)
          .catch(() => null);
      },
      () => { toast("Could not get your location. Please allow GPS access."); setSharingLocation(false); },
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  }
  function stopSharingLocation() {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    setSharingLocation(false);
  }

  // ── Buyer location sharing ──
  function startSharingBuyerLocation() {
    if (!navigator.geolocation) { toast("Geolocation not supported on this device."); return; }
    setSharingBuyerLoc(true);
    buyerWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setBuyerCoords({ lat: latitude, lng: longitude, updatedAt: new Date().toISOString() });
        api.updateBuyerLocation(id, latitude, longitude).catch(() => null);
      },
      () => { toast("Could not get your location. Please allow GPS access."); setSharingBuyerLoc(false); },
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  }
  function stopSharingBuyerLocation() {
    if (buyerWatchRef.current !== null) navigator.geolocation.clearWatch(buyerWatchRef.current);
    setSharingBuyerLoc(false);
  }

  useEffect(() => () => {
    if (watchRef.current      !== null) navigator.geolocation.clearWatch(watchRef.current);
    if (buyerWatchRef.current !== null) navigator.geolocation.clearWatch(buyerWatchRef.current);
  }, []);

  // Escrow release
  const [releasingEscrow, setReleasingEscrow] = useState(false);

  // Verification codes
  const [showDeliveryCode, setShowDeliveryCode]   = useState(false);
  const [pickupCodeInput, setPickupCodeInput]     = useState("");
  const [verifyingPickup, setVerifyingPickup]     = useState(false);
  const [deliveryCodeInput, setDeliveryCodeInput] = useState("");
  const [verifyingDelivery, setVerifyingDelivery] = useState(false);

  // Dispute
  const [showDispute, setShowDispute]     = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Buyer cancel (unpaid orders only)
  const [cancelStep, setCancelStep] = useState<"idle" | "confirm">("idle");
  const [cancelLoading, setCancelLoading] = useState(false);

  async function handleBuyerCancel() {
    setCancelLoading(true);
    try {
      await api.updateOrderStatus(id, "Cancelled");
      await mutate();
      toast("Order cancelled.");
      setCancelStep("idle");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not cancel order.");
      setCancelStep("idle");
    } finally {
      setCancelLoading(false);
    }
  }

  // Payment
  const [initializingPayment, setInitializingPayment] = useState(false);

  // Pre-fill delivery details if already saved
  useEffect(() => {
    if (order?.deliveryAddress) setDeliveryAddress(order.deliveryAddress);
    if (order?.deliveryPhone) setDeliveryPhone(order.deliveryPhone);
  }, [order?.deliveryAddress, order?.deliveryPhone]);

  if (!order) {
    return (
      <AuthGate>
        <div className="container-shell py-12 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" style={{ color: "#7FB685" }} />
          <p className="mt-4 text-sm font-semibold text-slate-500">Loading order…</p>
        </div>
      </AuthGate>
    );
  }

  const role = order.role ?? "buyer";
  const escrow = (order.escrowStatus ?? "PENDING_PAYMENT") as EscrowStatus;
  const isPaid = PAID_ESCROW_STATES.includes(escrow);
  const isActive = !["RELEASED", "REFUNDED", "FAILED", "CANCELLED"].includes(escrow) && order.status !== "Cancelled";
  const isOutForDelivery = order.status === "Out for delivery" || escrow === "SHIPPED";
  const hasDeliveryDetails = !!(order.deliveryAddress && order.deliveryPhone);
  const escrowLabel = ESCROW_LABELS[escrow] ?? order.status;
  const statusClass = ESCROW_COLORS[escrow] ?? "bg-slate-100 text-slate-700";

  // Code-based verification state
  const hasRegisteredDelivery = !!order.deliveryPersonId;
  const pickupPending = hasRegisteredDelivery && !!order.pickupCode && !order.pickupVerifiedAt;
  const deliveryPending = hasRegisteredDelivery && !!order.deliveryCode && !order.deliveryVerifiedAt && isPaid;
  // Buyer sees old confirm button only if no registered delivery person is assigned
  const showOldConfirmButton = role === "buyer" && !hasRegisteredDelivery && ["ESCROW_HELD", "PROCESSING", "SHIPPED", "DELIVERED"].includes(escrow);
  const isDisputed = escrow === "DISPUTED";

  // Seller can update delivery stage; buyer confirms delivery via releaseEscrow
  const SELLER_TRANSITIONS: Record<string, string[]> = {
    "Awaiting payment": ["Cancelled"],
    "In progress":      ["Out for delivery", "Cancelled"],
    "Out for delivery": ["Delivered"],
  };
  const allowedTransitions =
    role === "seller" ? (SELLER_TRANSITIONS[order.status] ?? []) : [];

  async function handleSaveDelivery(e: FormEvent) {
    e.preventDefault();
    setSavingDelivery(true);
    try {
      await api.setDeliveryDetails(id, deliveryAddress, deliveryPhone);
      await mutate();
      toast("Delivery details saved.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save delivery details.");
    } finally {
      setSavingDelivery(false);
    }
  }

  async function handleAssignDelivery(e: FormEvent) {
    e.preventDefault();
    setAssigning(true);
    try {
      await api.assignDeliveryPerson(id, deliveryContact.trim(), deliveryContactName.trim() || undefined);
      await mutate();
      toast("Delivery person assigned. Share the pickup code with them.");
      setDeliveryContact("");
      setDeliveryContactName("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not assign delivery person.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleReleaseEscrow() {
    setReleasingEscrow(true);
    try {
      await api.releaseEscrow(id);
      await mutate();
      toast("Delivery confirmed. Payment released to seller.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not release escrow.");
    } finally {
      setReleasingEscrow(false);
    }
  }

  async function handlePayment() {
    setInitializingPayment(true);
    try {
      const payment = await api.initializePayment(id);
      if (payment.authorizationUrl) {
        window.location.href = payment.authorizationUrl;
        return;
      }
      toast("Payment could not be initialised. Please contact support.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not initialise payment.");
    } finally {
      setInitializingPayment(false);
    }
  }

  async function handleStatusUpdate(newStatus: string) {
    setUpdatingStatus(true);
    try {
      await api.updateOrderStatus(id, newStatus);
      await mutate();
      toast(`Order marked as ${newStatus}.`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not update order status.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleVerifyPickup(e: FormEvent) {
    e.preventDefault();
    setVerifyingPickup(true);
    try {
      await api.verifyPickupCode(id, pickupCodeInput.trim());
      await mutate();
      toast("Pickup verified! Order is now out for delivery.");
      setPickupCodeInput("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Invalid pickup code.");
    } finally {
      setVerifyingPickup(false);
    }
  }

  async function handleVerifyDelivery(e: FormEvent) {
    e.preventDefault();
    setVerifyingDelivery(true);
    try {
      await api.verifyDeliveryCode(id, deliveryCodeInput.trim());
      await mutate();
      toast("Delivery confirmed! Payment is being released to the seller.");
      setDeliveryCodeInput("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Invalid delivery code.");
    } finally {
      setVerifyingDelivery(false);
    }
  }

  async function handleDispute(e: FormEvent) {
    e.preventDefault();
    setSubmittingDispute(true);
    try {
      await api.disputeOrder(id, disputeReason.trim());
      await mutate();
      toast("Dispute raised. Our team will review it shortly.");
      setShowDispute(false);
      setDisputeReason("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not raise dispute.");
    } finally {
      setSubmittingDispute(false);
    }
  }

  return (
    <AuthGate>
      <div className="container-shell py-8 md:py-10">
        {/* Back link */}
        <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" />
          Back to orders
        </Link>

        {/* Header */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-black text-slate-950">{order.product.title}</h1>
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${statusClass}`}>{escrowLabel}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600 capitalize">{role}</span>
        </div>
        <p className="mt-1 text-sm font-semibold text-slate-400">Order #{id.slice(0, 12).toUpperCase()}</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* ── Left column ── */}
          <div className="space-y-4">

            {/* Product summary */}
            <section className="flex gap-4 rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(18px)", border: "1px solid rgba(226,232,240,0.70)", boxShadow: "0 4px 24px rgba(15,23,42,0.07)" }}>
              <ProductArt style={order.product.imageStyle} className="h-24 w-24 shrink-0 rounded-xl" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Product</p>
                <p className="mt-1 text-lg font-black text-slate-950">{order.product.title}</p>
                <p className="mt-1 text-xl font-black text-brand-navy">{formatCurrency(order.product.price)}</p>
                {order.product.location ? (
                  <p className="mt-1.5 flex items-center gap-1 text-sm font-semibold text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                    {order.product.location}
                  </p>
                ) : null}
              </div>
            </section>

            {/* ── PAYMENT SECTION ── */}
            {!isPaid && isActive ? (
              role === "buyer" ? (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                  <h2 className="text-base font-black text-amber-900">Payment required</h2>
                  <p className="mt-1 text-sm font-semibold text-amber-700">
                    Complete payment to move your order forward. Card and Mobile Money are accepted.
                  </p>
                  {(() => {
                    const base       = order.product.price;
                    const storedFee  = order.platformFee ?? 0;
                    const storedTotal = order.totalAmount ?? 0;

                    // Use stored fee; fall back to deriving from totalAmount diff for legacy orders
                    const fee = storedFee > 0
                      ? storedFee
                      : storedTotal > base
                        ? Math.round((storedTotal - base) * 100) / 100
                        : 0;

                    const total = storedTotal > 0 ? storedTotal : base + fee;
                    const feePct = base > 0 && fee > 0 ? +(fee / base * 100).toFixed(1) : null;

                    return (
                      <div className="mt-4 space-y-1.5 rounded-xl bg-amber-100/60 p-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-amber-800">Item price</span>
                          <span className="font-semibold text-amber-900">{formatCurrency(base)}</span>
                        </div>
                        {fee > 0 && (
                          <div className="flex justify-between">
                            <span className="text-amber-800">
                              Service fee{feePct !== null ? ` (${feePct}%)` : ""}
                            </span>
                            <span className="font-semibold text-amber-900">{formatCurrency(fee)}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-amber-200 pt-1.5">
                          <span className="font-black text-amber-900">Total you pay</span>
                          <span className="font-black text-amber-900">{formatCurrency(total)}</span>
                        </div>
                      </div>
                    );
                  })()}
                  <button
                    onClick={handlePayment}
                    disabled={initializingPayment}
                    className="btn-primary mt-4 w-full justify-center disabled:opacity-50"
                  >
                    {initializingPayment
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Lock className="h-4 w-4" />}
                    {initializingPayment ? "Redirecting to Paystack…" : "Pay securely now"}
                  </button>
                  <p className="mt-3 text-center text-xs text-amber-700">
                    Powered by Paystack · Card, Mobile Money &amp; bank transfer accepted
                  </p>
                </section>
              ) : (
                /* Seller view — waiting for buyer to pay */
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                    <h2 className="text-base font-black text-amber-900">Awaiting payment</h2>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-amber-700">
                    {order.counterpart} hasn&apos;t paid yet. Share your order link to remind them.
                  </p>
                  <div className="mt-4 space-y-1.5 rounded-xl bg-amber-100/60 p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-amber-800">Item price</span>
                      <span className="font-semibold text-amber-900">{formatCurrency(order.product.price)}</span>
                    </div>
                    <div className="flex justify-between border-t border-amber-200 pt-1.5">
                      <span className="font-black text-amber-900">Buyer pays (fees incl.)</span>
                      <span className="font-black text-amber-900">
                        {formatCurrency((order.totalAmount ?? 0) > 0 ? (order.totalAmount ?? 0) : Math.round(order.product.price * 1.025 * 100) / 100)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-800">You receive</span>
                      <span className="font-semibold text-amber-900">{formatCurrency((order.sellerAmount ?? 0) > 0 ? (order.sellerAmount ?? 0) : order.product.price)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(`${window.location.origin}/orders/${id}`).then(() => toast("Order link copied! Send it to the buyer."));
                    }}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-white py-3 text-sm font-black text-amber-900 transition-colors hover:bg-amber-50"
                  >
                    <Copy className="h-4 w-4" />
                    Copy order link for buyer
                  </button>
                </section>
              )
            ) : null}

            {/* ── DELIVERY DETAILS ── */}
            {isPaid && isActive ? (
              <section className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(18px)", border: "1px solid rgba(226,232,240,0.70)", boxShadow: "0 4px 24px rgba(15,23,42,0.07)" }}>
                <h2 className="text-base font-black" style={{ color: "#1E293B" }}>Delivery details</h2>

                {role === "buyer" ? (
                  hasDeliveryDetails ? (
                    <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
                      <p className="flex items-start gap-2 font-semibold text-slate-700">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#7FB685" }} />
                        {order.deliveryAddress}
                      </p>
                      <p className="flex items-center gap-2 font-semibold text-slate-700">
                        <Phone className="h-4 w-4" style={{ color: "#7FB685" }} />
                        {order.deliveryPhone}
                      </p>
                      <button
                        onClick={() => { setDeliveryAddress(order.deliveryAddress ?? ""); setDeliveryPhone(order.deliveryPhone ?? ""); }}
                        className="text-xs font-semibold hover:underline" style={{ color: "#5A9460" }}
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveDelivery} className="mt-3 space-y-3">
                      <p className="text-sm text-slate-500">Tell the seller where to deliver your order.</p>
                      <div>
                        <label className="text-xs font-bold text-slate-700">Delivery address</label>
                        <input
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="e.g. Room 12, Block C, HTU Campus"
                          required
                          className="input-shell mt-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700">Contact phone</label>
                        <input
                          type="tel"
                          value={deliveryPhone}
                          onChange={(e) => setDeliveryPhone(e.target.value)}
                          placeholder="0244 123 456"
                          required
                          className="input-shell mt-1 text-sm"
                        />
                      </div>
                      <button type="submit" disabled={savingDelivery} className="btn-primary w-full justify-center text-sm disabled:opacity-50">
                        {savingDelivery ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Save delivery details
                      </button>
                    </form>
                  )
                ) : role === "seller" && isPaid ? (
                  <div className="mt-3 space-y-3">
                    {hasDeliveryDetails ? (
                      <div className="rounded-xl bg-slate-50 p-4 text-sm">
                        <p className="font-black text-slate-800">Buyer delivery info</p>
                        <p className="mt-2 flex items-start gap-2 font-semibold text-slate-600">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#7FB685" }} />
                          {order.deliveryAddress}
                        </p>
                        <p className="mt-1 flex items-center gap-2 font-semibold text-slate-600">
                          <Phone className="h-4 w-4" style={{ color: "#7FB685" }} />
                          {order.deliveryPhone}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Waiting for the buyer to set their delivery address.</p>
                    )}

                    <form onSubmit={handleAssignDelivery} className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700">Assign delivery person</label>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Enter their email or phone number. They don&apos;t need a Campus Marche account.
                        </p>
                        <input
                          type="text"
                          value={deliveryContact}
                          onChange={(e) => setDeliveryContact(e.target.value)}
                          placeholder="0244000000 or name@email.com"
                          required
                          className="input-shell mt-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700">
                          Their name <span className="font-normal text-slate-400">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={deliveryContactName}
                          onChange={(e) => setDeliveryContactName(e.target.value)}
                          placeholder="e.g. Kofi Mensah"
                          className="input-shell mt-1 text-sm"
                        />
                      </div>
                      <button type="submit" disabled={assigning} className="btn-primary w-full justify-center text-sm disabled:opacity-50">
                        {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                        Assign &amp; start delivery
                      </button>
                    </form>
                  </div>
                ) : role === "delivery" ? (
                  <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm">
                    <p className="font-black text-slate-800">Delivery address</p>
                    {hasDeliveryDetails ? (
                      <>
                        <p className="mt-2 flex items-start gap-2 font-semibold text-slate-600">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#7FB685" }} />
                          {order.deliveryAddress}
                        </p>
                        <p className="mt-1 flex items-center gap-2 font-semibold text-slate-600">
                          <Phone className="h-4 w-4" style={{ color: "#7FB685" }} />
                          {order.deliveryPhone}
                        </p>
                      </>
                    ) : (
                      <p className="text-slate-500">Waiting for buyer to set delivery address.</p>
                    )}
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* ── LIVE TRACKING ── */}
            {isOutForDelivery ? (
              <section className="rounded-2xl border p-5 shadow-sm" style={{ borderColor: "rgba(127,182,133,0.35)", background: "rgba(223,243,227,0.25)" }}>
                <div className="flex items-center gap-2">
                  <Navigation className="h-5 w-5" style={{ color: "#5A9460" }} />
                  <h2 className="text-base font-black" style={{ color: "#0F172A" }}>Live tracking</h2>
                </div>

                {order.deliveryPerson ? (
                  <div className="mt-3 flex items-center gap-3 rounded-xl bg-white p-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-black" style={{ background: "rgba(127,182,133,0.15)", color: "#5A9460" }}>
                      {order.deliveryPerson.avatar?.[0] ?? <User className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{order.deliveryPerson.name}</p>
                      {order.deliveryPerson.phone ? (
                        <a href={`tel:${order.deliveryPerson.phone}`} className="text-xs font-semibold hover:underline" style={{ color: "#5A9460" }}>
                          {order.deliveryPerson.phone}
                        </a>
                      ) : null}
                    </div>
                  </div>
                ) : (order as { externalDeliveryContact?: string; externalDeliveryName?: string }).externalDeliveryContact ? (
                  <div className="mt-3 flex items-center gap-3 rounded-xl bg-white p-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: "rgba(127,182,133,0.15)", color: "#5A9460" }}>
                      <Phone className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900">
                        {(order as { externalDeliveryName?: string }).externalDeliveryName ?? "External delivery"}
                      </p>
                      <a
                        href={`tel:${(order as { externalDeliveryContact?: string }).externalDeliveryContact}`}
                        className="block truncate text-xs font-semibold hover:underline"
                        style={{ color: "#5A9460" }}
                      >
                        {(order as { externalDeliveryContact?: string }).externalDeliveryContact}
                      </a>
                    </div>
                  </div>
                ) : null}

                {/* Live map — shown whenever delivery OR buyer has shared coords */}
                {(liveCoords || buyerCoords) ? (
                  <div className="mt-3 space-y-2">
                    <DeliveryMap
                      coords={liveCoords}
                      buyerCoords={buyerCoords}
                      destinationLabel={order.deliveryAddress ?? order.product?.location}
                      height="h-64"
                    />
                    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1.5">
                        {sharingLocation && (
                          <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-green-500" />
                        )}
                        {liveCoords ? (
                          <>
                            {liveCoords.speed != null ? `${(liveCoords.speed).toFixed(1)} km/h · ` : ""}
                            {liveCoords.heading != null ? `${headingToCompass(liveCoords.heading)} · ` : ""}
                            {liveCoords.updatedAt ? `Updated ${formatRelativeDate(liveCoords.updatedAt)}` : "Live"}
                          </>
                        ) : (
                          <span style={{ color: "#3B82F6" }}>Buyer location shared</span>
                        )}
                      </span>
                      <a
                        href={`https://www.google.com/maps?q=${(liveCoords ?? buyerCoords)!.lat},${(liveCoords ?? buyerCoords)!.lng}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:underline" style={{ color: "#5A9460" }}>
                        <MapPin className="h-3 w-3" /> Open in Maps ↗
                      </a>
                    </div>
                    {!liveCoords && role !== "buyer" && (
                      <p className="text-xs font-semibold" style={{ color: "#94A3B8" }}>
                        Delivery person hasn&apos;t started live tracking yet.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm font-semibold" style={{ color: "#5A9460" }}>
                    {role === "delivery" ? "Tap the button below to start sharing your location." : "Waiting for the delivery person to share their location."}
                  </p>
                )}

                {/* Buyer — share their location so delivery can find them */}
                {role === "buyer" && (
                  <div className="mt-4">
                    {sharingBuyerLoc ? (
                      <button type="button" onClick={stopSharingBuyerLocation}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black text-white"
                        style={{ background: "#EF4444" }}>
                        <Square className="h-4 w-4" />
                        Stop sharing my location
                      </button>
                    ) : (
                      <button type="button" onClick={startSharingBuyerLocation}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black text-white"
                        style={{ background: "#3B82F6" }}>
                        <MapPin className="h-4 w-4" />
                        {buyerCoords ? "Update my location" : "Share my location with delivery"}
                      </button>
                    )}
                    <p className="mt-1.5 text-center text-xs" style={{ color: "#94A3B8" }}>
                      Helps the delivery person find you without asking for directions.
                    </p>
                  </div>
                )}

                {/* Seller/delivery person controls */}
                {(role === "seller" || role === "delivery") && (
                  <div className="mt-4 space-y-2">
                    {sharingLocation ? (
                      <button type="button" onClick={stopSharingLocation}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black text-white"
                        style={{ background: "#EF4444" }}>
                        <Square className="h-4 w-4" />
                        Stop sharing location
                      </button>
                    ) : (
                      <button type="button" onClick={startSharingLocation}
                        className="btn-primary w-full justify-center text-sm">
                        <Navigation className="h-4 w-4" />
                        {liveCoords ? "Restart live tracking" : "Start live tracking"}
                      </button>
                    )}

                    {/* Shareable tracking link */}
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/track/${id}`;
                        void navigator.clipboard.writeText(url).then(() => toast("Tracking link copied!"));
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border py-2.5 text-xs font-bold transition-colors hover:bg-slate-50"
                      style={{ borderColor: "rgba(226,232,240,0.80)", color: "#64748B" }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy tracking link for buyer
                    </button>
                  </div>
                )}
              </section>
            ) : null}

            {/* ── BUYER DELIVERY CODE ── */}
            {role === "buyer" && isPaid && order.deliveryCode && !order.deliveryVerifiedAt ? (
              <section className="rounded-2xl p-5" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.25)" }}>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" style={{ color: "#6366F1" }} />
                  <h2 className="text-base font-black" style={{ color: "#312E81" }}>Your delivery code</h2>
                </div>
                <p className="mt-1 text-sm font-semibold" style={{ color: "#4338CA" }}>
                  Show this code to the delivery person when they arrive. They will enter it in their app to confirm handoff and release your payment.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 rounded-xl px-4 py-3 text-center font-mono text-2xl font-black tracking-widest" style={{ background: "rgba(99,102,241,0.10)", color: "#3730A3", letterSpacing: "0.3em" }}>
                    {showDeliveryCode ? order.deliveryCode : "••••••"}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDeliveryCode(v => !v)}
                    className="rounded-xl p-3 transition-colors hover:bg-indigo-100"
                    style={{ color: "#6366F1" }}
                    aria-label={showDeliveryCode ? "Hide code" : "Reveal code"}
                  >
                    {showDeliveryCode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(order.deliveryCode ?? "").then(() => toast("Code copied!"))}
                    className="rounded-xl p-3 transition-colors hover:bg-indigo-100"
                    style={{ color: "#6366F1" }}
                    aria-label="Copy code"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-2 text-xs font-semibold" style={{ color: "#6366F1" }}>
                  Keep this private — only share with the delivery person at handoff.
                </p>
              </section>
            ) : null}

            {/* ── BUYER DELIVERY CONFIRMED (code already verified) ── */}
            {role === "buyer" && order.deliveryVerifiedAt ? (
              <section className="rounded-2xl p-4" style={{ background: "rgba(127,182,133,0.10)", border: "1px solid rgba(127,182,133,0.30)" }}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" style={{ color: "#5A9460" }} />
                  <p className="text-sm font-black" style={{ color: "#14532D" }}>Delivery verified — funds released to seller</p>
                </div>
              </section>
            ) : null}

            {/* ── SELLER PICKUP CODE ── */}
            {role === "seller" && pickupPending ? (
              <section className="rounded-2xl p-5" style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.30)" }}>
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5" style={{ color: "#D97706" }} />
                  <h2 className="text-base font-black" style={{ color: "#78350F" }}>Pickup code for delivery person</h2>
                </div>
                <p className="mt-1 text-sm font-semibold" style={{ color: "#92400E" }}>
                  Share this code with your delivery person. They must enter it in their Campus Marche app to confirm pickup and start delivery.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 rounded-xl px-4 py-3 text-center font-mono text-2xl font-black tracking-widest" style={{ background: "rgba(245,158,11,0.12)", color: "#78350F", letterSpacing: "0.3em" }}>
                    {order.pickupCode}
                  </div>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(order.pickupCode ?? "").then(() => toast("Pickup code copied!"))}
                    className="rounded-xl p-3 transition-colors hover:bg-amber-100"
                    style={{ color: "#D97706" }}
                    aria-label="Copy pickup code"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                </div>
                {order.pickupCodeExpires ? (
                  <p className="mt-2 text-xs font-semibold" style={{ color: "#D97706" }}>
                    Expires {new Date(order.pickupCodeExpires).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Re-assign to regenerate
                  </p>
                ) : null}
              </section>
            ) : null}

            {/* ── DELIVERY PERSON: PICKUP CODE ENTRY ── */}
            {role === "delivery" && !order.pickupVerifiedAt && order.status === "In progress" ? (
              <section className="rounded-2xl p-5" style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.30)" }}>
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5" style={{ color: "#D97706" }} />
                  <h2 className="text-base font-black" style={{ color: "#78350F" }}>Enter pickup code</h2>
                </div>
                <p className="mt-1 text-sm font-semibold" style={{ color: "#92400E" }}>
                  Ask the seller for the 6-character pickup code to confirm you have collected the item.
                </p>
                <form onSubmit={handleVerifyPickup} className="mt-4 flex gap-2">
                  <input
                    value={pickupCodeInput}
                    onChange={(e) => setPickupCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. XK7M2P"
                    maxLength={6}
                    required
                    className="input-shell flex-1 font-mono text-lg tracking-widest uppercase"
                  />
                  <button type="submit" disabled={verifyingPickup || pickupCodeInput.length !== 6} className="btn-primary px-5 disabled:opacity-50">
                    {verifyingPickup ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  </button>
                </form>
              </section>
            ) : null}

            {/* ── DELIVERY PERSON: DELIVERY CODE ENTRY ── */}
            {role === "delivery" && !order.deliveryVerifiedAt && isOutForDelivery ? (
              <section className="rounded-2xl p-5" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.25)" }}>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" style={{ color: "#6366F1" }} />
                  <h2 className="text-base font-black" style={{ color: "#312E81" }}>Enter delivery code</h2>
                </div>
                <p className="mt-1 text-sm font-semibold" style={{ color: "#4338CA" }}>
                  At the delivery point, ask the buyer for their 6-character delivery code. Entering it confirms handoff and releases payment to the seller.
                </p>
                <form onSubmit={handleVerifyDelivery} className="mt-4 flex gap-2">
                  <input
                    value={deliveryCodeInput}
                    onChange={(e) => setDeliveryCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. XK7M2P"
                    maxLength={6}
                    required
                    className="input-shell flex-1 font-mono text-lg tracking-widest uppercase"
                  />
                  <button type="submit" disabled={verifyingDelivery || deliveryCodeInput.length !== 6} className="btn-primary px-5 disabled:opacity-50">
                    {verifyingDelivery ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  </button>
                </form>
              </section>
            ) : null}

            {/* ── ESCROW RELEASE (self-delivery / no registered delivery person) ── */}
            {showOldConfirmButton ? (
              <section className="rounded-2xl p-5" style={{ background: "rgba(127,182,133,0.10)", border: "1px solid rgba(127,182,133,0.30)" }}>
                <h2 className="text-base font-black text-green-900">Confirm delivery</h2>
                <p className="mt-1 text-sm text-green-700">
                  Once you have received the item, confirm delivery to release payment to the seller.
                  This action cannot be undone.
                </p>
                <button
                  onClick={handleReleaseEscrow}
                  disabled={releasingEscrow}
                  className="mt-4 w-full rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50 transition-all hover:opacity-90"
                  style={{ background: "#5A9460" }}
                >
                  {releasingEscrow ? <Loader2 className="inline h-4 w-4 animate-spin" /> : <CheckCircle2 className="inline h-4 w-4" />}
                  {" "}Confirm delivery &amp; release payment
                </button>
              </section>
            ) : null}

            {/* ── DISPUTE ── */}
            {isPaid && isActive && !isDisputed && (role === "buyer" || role === "seller") ? (
              <section className="rounded-2xl p-5" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.20)" }}>
                {showDispute ? (
                  <form onSubmit={handleDispute} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <h2 className="text-base font-black text-red-900">Raise a dispute</h2>
                    </div>
                    <p className="text-sm text-red-700">
                      Describe what went wrong. Our team will review and mediate. Funds remain held until resolved.
                    </p>
                    <textarea
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="e.g. The item was damaged on arrival / I never received the package"
                      rows={3}
                      minLength={10}
                      maxLength={500}
                      required
                      className="input-shell text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setShowDispute(false); setDisputeReason(""); }}
                        className="flex-1 rounded-xl border px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                        style={{ borderColor: "rgba(226,232,240,0.70)" }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingDispute || disputeReason.trim().length < 10}
                        className="flex-1 rounded-xl px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                        style={{ background: "#DC2626" }}
                      >
                        {submittingDispute ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : null}
                        {submittingDispute ? " Submitting…" : "Submit dispute"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDispute(true)}
                    className="flex w-full items-center gap-2 text-sm font-bold"
                    style={{ color: "#DC2626" }}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Something went wrong? Raise a dispute
                  </button>
                )}
              </section>
            ) : null}

            {/* ── DISPUTED STATE ── */}
            {isDisputed ? (
              <section className="rounded-2xl p-5" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h2 className="text-base font-black text-red-900">Order under dispute</h2>
                </div>
                <p className="mt-2 text-sm text-red-700">
                  Funds are held. Our team will contact both parties to resolve this.
                </p>
                {order.disputeReason ? (
                  <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">"{order.disputeReason}"</p>
                ) : null}
              </section>
            ) : null}

          </div>

          {/* ── Right sidebar ── */}
          <aside className="space-y-4">
            {/* Order timeline */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(18px)", border: "1px solid rgba(226,232,240,0.70)", boxShadow: "0 4px 24px rgba(15,23,42,0.07)" }}>
              <h3 className="mb-4 text-sm font-black uppercase tracking-wide" style={{ color: "#94A3B8" }}>Order progress</h3>
              <OrderTimeline status={order.status} escrowStatus={order.escrowStatus} />
            </div>

            {/* Order meta */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(18px)", border: "1px solid rgba(226,232,240,0.70)", boxShadow: "0 4px 24px rgba(15,23,42,0.07)" }}>
              <h3 className="text-sm font-black uppercase tracking-wide" style={{ color: "#94A3B8" }}>Order info</h3>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="font-semibold text-slate-500">Item price</dt>
                  <dd className="font-black text-slate-950">{formatCurrency(order.product.price)}</dd>
                </div>
                {order.totalAmount != null && order.totalAmount > 0 && order.totalAmount !== order.product.price ? (
                  <div className="flex justify-between">
                    <dt className="font-semibold text-slate-500">Total paid</dt>
                    <dd className="font-black text-slate-950">{formatCurrency(order.totalAmount)}</dd>
                  </div>
                ) : null}
                {role === "seller" && (() => {
                  const storedFee = order.platformFee ?? 0;
                  const storedTotal = order.totalAmount ?? 0;
                  const base = order.product.price;
                  const fee = storedFee > 0
                    ? storedFee
                    : storedTotal > base
                      ? Math.round((storedTotal - base) * 100) / 100
                      : 0;
                  const sellerReceives = order.sellerAmount ?? (fee > 0 ? base : storedTotal > 0 ? storedTotal : base);
                  if (fee <= 0) return null;
                  return (
                    <>
                      <div className="flex justify-between">
                        <dt className="font-semibold text-slate-500">Platform fee</dt>
                        <dd className="font-semibold text-red-500">−{formatCurrency(fee)}</dd>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 pt-3">
                        <dt className="font-semibold text-slate-500">You receive</dt>
                        <dd className="font-black text-green-700">{formatCurrency(sellerReceives)}</dd>
                      </div>
                    </>
                  );
                })()}
                <div className="flex justify-between">
                  <dt className="font-semibold text-slate-500">Status</dt>
                  <dd>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusClass}`}>
                      {escrowLabel}
                    </span>
                  </dd>
                </div>
                {order.counterpart ? (
                  <div className="flex justify-between">
                    <dt className="font-semibold text-slate-500">{role === "buyer" ? "Seller" : "Buyer"}</dt>
                    <dd className="font-bold text-slate-950">{order.counterpart}</dd>
                  </div>
                ) : null}
                {order.createdAt ? (
                  <div className="flex justify-between">
                    <dt className="font-semibold text-slate-500">Placed</dt>
                    <dd className="font-semibold text-slate-700">{formatRelativeDate(order.createdAt)}</dd>
                  </div>
                ) : null}
              </dl>
            </div>

            {/* Status actions */}
            {allowedTransitions.length > 0 && isActive ? (
              <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(18px)", border: "1px solid rgba(226,232,240,0.70)", boxShadow: "0 4px 24px rgba(15,23,42,0.07)" }}>
                <h3 className="text-sm font-black uppercase tracking-wide" style={{ color: "#94A3B8" }}>Update status</h3>
                <div className="mt-3 space-y-2">
                  {allowedTransitions.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusUpdate(s)}
                      disabled={updatingStatus}
                      className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${
                        s === "Cancelled"
                          ? "border border-red-200 text-red-700 hover:bg-red-50"
                          : "btn-primary"
                      }`}
                    >
                      {updatingStatus ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : null}
                      {" "}Mark as {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Buyer cancel — only for unpaid orders */}
            {role === "buyer" && order.status === "Awaiting payment" && isActive ? (
              <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(18px)", border: "1px solid rgba(226,232,240,0.70)", boxShadow: "0 4px 24px rgba(15,23,42,0.07)" }}>
                <h3 className="text-sm font-black uppercase tracking-wide" style={{ color: "#94A3B8" }}>Cancel order</h3>
                {cancelStep === "idle" ? (
                  <>
                    <p className="mt-2 text-sm text-slate-500">Changed your mind? You can cancel before completing payment.</p>
                    <button
                      onClick={() => setCancelStep("confirm")}
                      className="mt-3 w-full rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors hover:bg-red-50"
                      style={{ color: "#DC2626", borderColor: "rgba(220,38,38,0.25)" }}
                    >
                      Cancel this order
                    </button>
                  </>
                ) : (
                  <div className="mt-3 space-y-3">
                    <p className="text-sm font-bold text-red-700">Are you sure? This cannot be undone.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCancelStep("idle")}
                        className="flex-1 rounded-xl border px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                        style={{ borderColor: "rgba(226,232,240,0.70)" }}
                      >
                        Keep order
                      </button>
                      <button
                        onClick={handleBuyerCancel}
                        disabled={cancelLoading}
                        className="flex-1 rounded-xl px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                        style={{ background: "#DC2626" }}
                      >
                        {cancelLoading ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : null}
                        {cancelLoading ? " Cancelling…" : "Yes, cancel"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Chat */}
            {order.counterpartId ? (
              <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(18px)", border: "1px solid rgba(226,232,240,0.70)", boxShadow: "0 4px 24px rgba(15,23,42,0.07)" }}>
                <h3 className="text-sm font-black uppercase tracking-wide" style={{ color: "#94A3B8" }}>Contact</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {role === "buyer" ? "Message the seller" : "Message the buyer"} directly about this order.
                </p>
                <ChatButton counterpartId={order.counterpartId} productId={order.product.id} />
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </AuthGate>
  );
}
