"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Loader2, MapPin, Star, Wrench } from "lucide-react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import type { Product } from "@/types";
import { api } from "@/lib/api";
import { cn, formatCurrency, formatRelativeDate } from "@/lib/format";
import { hasAuthToken } from "@/lib/auth";
import { useSavedStatus } from "@/hooks/use-api";

export function ProductArt({
  style,
  className,
  imageUrl,
  title,
}: {
  style: string;
  className?: string;
  imageUrl?: string;
  title?: string;
}) {
  void style;

  if (imageUrl) {
    return (
      <div className={cn("relative overflow-hidden", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title ?? "Product image"}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={cn("relative grid place-items-center overflow-hidden", className)}
      style={{ background: "linear-gradient(145deg, #F0F7F1 0%, #DFF3E3 60%, #F8F5EF 100%)" }}
    >
      <div className="flex flex-col items-center gap-2 px-4 text-center">
        <div
          className="grid h-14 w-14 place-items-center rounded-2xl"
          style={{ background: "rgba(127,182,133,0.12)", border: "1px solid rgba(127,182,133,0.18)" }}
        >
          <span className="text-2xl select-none">
            {title?.toLowerCase().includes("laptop") || title?.toLowerCase().includes("computer") ? "💻"
              : title?.toLowerCase().includes("phone") ? "📱"
              : title?.toLowerCase().includes("book") || title?.toLowerCase().includes("text") ? "📚"
              : title?.toLowerCase().includes("chair") || title?.toLowerCase().includes("furniture") ? "🪑"
              : title?.toLowerCase().includes("shoe") || title?.toLowerCase().includes("cloth") ? "👟"
              : title?.toLowerCase().includes("tutor") || title?.toLowerCase().includes("teach") ? "🎓"
              : title?.toLowerCase().includes("hair") || title?.toLowerCase().includes("braid") ? "✂️"
              : title?.toLowerCase().includes("design") || title?.toLowerCase().includes("graphic") ? "🎨"
              : "📦"}
          </span>
        </div>
        {title ? (
          <p className="line-clamp-2 text-xs font-semibold" style={{ color: "#7FB685" }}>{title}</p>
        ) : null}
      </div>
    </div>
  );
}

function SaveButton({ productId, compact = false }: { productId: string; compact?: boolean }) {
  const { data: status } = useSavedStatus(productId);
  const { mutate } = useSWRConfig();
  const [loading, setLoading] = useState(false);

  if (!hasAuthToken()) return null;

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!status) return;
    setLoading(true);
    try {
      if (status.saved) await api.unsaveItem(productId);
      else await api.saveItem(productId);
      await mutate(`saved-status-${productId}`);
      await mutate("saved-items");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={status?.saved ? "Remove from saved" : "Save listing"}
      className="grid h-9 w-9 place-items-center rounded-full shadow-md transition-all hover:scale-110 active:scale-95"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.60)",
      }}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#94A3B8" }} />
      ) : status?.saved ? (
        <BookmarkCheck className="h-4 w-4" style={{ color: "#C68B59" }} />
      ) : (
        <Bookmark className="h-4 w-4" style={{ color: "#64748B" }} />
      )}
    </button>
  );
}

export function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const router = useRouter();
  const isService = (product as Product & { listingType?: string }).listingType === "service";

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1",
      )}
      style={{
        background: "rgba(255,255,255,0.90)",
        backdropFilter: "blur(20px) saturate(160%)",
        border: product.featured
          ? "1.5px solid rgba(127,182,133,0.45)"
          : "1px solid rgba(226,232,240,0.65)",
        boxShadow: product.featured
          ? "0 6px 28px rgba(127,182,133,0.15), 0 2px 6px rgba(15,23,42,0.06)"
          : "0 2px 14px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04)",
      }}
    >
      {/* Image — full width, no button overlay */}
      <Link href={`/products/${product.id}`} className="block overflow-hidden">
        <div className="relative">
          <ProductArt
            style={product.imageStyle}
            imageUrl={product.imageUrl}
            title={product.title}
            className={compact ? "min-h-32" : "min-h-48"}
          />

          {/* Badges top-left */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1">
            {product.featured ? (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black text-white shadow-sm"
                style={{ background: "linear-gradient(135deg, #0F172A, #1a3a2a)" }}
              >
                Featured
              </span>
            ) : null}
            {isService ? (
              <span
                className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-black shadow-sm"
                style={{ background: "rgba(198,139,89,0.90)", color: "#fff" }}
              >
                <Wrench className="h-2.5 w-2.5" />
                Service
              </span>
            ) : null}
          </div>

          {/* Save button top-right */}
          <div className="absolute right-3 top-3">
            <SaveButton productId={product.id} compact />
          </div>

          {/* Price overlay at bottom of image — Instagram/Airbnb style */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-3 pt-8"
            style={{ background: "linear-gradient(to top, rgba(15,23,42,0.55) 0%, transparent 100%)" }}>
            <span className="text-base font-black text-white drop-shadow-sm">
              {formatCurrency(product.price)}
              {product.negotiable ? <span className="ml-1 text-[10px] font-semibold opacity-80">· negotiable</span> : null}
            </span>
          </div>
        </div>
      </Link>

      {/* Card body — minimal */}
      <Link href={`/products/${product.id}`} className="flex flex-1 flex-col p-3">
        <h3
          className="line-clamp-2 text-sm font-bold leading-snug tracking-tight"
          style={{ color: "#1E293B" }}
        >
          {product.title}
        </h3>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-0.5 text-xs font-medium" style={{ color: "#94A3B8" }}>
            <MapPin className="h-3 w-3" />
            {product.location}
          </span>
          {product.seller.verified ? (
            <span className="text-[10px] font-bold" style={{ color: "#5A9460" }}>✓ verified</span>
          ) : null}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/store/${product.sellerId}`); }}
            className="min-w-0 truncate text-xs font-semibold hover:underline text-left"
            style={{ color: "#64748B" }}
          >
            {product.seller.name}
          </button>
          <span className="shrink-0 text-[10px] font-medium" style={{ color: "#94A3B8" }}>
            {formatRelativeDate(product.postedAt)}
          </span>
        </div>

        {product.seller.premium && !compact ? (
          <div className="mt-2 flex items-center gap-1">
            <Star className="h-3 w-3" style={{ fill: "#C68B59", color: "#C68B59" }} />
            <span className="text-[10px] font-bold" style={{ color: "#C68B59" }}>Premium seller</span>
          </div>
        ) : null}
      </Link>
    </article>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
