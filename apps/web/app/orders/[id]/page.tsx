"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Truck,
  User,
} from "lucide-react";
import { api } from "@/lib/api";
import { useOrder } from "@/hooks/use-api";
import { useToast } from "@/providers/toast-provider";
import { AuthGate } from "@/components/auth-gate";
import { OrderTimeline } from "@/components/order-timeline";
import { ProductArt } from "@/components/product-card";
import { formatCurrency, formatRelativeDate } from "@/lib/format";

const STATUS_COLORS: Record<string, string> = {
  "Payment pending": "bg-amber-100 text-amber-800",
  "In progress": "bg-blue-100 text-blue-800",
  "Out for delivery": "bg-sky-100 text-sky-800",
  Completed: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
};

const MOMO_PROVIDERS = [
  { value: "mtn", label: "MTN Mobile Money" },
  { value: "vod", label: "Telecel Cash" },
  { value: "tgo", label: "AirtelTigo Money" },
] as const;

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

  // Delivery details form
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [savingDelivery, setSavingDelivery] = useState(false);

  // Assign delivery person
  const [deliveryPersonId, setDeliveryPersonId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Location update
  const [updatingLocation, setUpdatingLocation] = useState(false);

  // Escrow release
  const [releasingEscrow, setReleasingEscrow] = useState(false);

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Card payment
  const [initializingPayment, setInitializingPayment] = useState(false);

  // Mobile money
  const [momoPhone, setMomoPhone] = useState("");
  const [momoProvider, setMomoProvider] = useState<"mtn" | "vod" | "tgo">("mtn");
  const [momoRef, setMomoRef] = useState<string | null>(null);
  const [momoDisplayText, setMomoDisplayText] = useState("");
  const [momoState, setMomoState] = useState<"idle" | "sending" | "waiting" | "paid">("idle");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll MoMo status
  useEffect(() => {
    if (momoState !== "waiting" || !momoRef) return;
    pollRef.current = setInterval(async () => {
      try {
        const result = await api.checkMomoStatus(momoRef);
        if (result.paid) {
          setMomoState("paid");
          clearInterval(pollRef.current!);
          await mutate();
        }
      } catch {
        // keep polling on error
      }
    }, 3500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [momoState, momoRef, mutate]);

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
  const isPaid = order.paymentStatus === "Paid";
  const escrowHeld = order.escrowStatus === "Held in escrow";
  const isActive = !["Completed", "Cancelled"].includes(order.status);
  const isOutForDelivery = order.status === "Out for delivery";
  const isInProgress = order.status === "In progress";
  const hasDeliveryDetails = !!(order.deliveryAddress && order.deliveryPhone);
  const statusClass = STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-700";

  // Allowed status transitions for the "Update status" button
  const BUYER_TRANSITIONS: Record<string, string[]> = {
    "In progress": ["Completed", "Cancelled"],
    "Out for delivery": [],
  };
  const SELLER_TRANSITIONS: Record<string, string[]> = {
    "Payment pending": ["Cancelled"],
    "In progress": ["Completed", "Cancelled"],
    "Out for delivery": ["Completed"],
  };
  const allowedTransitions =
    role === "buyer" ? (BUYER_TRANSITIONS[order.status] ?? []) : (SELLER_TRANSITIONS[order.status] ?? []);

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
      await api.assignDeliveryPerson(id, deliveryPersonId.trim());
      await mutate();
      toast("Delivery person assigned. Order is now Out for delivery.");
      setDeliveryPersonId("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not assign delivery person.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleUpdateLocation() {
    if (!navigator.geolocation) {
      toast("Geolocation is not supported by your browser.");
      return;
    }
    setUpdatingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await api.updateDeliveryLocation(
            id,
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.heading ?? undefined,
            pos.coords.speed ?? undefined,
          );
          await mutate();
          toast("Location updated.");
        } catch (err) {
          toast(err instanceof Error ? err.message : "Could not update location.");
        } finally {
          setUpdatingLocation(false);
        }
      },
      () => {
        toast("Could not get your location. Please allow location access.");
        setUpdatingLocation(false);
      },
    );
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

  async function handleCardPayment() {
    setInitializingPayment(true);
    try {
      const payment = await api.initializePayment(id);
      if (payment.authorizationUrl) {
        window.location.href = payment.authorizationUrl;
        return;
      }
      toast("Paystack keys are not configured. Please use Mobile Money or contact support.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not initialize payment.");
    } finally {
      setInitializingPayment(false);
    }
  }

  async function handleMomoSend(e: FormEvent) {
    e.preventDefault();
    setMomoState("sending");
    try {
      const result = await api.chargeMobileMoney(id, momoPhone, momoProvider);
      setMomoRef(result.reference);
      setMomoDisplayText(result.displayText);
      setMomoState("waiting");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not initiate mobile money payment.");
      setMomoState("idle");
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
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${statusClass}`}>{order.status}</span>
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
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <h2 className="text-base font-black text-amber-900">Payment required</h2>
                <p className="mt-1 text-sm font-semibold text-amber-700">
                  Complete payment to move your order forward.
                </p>

                <div className="mt-4 space-y-3">
                  {/* Card */}
                  <button
                    onClick={handleCardPayment}
                    disabled={initializingPayment}
                    className="btn-primary w-full justify-center disabled:opacity-50"
                  >
                    {initializingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Pay by card (Paystack)
                  </button>

                  {/* Mobile Money */}
                  <div className="rounded-xl border border-amber-200 bg-white p-4">
                    <p className="text-sm font-black text-slate-950">Pay with Mobile Money</p>
                    {momoState === "paid" ? (
                      <div className="mt-3 flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-bold">Payment confirmed!</span>
                      </div>
                    ) : momoState === "waiting" ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#7FB685" }} />
                          <span className="text-sm font-semibold text-slate-700">{momoDisplayText}</span>
                        </div>
                        <p className="text-xs text-slate-400">Waiting for confirmation… this page will update automatically.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleMomoSend} className="mt-3 space-y-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div>
                            <label className="text-xs font-bold text-slate-700">Provider</label>
                            <select
                              value={momoProvider}
                              onChange={(e) => setMomoProvider(e.target.value as typeof momoProvider)}
                              className="input-shell mt-1 text-sm"
                            >
                              {MOMO_PROVIDERS.map((p) => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-700">Phone number</label>
                            <input
                              type="tel"
                              value={momoPhone}
                              onChange={(e) => setMomoPhone(e.target.value)}
                              placeholder="0244 123 456"
                              required
                              className="input-shell mt-1 text-sm"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={momoState === "sending"}
                          className="btn-primary w-full justify-center disabled:opacity-50 text-sm"
                        >
                          {momoState === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Send payment prompt
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </section>
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
                ) : role === "seller" && isInProgress ? (
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
                        <p className="mt-0.5 text-xs text-slate-500">Enter the user ID of the person who will deliver the item.</p>
                        <input
                          value={deliveryPersonId}
                          onChange={(e) => setDeliveryPersonId(e.target.value)}
                          placeholder="User ID"
                          required
                          className="input-shell mt-1 text-sm font-mono"
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
                ) : null}

                {order.tracking ? (
                  <div className="mt-3 space-y-2">
                    <div className="rounded-xl bg-white p-3 text-sm">
                      <p className="font-black text-slate-700">
                        {order.tracking.latitude.toFixed(5)}, {order.tracking.longitude.toFixed(5)}
                        {order.tracking.heading != null ? (
                          <span className="ml-2 font-semibold text-slate-500">
                            · {headingToCompass(order.tracking.heading)} {Math.round(order.tracking.heading)}°
                          </span>
                        ) : null}
                        {order.tracking.speed != null ? (
                          <span className="ml-2 font-semibold text-slate-500">
                            · {order.tracking.speed.toFixed(1)} km/h
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Updated {formatRelativeDate(order.tracking.updatedAt)}
                      </p>
                    </div>
                    <a
                      href={`https://maps.google.com/?q=${order.tracking.latitude},${order.tracking.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold shadow-sm hover:bg-slate-50" style={{ color: "#0F172A" }}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Open in Google Maps
                    </a>
                  </div>
                ) : (
                  <p className="mt-3 text-sm font-semibold" style={{ color: "#5A9460" }}>
                    Delivery person hasn&apos;t shared their location yet.
                  </p>
                )}

                {role === "delivery" ? (
                  <button
                    onClick={handleUpdateLocation}
                    disabled={updatingLocation}
                    className="btn-primary mt-4 w-full justify-center text-sm disabled:opacity-50"
                  >
                    {updatingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                    Share my location
                  </button>
                ) : null}
              </section>
            ) : null}

            {/* ── ESCROW RELEASE ── */}
            {role === "buyer" && isPaid && escrowHeld && (isOutForDelivery || isInProgress) ? (
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

          </div>

          {/* ── Right sidebar ── */}
          <aside className="space-y-4">
            {/* Order timeline */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(18px)", border: "1px solid rgba(226,232,240,0.70)", boxShadow: "0 4px 24px rgba(15,23,42,0.07)" }}>
              <h3 className="mb-4 text-sm font-black uppercase tracking-wide" style={{ color: "#94A3B8" }}>Order progress</h3>
              <OrderTimeline status={order.status} />
            </div>

            {/* Order meta */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(18px)", border: "1px solid rgba(226,232,240,0.70)", boxShadow: "0 4px 24px rgba(15,23,42,0.07)" }}>
              <h3 className="text-sm font-black uppercase tracking-wide" style={{ color: "#94A3B8" }}>Order info</h3>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="font-semibold text-slate-500">Total</dt>
                  <dd className="font-black text-slate-950">{formatCurrency(order.price ?? order.product.price)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-semibold text-slate-500">Payment</dt>
                  <dd className={`font-bold ${order.paymentStatus === "Paid" ? "text-green-600" : "text-amber-600"}`}>
                    {order.paymentStatus ?? "Unpaid"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-semibold text-slate-500">Escrow</dt>
                  <dd className="font-bold text-slate-700">{order.escrowStatus ?? "—"}</dd>
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
