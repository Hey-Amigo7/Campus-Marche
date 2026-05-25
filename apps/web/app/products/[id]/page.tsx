"use client";

import Link from "next/link";
import { Bookmark, BookmarkCheck, Loader2, MapPin, Share2, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { use, useState } from "react";
import { useSWRConfig } from "swr";
import { api } from "@/lib/api";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import { BuyNowButton } from "@/components/buy-now-button";
import { ProductArt, ProductGrid } from "@/components/product-card";
import { EmptyState, Rating, SectionHeading, SellerBadge } from "@/components/ui";
import { useProduct, useProducts, useReviews, useSavedStatus } from "@/hooks/use-api";
import { hasAuthToken } from "@/lib/auth";

const GLASS_PANEL = {
  background:    "rgba(255,255,255,0.82)",
  backdropFilter:"blur(18px) saturate(150%)",
  border:        "1px solid rgba(226,232,240,0.70)",
  boxShadow:     "0 4px 24px rgba(15,23,42,0.07)",
} as const;

type ApiReview = {
  id: string;
  rating: number;
  comment: string | null;
  author: string;
  createdAt: string;
};

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
      onClick={toggle}
      disabled={loading}
      className="btn-secondary"
      aria-label={status?.saved ? "Remove from wishlist" : "Save to wishlist"}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
      {status?.saved ? "Saved" : "Save"}
    </button>
  );
}

function ReviewList({ productId }: { productId: string }) {
  const { data: reviews, isLoading } = useReviews(productId);

  if (isLoading) return <p className="text-sm" style={{ color: "#94A3B8" }}>Loading reviews…</p>;
  if (!reviews || reviews.length === 0) {
    return (
      <p className="text-sm italic" style={{ color: "#94A3B8" }}>
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
          style={{ background: "rgba(248,245,239,0.60)" }}
        >
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className="h-4 w-4"
                style={i < review.rating ? { fill: "#C68B59", color: "#C68B59" } : { color: "#E2E8F0" }}
              />
            ))}
          </div>
          {review.comment ? (
            <p className="mt-2 text-sm leading-6" style={{ color: "#64748B" }}>{review.comment}</p>
          ) : null}
          <p className="mt-2 text-xs font-bold" style={{ color: "#94A3B8" }}>
            {review.author} · {formatRelativeDate(review.createdAt)}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: product, isLoading, error } = useProduct(id);
  const { data: allProducts } = useProducts();

  if (isLoading) {
    return (
      <div className="container-shell flex min-h-[400px] items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#7FB685" }} />
      </div>
    );
  }

  if (error || product === null) {
    notFound();
  }

  if (!product) {
    return (
      <div className="container-shell flex min-h-[400px] items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#7FB685" }} />
      </div>
    );
  }

  const seller = product.seller;
  const sellerLocation = seller.location ?? null;
  const sellerRating = seller.rating ?? 0;

  const similar = allProducts
    .filter((item) => item.category === product.category && item.id !== id)
    .slice(0, 4);

  return (
    <div className="container-shell py-8 md:py-10">
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left — image + seller */}
        <section>
          <div className="overflow-hidden rounded-2xl" style={GLASS_PANEL}>
            <ProductArt
              style={product.imageStyle}
              imageUrl={product.imageUrl}
              title={product.title}
              className="min-h-[420px] transition hover:scale-[1.01]"
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-3xl" style={GLASS_PANEL}>
            <div className="max-h-[420px] space-y-6 overflow-y-auto p-6">
              <div className="flex items-center justify-between gap-3">
                <Link href={`/store/${seller.id}`} className="flex items-center gap-3">
                  <span
                    className="grid h-12 w-12 place-items-center rounded-2xl text-sm font-black text-white"
                    style={{ background: "#0F172A" }}
                  >
                    {seller.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span>
                    <span className="block font-black" style={{ color: "#1E293B" }}>{seller.name}</span>
                    {sellerLocation ? (
                      <span className="block text-sm font-semibold" style={{ color: "#64748B" }}>{sellerLocation}</span>
                    ) : null}
                  </span>
                </Link>
                <SellerBadge verified={seller.verified} premium={seller.premium} compact />
              </div>
              {sellerRating > 0 ? (
                <div className="flex items-center justify-between">
                  <Rating value={sellerRating} />
                  <Link href={`/store/${seller.id}`} className="text-sm font-bold hover:underline" style={{ color: "#5A9460" }}>
                    View storefront
                  </Link>
                </div>
              ) : (
                <Link href={`/store/${seller.id}`} className="text-sm font-bold hover:underline" style={{ color: "#5A9460" }}>
                  View storefront →
                </Link>
              )}
              <div className="border-t pt-4" style={{ borderColor: "rgba(226,232,240,0.50)" }}>
                <p className="mb-3 text-sm font-black" style={{ color: "#64748B" }}>Reviews</p>
                <ReviewList productId={product.id} />
              </div>
            </div>
          </div>
        </section>

        {/* Right — details */}
        <aside className="rounded-2xl p-6" style={GLASS_PANEL}>
          <div className="flex flex-wrap gap-2">
            {product.featured ? (
              <span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: "#0F172A" }}>
                Featured
              </span>
            ) : null}
            {product.boosted ? (
              <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: "rgba(198,139,89,0.12)", color: "#C68B59", border: "1px solid rgba(198,139,89,0.25)" }}>
                Boosted
              </span>
            ) : null}
          </div>

          <h1 className="mt-5 text-3xl font-black tracking-tight md:text-4xl" style={{ color: "#1E293B" }}>
            {product.title}
          </h1>
          <p className="mt-3 text-3xl font-black" style={{ color: "#0F172A" }}>{formatCurrency(product.price)}</p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-semibold" style={{ color: "#64748B" }}>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" style={{ color: "#7FB685" }} />
              {product.location}
            </span>
            <span>{formatRelativeDate(product.postedAt)}</span>
            <span>{product.condition}</span>
          </div>

          <p className="mt-6 leading-7" style={{ color: "#64748B" }}>{product.description}</p>

          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            {[
              ["Category",    product.category],
              ["Condition",   product.condition],
              ["Negotiation", product.negotiable ? "Open" : "Fixed price"],
              ["Views",       product.views.toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl p-4" style={{ background: "rgba(248,245,239,0.60)" }}>
                <dt className="font-semibold" style={{ color: "#94A3B8" }}>{label}</dt>
                <dd className="mt-1 font-black" style={{ color: "#1E293B" }}>{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <BuyNowButton productId={product.id} price={product.price} />
            <SaveButton productId={product.id} />
            <button className="btn-secondary sm:col-span-2">
              <Share2 className="h-5 w-5" />
              Share
            </button>
          </div>

          {product.tags.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: "rgba(127,182,133,0.10)", color: "#5A9460", border: "1px solid rgba(127,182,133,0.20)" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </aside>
      </div>

      <section className="mt-10">
        <SectionHeading title="Similar items" subtitle="Related products from the same category." />
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
  );
}
