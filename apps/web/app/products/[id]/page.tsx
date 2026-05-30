"use client";

import Link from "next/link";
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Loader2, MapPin, Share2, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { use, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSWRConfig } from "swr";
import { api } from "@/lib/api";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import { BuyNowButton } from "@/components/buy-now-button";
import { ProductArt, ProductGrid } from "@/components/product-card";
import { EmptyState, Rating, SectionHeading, SellerBadge } from "@/components/ui";
import { useProduct, useProducts, useProfile, useReviews, useSavedStatus } from "@/hooks/use-api";
import { hasAuthToken } from "@/lib/auth";

const DARK_PANEL = {
  background:    "rgba(255,255,255,0.04)",
  backdropFilter:"blur(18px)",
  border:        "1px solid rgba(255,255,255,0.07)",
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
      <div className="overflow-hidden rounded-3xl" style={DARK_PANEL}>
        <ProductArt style={imageStyle} title={title} className="min-h-[480px]" />
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Main image */}
      <div className="relative overflow-hidden rounded-3xl" style={{ ...DARK_PANEL, aspectRatio: "4/3" }}>
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
            style={{ background: "rgba(6,10,18,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)" }}
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
              style={{ background: "rgba(6,10,18,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full shadow-lg transition-all hover:scale-105"
              style={{ background: "rgba(6,10,18,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
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
                borderColor: i === activeIdx ? "#7FB685" : "rgba(255,255,255,0.10)",
                opacity:     i === activeIdx ? 1 : 0.55,
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
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: status?.saved ? "#7FB685" : "rgba(255,255,255,0.60)" }}
      aria-label={status?.saved ? "Remove from wishlist" : "Save to wishlist"}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
      {status?.saved ? "Saved" : "Save"}
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

  if (isLoading) return <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Loading reviews…</p>;
  if (!reviews || reviews.length === 0) {
    return (
      <p className="text-sm italic" style={{ color: "rgba(255,255,255,0.30)" }}>
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
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className="h-3.5 w-3.5"
                style={i < review.rating ? { fill: "#C68B59", color: "#C68B59" } : { color: "rgba(255,255,255,0.15)" }}
              />
            ))}
          </div>
          {review.comment ? (
            <p className="mt-2 text-sm leading-6" style={{ color: "rgba(255,255,255,0.55)" }}>{review.comment}</p>
          ) : null}
          <p className="mt-2 text-xs font-bold" style={{ color: "rgba(255,255,255,0.25)" }}>
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
            style={n <= active ? { fill: "#C68B59", color: "#C68B59" } : { color: "rgba(255,255,255,0.18)" }}
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
      style={{ background: "rgba(127,182,133,0.10)", color: "#7FB685", border: "1px solid rgba(127,182,133,0.20)" }}>
      <Star className="h-4 w-4" style={{ fill: "#7FB685", color: "#7FB685" }} />
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
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <p className="text-xs font-black uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.30)" }}>Write a review</p>
      <StarPicker value={rating} hover={hover} onHover={setHover} onLeave={() => setHover(0)} onPick={setRating} />
      <textarea
        rows={3}
        placeholder="What did you think? (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none placeholder:text-[rgba(255,255,255,0.22)]"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", caretColor: "#7FB685" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(127,182,133,0.40)"; }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
      />
      {error && (
        <p className="text-xs font-semibold" style={{ color: "#FCA5A5" }}>{error}</p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black text-white disabled:opacity-60 transition-all hover:-translate-y-0.5"
        style={{ background: "linear-gradient(135deg, #7FB685 0%, #5A9460 100%)" }}
      >
        {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </form>
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
      <div className="flex min-h-[60vh] items-center justify-center" style={{ background: "#06080F" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#7FB685" }} />
      </div>
    );
  }

  if (error || product === null) notFound();
  if (!product) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" style={{ background: "#06080F" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#7FB685" }} />
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
    <div style={{ minHeight: "100vh", background: "#06080F" }}>
      <div className="container-shell py-8 md:py-12">
        {/* Back link */}
        <Link
          href="/products"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:text-white"
          style={{ color: "rgba(255,255,255,0.40)" }}
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
            <div className="mt-4 overflow-hidden rounded-3xl" style={DARK_PANEL}>
              <div className="max-h-[460px] space-y-5 overflow-y-auto p-6">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/store/${seller.id}`} className="flex items-center gap-3 group">
                    <div
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-sm font-black"
                      style={{ background: "rgba(127,182,133,0.12)", color: "#7FB685", border: "1px solid rgba(127,182,133,0.20)" }}
                    >
                      {seller.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span>
                      <span className="block font-black text-white group-hover:text-[#7FB685] transition-colors">{seller.name}</span>
                      {sellerLocation && (
                        <span className="block text-sm font-semibold" style={{ color: "rgba(255,255,255,0.40)" }}>
                          {sellerLocation}
                        </span>
                      )}
                    </span>
                  </Link>
                  <SellerBadge verified={seller.verified} premium={seller.premium} compact />
                </div>

                {sellerRating > 0 ? (
                  <div className="flex items-center justify-between">
                    <Rating value={sellerRating} />
                    <Link href={`/store/${seller.id}`}
                      className="text-sm font-bold transition-colors hover:text-white"
                      style={{ color: "#7FB685" }}>
                      View storefront →
                    </Link>
                  </div>
                ) : (
                  <Link href={`/store/${seller.id}`}
                    className="text-sm font-bold transition-colors hover:text-white"
                    style={{ color: "#7FB685" }}>
                    View storefront →
                  </Link>
                )}

                <div className="border-t pt-5" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <p className="mb-3 text-xs font-black uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.30)" }}>Reviews</p>
                  <ReviewList productId={product.id} />
                  <ReviewForm productId={product.id} sellerId={seller.id} />
                </div>
              </div>
            </div>
          </section>

          {/* ── Right: product details ── */}
          <aside className="space-y-6">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {product.featured && (
                <span className="rounded-full px-3 py-1 text-xs font-bold text-white"
                  style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}>
                  Featured
                </span>
              )}
              {product.boosted && (
                <span className="rounded-full px-3 py-1 text-xs font-bold"
                  style={{ background: "rgba(198,139,89,0.12)", color: "#C68B59", border: "1px solid rgba(198,139,89,0.25)" }}>
                  Boosted
                </span>
              )}
            </div>

            {/* Title + price */}
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl leading-tight">
                {product.title}
              </h1>
              <p className="mt-4 text-4xl font-black" style={{ color: "#7FB685" }}>
                {formatCurrency(product.price)}
              </p>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold" style={{ color: "rgba(255,255,255,0.40)" }}>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" style={{ color: "#7FB685" }} />
                {product.location}
              </span>
              <span>{formatRelativeDate(product.postedAt)}</span>
              <span>{product.condition}</span>
            </div>

            {/* Description */}
            <p className="leading-7 text-sm md:text-base" style={{ color: "rgba(255,255,255,0.55)" }}>
              {product.description}
            </p>

            {/* Details grid */}
            <dl className="grid grid-cols-2 gap-2.5 text-sm">
              {[
                ["Category",    product.category],
                ["Condition",   product.condition],
                ["Negotiation", product.negotiable ? "Open to offers" : "Fixed price"],
                ["Views",       product.views.toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <dt className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.30)" }}>{label}</dt>
                  <dd className="mt-1 font-black text-white">{value}</dd>
                </div>
              ))}
            </dl>

            {/* CTA buttons */}
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <BuyNowButton productId={product.id} price={product.price} listingType={product.listingType} category={product.category} />
              </div>
              <SaveButton productId={product.id} />
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all hover:-translate-y-px"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.60)" }}
              >
                <Share2 className="h-5 w-5" />
                Share
              </button>
            </div>

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ background: "rgba(127,182,133,0.08)", color: "#7FB685", border: "1px solid rgba(127,182,133,0.18)" }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </aside>
        </div>

        {/* ── Similar items ── */}
        <section className="mt-16">
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.30)" }}>
              More like this
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">Similar items</h2>
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
