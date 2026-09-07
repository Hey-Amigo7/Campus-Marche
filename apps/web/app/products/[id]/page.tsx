"use client";

import Link from "next/link";
import { Bookmark, BookmarkCheck, CalendarCheck, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, MapPin, Share2, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { use, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSWRConfig } from "swr";
import { api } from "@/lib/api";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import { BuyNowButton } from "@/components/buy-now-button";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductArt, ProductGrid } from "@/components/product-card";
import { EmptyState, Rating, SellerBadge } from "@/components/ui";
import { useProduct, useProducts, useProfile, useReviews, useSavedStatus } from "@/hooks/use-api";
import { hasAuthToken } from "@/lib/auth";
import { useToast } from "@/providers/toast-provider";

const PANEL = {
  background:    "rgba(255,255,255,0.85)",
  backdropFilter:"blur(18px)",
  border:        "1px solid #E4E4E7",
} as const;

const snap = { type: "spring", stiffness: 380, damping: 22 } as const;

function ImageGallery({
  imageUrl,
  imageUrls,
  imageStyle,
  title,
}: {
  imageUrl?: string;
  imageUrls?: string[];
  imageStyle: string;
  title: string;
}) {
  const allImages = imageUrls && imageUrls.length > 0
    ? imageUrls
    : imageUrl
    ? [imageUrl]
    : [];

  const [activeIdx, setActiveIdx] = useState(0);
  const activeUrl = allImages[activeIdx];

  function prev() { setActiveIdx((i) => (i - 1 + allImages.length) % allImages.length); }
  function next() { setActiveIdx((i) => (i + 1) % allImages.length); }

  if (allImages.length === 0) {
    return (
      <div className="overflow-hidden rounded-3xl" style={PANEL}>
        <ProductArt style={imageStyle} title={title} className="min-h-[480px]" />
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Main image */}
      <div className="relative overflow-hidden rounded-3xl" style={{ ...PANEL, aspectRatio: "4/3" }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeIdx}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={snap}
            className="absolute inset-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeUrl}
              alt={`${title} — photo ${activeIdx + 1}`}
              className="h-full w-full object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {/* Counter pill */}
        {allImages.length > 1 && (
          <span
            className="absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-xs font-bold text-white"
            style={{ background: "rgba(9,9,11,0.70)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            {activeIdx + 1} / {allImages.length}
          </span>
        )}

        {/* Arrow buttons */}
        {allImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full shadow-lg transition-all hover:scale-105"
              style={{ background: "rgba(9,9,11,0.70)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full shadow-lg transition-all hover:scale-105"
              style={{ background: "rgba(9,9,11,0.70)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {allImages.map((url, i) => (
            <motion.button
              key={url}
              type="button"
              onClick={() => setActiveIdx(i)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              transition={snap}
              aria-label={`View photo ${i + 1}`}
              className="shrink-0 h-16 w-16 overflow-hidden rounded-xl border-2 transition-all"
              style={{
                borderColor: i === activeIdx ? "#16A34A" : "#E4E4E7",
                opacity:     i === activeIdx ? 1 : 0.60,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Thumbnail ${i + 1}`} className="h-full w-full object-cover" />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

function SaveButton({ productId }: { productId: string }) {
  const { data: status } = useSavedStatus(productId);
  const { mutate } = useSWRConfig();
  const [loading, setLoading] = useState(false);

  if (!hasAuthToken()) return null;

  async function toggle() {
    if (!status) return;
    setLoading(true);
    try {
      if (status.saved) await api.unsaveItem(productId);
      else               await api.saveItem(productId);
      await mutate(`saved-status-${productId}`);
      await mutate("saved-items");
    } finally {
      setLoading(false);
    }
  }

  const Icon = status?.saved ? BookmarkCheck : Bookmark;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all hover:-translate-y-px disabled:opacity-50"
      style={{
        background: "#F4F4F5",
        border: "1px solid #E4E4E7",
        color: status?.saved ? "#16A34A" : "#71717A",
      }}
      aria-label={status?.saved ? "Remove from wishlist" : "Save to wishlist"}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
      {status?.saved ? "Saved" : "Save"}
    </button>
  );
}

function ShareButton({ title, price }: { title: string; price: number }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    const text = `Check out "${title}" for ${formatCurrency(price)} on Campus Marché`;
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); } catch { /* user dismissed */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all hover:-translate-y-px"
      style={{ background: "#F4F4F5", border: "1px solid #E4E4E7", color: "#71717A" }}
    >
      {copied ? <Check className="h-5 w-5 text-green-600" /> : <Share2 className="h-5 w-5" />}
      {copied ? "Copied!" : "Share"}
    </button>
  );
}

type ApiReview = {
  id: string;
  rating: number;
  comment: string | null;
  author: string;
  createdAt: string;
};

function ReviewList({ productId }: { productId: string }) {
  const { data: reviews, isLoading } = useReviews(productId);

  if (isLoading) return <p className="text-sm" style={{ color: "#A1A1AA" }}>Loading reviews…</p>;
  if (!reviews || reviews.length === 0) {
    return (
      <p className="text-sm italic" style={{ color: "#A1A1AA" }}>
        No reviews yet. Be the first to leave one after your purchase.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review: ApiReview) => (
        <div
          key={review.id}
          className="rounded-2xl p-4"
          style={{ background: "#FAFAF9", border: "1px solid #E4E4E7" }}
        >
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className="h-3.5 w-3.5"
                style={i < review.rating ? { fill: "#D97706", color: "#D97706" } : { color: "#D4D4D8" }}
              />
            ))}
          </div>
          {review.comment ? (
            <p className="mt-2 text-sm leading-6" style={{ color: "#27272A" }}>{review.comment}</p>
          ) : null}
          <p className="mt-2 text-xs font-bold" style={{ color: "#A1A1AA" }}>
            {review.author} · {formatRelativeDate(review.createdAt)}
          </p>
        </div>
      ))}
    </div>
  );
}

function StarPicker({ value, hover, onHover, onLeave, onPick }: {
  value: number; hover: number;
  onHover: (n: number) => void; onLeave: () => void; onPick: (n: number) => void;
}) {
  const active = hover || value;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => onHover(n)}
          onMouseLeave={onLeave}
          onClick={() => onPick(n)}
          className="transition-transform hover:scale-110 focus:outline-none"
          aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
        >
          <Star
            className="h-7 w-7"
            style={n <= active ? { fill: "#D97706", color: "#D97706" } : { color: "#D4D4D8" }}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ productId, sellerId }: { productId: string; sellerId: string }) {
  const { mutate } = useSWRConfig();
  const { data: profile } = useProfile();
  const [rating,     setRating]     = useState(0);
  const [hover,      setHover]      = useState(0);
  const [comment,    setComment]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  if (!hasAuthToken()) return null;
  if (profile?.id === sellerId) return null;
  if (submitted) return (
    <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold"
      style={{ background: "rgba(22,163,74,0.08)", color: "#16A34A", border: "1px solid rgba(22,163,74,0.20)" }}>
      <Star className="h-4 w-4" style={{ fill: "#16A34A", color: "#16A34A" }} />
      Review submitted — thanks!
    </div>
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) { setError("Please select a star rating."); return; }
    setSubmitting(true);
    setError(null);
    try {
      await api.submitReview(productId, { rating, comment: comment.trim() || undefined });
      await mutate(`reviews-${productId}`);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-2xl p-4"
      style={{ background: "#FAFAF9", border: "1px solid #E4E4E7" }}>
      <p className="text-xs font-black uppercase tracking-wider" style={{ color: "#A1A1AA" }}>Write a review</p>
      <StarPicker value={rating} hover={hover} onHover={setHover} onLeave={() => setHover(0)} onPick={setRating} />
      <textarea
        rows={3}
        placeholder="What did you think? (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none placeholder:text-[#A1A1AA] text-[#09090B]"
        style={{ background: "#FFFFFF", border: "1px solid #E4E4E7", caretColor: "#16A34A" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "#16A34A"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.08)"; }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = "#E4E4E7"; e.currentTarget.style.boxShadow = "none"; }}
      />
      {error && (
        <p className="text-xs font-semibold" style={{ color: "#DC2626" }}>{error}</p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black text-white disabled:opacity-60 transition-all hover:-translate-y-0.5"
        style={{ background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)" }}
      >
        {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}

function fmtHour(h: number) {
  const period = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

function ServiceBookingPanel({ product }: { product: import("@/types").Product }) {
  const { toast } = useToast();
  const availability = product.availability ?? null;

  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const [slots, setSlots]               = useState<{ time: string; available: boolean }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes]               = useState("");
  const [booking, setBooking]           = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [success, setSuccess]           = useState(false);

  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      value: d.toISOString().slice(0, 10),
      label: i === 0 ? "Today"
           : i === 1 ? "Tomorrow"
           : d.toLocaleDateString("en-GH", { weekday: "short", month: "short", day: "numeric" }),
    };
  });

  useEffect(() => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    api.getAvailableSlots(product.id, selectedDate)
      .then(res => setSlots(res.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [product.id, selectedDate]);

  async function handleBook() {
    if (!selectedSlot) return;
    setBooking(true);
    setBookingError(null);
    try {
      const scheduledAt = `${selectedDate}T${selectedSlot}:00`;
      await api.createBooking({ productId: product.id, scheduledAt, notes: notes.trim() || undefined });
      setSuccess(true);
      toast("Booking request sent! The seller will confirm shortly.");
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Could not send booking request.");
    } finally {
      setBooking(false);
    }
  }

  if (!hasAuthToken()) {
    return (
      <div className="rounded-3xl p-6 text-center space-y-3" style={{ background: "#F4F4F5", border: "1px solid #E4E4E7" }}>
        <CalendarCheck className="mx-auto h-8 w-8" style={{ color: "#16A34A" }} />
        <p className="font-black text-[#09090B]">Sign in to book this service</p>
        <Link href="/auth/login"
          className="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black text-white"
          style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}>
          Sign in to book
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-3xl p-6 text-center space-y-3" style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.20)" }}>
        <CheckCircle2 className="mx-auto h-10 w-10" style={{ color: "#16A34A" }} />
        <p className="font-black text-[#09090B]">Booking request sent!</p>
        <p className="text-sm" style={{ color: "#71717A" }}>
          The seller will confirm your appointment.{" "}
          <Link href="/bookings" className="font-bold" style={{ color: "#16A34A" }}>View in My Bookings →</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-3xl p-5" style={{ background: "#FAFAF9", border: "1px solid #E4E4E7" }}>
      <p className="text-xs font-black uppercase tracking-wider" style={{ color: "#A1A1AA" }}>Book this service</p>

      {/* Availability info */}
      {availability && (
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold" style={{ color: "#71717A" }}>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" style={{ color: "#16A34A" }} />
            {fmtHour(availability.startHour)} – {fmtHour(availability.endHour)}
          </span>
          <span>
            {availability.durationMin >= 60
              ? `${availability.durationMin / 60}h session`
              : `${availability.durationMin}min session`}
          </span>
          <span className="flex gap-1.5">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day, i) => {
              const on = availability.availableDays.split(",").includes(String(i + 1));
              return (
                <span key={day} className="rounded-md px-1.5 py-0.5 font-bold"
                  style={on ? { background: "rgba(22,163,74,0.1)", color: "#16A34A" } : { color: "#D4D4D8" }}>
                  {day}
                </span>
              );
            })}
          </span>
        </div>
      )}

      {/* Date strip */}
      <div>
        <p className="mb-2 text-sm font-black" style={{ color: "#09090B" }}>Choose a date</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {dateOptions.map(({ value, label }) => (
            <button key={value} type="button" onClick={() => setSelectedDate(value)}
              className="shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all"
              style={selectedDate === value
                ? { background: "#16A34A", color: "#fff", border: "1px solid #16A34A" }
                : { background: "#F4F4F5", color: "#71717A", border: "1px solid #E4E4E7" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Time slots */}
      <div>
        <p className="mb-2 text-sm font-black" style={{ color: "#09090B" }}>Choose a time</p>
        {loadingSlots ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: "#A1A1AA" }}>
            <Loader2 className="h-4 w-4 animate-spin" /> Loading slots…
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm" style={{ color: "#A1A1AA" }}>No available slots on this date.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {slots.map(slot => (
              <button key={slot.time} type="button"
                onClick={() => slot.available && setSelectedSlot(slot.time)}
                disabled={!slot.available}
                className="rounded-xl py-2.5 text-xs font-bold transition-all"
                style={!slot.available
                  ? { background: "#F4F4F5", color: "#D4D4D8", border: "1px solid #E4E4E7", cursor: "not-allowed" }
                  : selectedSlot === slot.time
                  ? { background: "#16A34A", color: "#fff", border: "1.5px solid #16A34A" }
                  : { background: "#F4F4F5", color: "#27272A", border: "1px solid #E4E4E7" }}>
                {slot.time}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1.5 block text-sm font-black" style={{ color: "#09090B" }}>
          Notes <span style={{ color: "#A1A1AA", fontWeight: 500 }}>(optional)</span>
        </label>
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Anything the seller should know…"
          className="w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none"
          style={{ background: "#fff", border: "1px solid #E4E4E7", color: "#09090B", caretColor: "#16A34A" }}
          onFocus={e => { e.currentTarget.style.borderColor = "#16A34A"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.08)"; }}
          onBlur={e  => { e.currentTarget.style.borderColor = "#E4E4E7"; e.currentTarget.style.boxShadow = "none"; }}
        />
      </div>

      {bookingError && <p className="text-xs font-semibold" style={{ color: "#DC2626" }}>{bookingError}</p>}

      <button type="button" onClick={handleBook} disabled={!selectedSlot || booking}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white disabled:opacity-50 transition-all hover:-translate-y-0.5"
        style={{ background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)" }}>
        {booking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
        {booking ? "Sending request…" : "Request booking"}
      </button>
    </div>
  );
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: product, isLoading, error } = useProduct(id);
  const { data: allProducts } = useProducts();

  // Record a unique view once per product per browser session
  useEffect(() => {
    if (!id) return;
    const storageKey = `cm_viewed_${id}`;
    if (typeof window === "undefined" || sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, "1");

    // Viewer key: userId from JWT payload, or a persistent anonymous ID
    let viewerKey = localStorage.getItem("cm_viewer_id");
    if (!viewerKey) {
      viewerKey = `anon-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("cm_viewer_id", viewerKey);
    }
    api.recordView(id, viewerKey).catch(() => null);
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#16A34A]" />
      </div>
    );
  }

  if (error || product === null) notFound();
  if (!product) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#16A34A]" />
      </div>
    );
  }

  const seller = product.seller;
  const sellerLocation = seller.location ?? null;
  const sellerRating   = seller.rating   ?? 0;

  const similar = allProducts
    .filter((item) => item.category === product.category && item.id !== id)
    .slice(0, 4);

  return (
    <div style={{ minHeight: "100vh" }}>
      <div className="container-shell py-8 md:py-12">
        {/* Back link */}
        <Link
          href="/products"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:text-[#09090B]"
          style={{ color: "#A1A1AA" }}
        >
          <ChevronLeft className="h-4 w-4" />
          Back to listings
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* ── Left: gallery + seller card ── */}
          <section>
            <ImageGallery
              imageUrl={product.imageUrl}
              imageUrls={(product as { imageUrls?: string[] }).imageUrls}
              imageStyle={product.imageStyle}
              title={product.title}
            />

            {/* Seller card */}
            <div className="mt-4 overflow-hidden rounded-3xl" style={PANEL}>
              <div className="space-y-4 p-6">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/store/${seller.id}`} className="flex items-center gap-3 group">
                    <div
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-sm font-black"
                      style={{ background: "rgba(22,163,74,0.10)", color: "#16A34A", border: "1px solid rgba(22,163,74,0.20)" }}
                    >
                      {seller.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span>
                      <span className="block font-black text-[#09090B] group-hover:text-[#16A34A] transition-colors">{seller.name}</span>
                      {sellerLocation && (
                        <span className="block text-sm font-semibold" style={{ color: "#71717A" }}>
                          {sellerLocation}
                        </span>
                      )}
                    </span>
                  </Link>
                  <SellerBadge verified={seller.verified} premium={seller.premium} compact />
                </div>

                <div className="flex items-center justify-between">
                  {sellerRating > 0 && <Rating value={sellerRating} />}
                  <Link href={`/store/${seller.id}`}
                    className="ml-auto text-sm font-bold transition-colors hover:text-[#14532D]"
                    style={{ color: "#16A34A" }}>
                    View storefront →
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ── Right: product details ── */}
          <aside className="space-y-6">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {product.featured && (
                <span className="rounded-full px-3 py-1 text-xs font-bold text-[#09090B]"
                  style={{ background: "#F4F4F5", border: "1px solid #E4E4E7" }}>
                  Featured
                </span>
              )}
              {product.boosted && (
                <span className="rounded-full px-3 py-1 text-xs font-bold"
                  style={{ background: "rgba(217,119,6,0.10)", color: "#B45309", border: "1px solid rgba(217,119,6,0.20)" }}>
                  Boosted
                </span>
              )}
            </div>

            {/* Title + price */}
            <div>
              <h1 className="text-3xl font-black tracking-tight text-[#09090B] md:text-4xl leading-tight">
                {product.title}
              </h1>
              <p className="mt-4 text-4xl font-black" style={{ color: "#16A34A" }}>
                {formatCurrency(product.price)}
              </p>
              {product.price > 0 && (() => {
                const fee = Math.round(product.price * 0.025 * 100) / 100;
                const total = Math.round((product.price + fee) * 100) / 100;
                return (
                  <p className="mt-1.5 text-sm font-semibold" style={{ color: "#71717A" }}>
                    You pay {formatCurrency(total)} · <span style={{ color: "#A1A1AA" }}>fees included</span>
                  </p>
                );
              })()}
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold" style={{ color: "#71717A" }}>
              {/* Product vs service badge */}
              {product.listingType === "service" || product.category === "Services" ? (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black"
                  style={{ background: "rgba(217,119,6,0.10)", color: "#B45309" }}>
                  Service listing
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black"
                  style={{ background: "rgba(22,163,74,0.10)", color: "#16A34A" }}>
                  {product.condition ?? "Physical product"}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" style={{ color: "#16A34A" }} />
                {product.location}
              </span>
              <span>{formatRelativeDate(product.postedAt)}</span>
            </div>

            {/* Description */}
            <p className="leading-7 text-sm md:text-base" style={{ color: "#27272A" }}>
              {product.description}
            </p>

            {/* Details grid */}
            {(() => {
              const isService = product.listingType === "service" || product.category === "Services";
              const fields: [string, string][] = isService
                ? [
                    ["Category",     product.category ?? "Service"],
                    ["Type",         "Service / booking"],
                    ["Pricing",      product.negotiable ? "Open to negotiation" : "Fixed rate"],
                    ["Views",        product.views.toLocaleString()],
                  ]
                : [
                    ["Category",     product.category ?? "—"],
                    ["Condition",    product.condition ?? "—"],
                    ["Negotiation",  product.negotiable ? "Open to offers" : "Fixed price"],
                    ["Views",        product.views.toLocaleString()],
                  ];
              return (
                <dl className="grid grid-cols-2 gap-2.5 text-sm">
                  {fields.map(([label, value]) => (
                    <div key={label} className="rounded-2xl p-4" style={{ background: "#F4F4F5", border: "1px solid #E4E4E7" }}>
                      <dt className="text-xs font-semibold" style={{ color: "#71717A" }}>{label}</dt>
                      <dd className="mt-1 font-black text-[#09090B]">{value}</dd>
                    </div>
                  ))}
                </dl>
              );
            })()}

            {/* CTA */}
            {product.listingType === "service" || product.category === "Services" ? (
              <div className="space-y-2.5">
                <ServiceBookingPanel product={product} />
                <div className="grid grid-cols-2 gap-2.5">
                  <SaveButton productId={product.id} />
                  <ShareButton title={product.title} price={product.price} />
                </div>
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <BuyNowButton productId={product.id} price={product.price} listingType={product.listingType} category={product.category} />
                </div>
                <div className="sm:col-span-2">
                  <AddToCartButton product={product} />
                </div>
                <SaveButton productId={product.id} />
                <ShareButton title={product.title} price={product.price} />
              </div>
            )}

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ background: "rgba(22,163,74,0.08)", color: "#16A34A", border: "1px solid rgba(22,163,74,0.18)" }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Reviews — after Share button */}
            <div className="rounded-3xl p-6" style={PANEL}>
              <p className="mb-3 text-xs font-black uppercase tracking-wider" style={{ color: "#A1A1AA" }}>
                Customer reviews
              </p>
              <ReviewList productId={product.id} />
              <ReviewForm productId={product.id} sellerId={seller.id} />
            </div>
          </aside>
        </div>

        {/* ── Similar items ── */}
        <section className="mt-16">
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-wider" style={{ color: "#A1A1AA" }}>
              More like this
            </p>
            <h2 className="mt-1 text-2xl font-black text-[#09090B]">Similar items</h2>
          </div>
          {similar.length > 0 ? (
            <ProductGrid products={similar} />
          ) : (
            <EmptyState
              title="No similar items yet"
              description="Be the first to list something in this category."
              action={<Link href="/sell" className="btn-primary">Create listing</Link>}
            />
          )}
        </section>
      </div>
    </div>
  );
}
