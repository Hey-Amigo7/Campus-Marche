"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, MapPin, Star, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useSWRConfig } from "swr";
import type { Product } from "@/types";
import { api } from "@/lib/api";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import { hasAuthToken } from "@/lib/auth";
import { useSavedStatus } from "@/hooks/use-api";
import { AnimatedHeart, AnimatedLoader } from "@/components/animated-icons";

const spring = { type: "spring", stiffness: 340, damping: 26 } as const;

/* ── Condition badge config ─────────────────────────────────── */
const CONDITION_COLOR: Record<string, string> = {
  "New":      "var(--green)",
  "Like new": "var(--green-dark)",
  "Good":     "var(--caramel)",
  "Fair":     "var(--muted)",
};

/* ── Product image / placeholder ─────────────────────────────── */
export function ProductArt({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  style: _s,
  className,
  imageUrl,
  title,
}: {
  style: string;
  className?: string;
  imageUrl?: string;
  title?: string;
}) {
  const emoji =
    title?.toLowerCase().includes("laptop") || title?.toLowerCase().includes("computer") ? "💻"
    : title?.toLowerCase().includes("phone") ? "📱"
    : title?.toLowerCase().includes("book")  || title?.toLowerCase().includes("text")   ? "📚"
    : title?.toLowerCase().includes("chair") || title?.toLowerCase().includes("furniture") ? "🪑"
    : title?.toLowerCase().includes("shoe")  || title?.toLowerCase().includes("cloth")  ? "👟"
    : title?.toLowerCase().includes("tutor") || title?.toLowerCase().includes("teach")  ? "🎓"
    : "📦";

  if (imageUrl) {
    return (
      <div className={`relative overflow-hidden ${className ?? ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title ?? "Product image"}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
        />
      </div>
    );
  }

  return (
    <div
      className={`grid place-items-center ${className ?? ""}`}
      style={{ background: "var(--surface-raised)" }}
    >
      <span className="text-4xl opacity-40 select-none">{emoji}</span>
    </div>
  );
}

/* ── Heart save button ────────────────────────────────────────── */
function SaveButton({ productId }: { productId: string }) {
  const { data: status } = useSavedStatus(productId);
  const { mutate }       = useSWRConfig();
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

  if (loading) {
    return (
      <span className="grid h-7 w-7 place-items-center rounded-full"
        style={{ background: "rgba(250,250,249,0.92)", border: "1px solid rgba(228,228,231,0.80)" }}>
        <AnimatedLoader size={12} color="var(--muted)" />
      </span>
    );
  }

  return (
    <span
      className="block rounded-full"
      style={{ background: "rgba(250,250,249,0.92)", border: "1px solid rgba(228,228,231,0.80)" }}
    >
      <AnimatedHeart
        saved={!!status?.saved}
        onToggle={toggle}
        size={15}
        className="h-7 w-7 rounded-full"
      />
    </span>
  );
}

/* ── Main product card ────────────────────────────────────────── */
export function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const router    = useRouter();
  const imageUrl  = product.imageUrl ?? product.imageUrls?.[0];
  const isService = product.listingType === "service" || product.category === "Services";
  const isSold    = product.active === false || !!(product as Product & { soldAt?: string | null }).soldAt;
  const conditionColor = product.condition ? (CONDITION_COLOR[product.condition] ?? "var(--muted)") : null;

  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      transition={spring}
      className="group relative flex flex-col overflow-hidden rounded-2xl"
      style={{
        background: "var(--surface)",
        border:     "1px solid var(--border)",
        boxShadow:  "0 2px 8px rgba(9,9,11,0.04)",
      }}
    >
      {/* Image */}
      <Link href={`/products/${product.id}`} className="block overflow-hidden">
        <div className="relative overflow-hidden bg-[var(--surface-raised)]" style={{ height: compact ? 128 : 192 }}>
          <ProductArt
            style={product.imageStyle}
            imageUrl={imageUrl}
            title={product.title}
            className="h-full w-full"
          />

          {/* Condition badge — top left */}
          {conditionColor && (
            <span
              className="absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
              style={{ background: conditionColor }}
            >
              {product.condition}
            </span>
          )}

          {/* Service badge — top left (if service, overrides condition) */}
          {isService && (
            <span
              className="absolute left-2.5 top-2.5 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ background: "var(--caramel)" }}
            >
              <Wrench className="h-2.5 w-2.5" />
              Service
            </span>
          )}

          {/* Featured badge — top right (only when no save button) */}
          {product.featured && !hasAuthToken() && (
            <span
              className="absolute right-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ background: "var(--green)" }}
            >
              Featured
            </span>
          )}

          {/* Heart save button — top right */}
          <div className="absolute right-2.5 top-2.5">
            <SaveButton productId={product.id} />
          </div>

          {/* Sold overlay */}
          {isSold && (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(9,9,11,0.50)" }}>
              <span
                className="rounded-full px-4 py-1.5 text-sm font-bold"
                style={{ background: "rgba(250,250,249,0.92)", color: "var(--on-surface)" }}
              >
                SOLD
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-3">

        {/* Title */}
        <Link href={`/products/${product.id}`}>
          <h3
            className="line-clamp-2 text-sm font-semibold leading-snug transition-colors hover:text-[var(--green)]"
            style={{ color: "var(--on-surface)" }}
          >
            {product.title}
          </h3>
        </Link>

        {/* Price row */}
        <div className="flex items-baseline gap-2">
          <span className="text-base font-black" style={{ color: "var(--on-surface)" }}>
            {formatCurrency(product.price)}
          </span>
          {product.negotiable && (
            <span className="ml-auto text-[10px] font-medium" style={{ color: "var(--green)" }}>
              Negotiable
            </span>
          )}
        </div>

        {/* Seller + location row */}
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--muted)" }}>
          <button
            type="button"
            className="flex items-center gap-1 hover:underline"
            onClick={(e) => { e.preventDefault(); router.push(`/store/${product.sellerId}`); }}
          >
            <span className="max-w-[80px] truncate">{product.seller.name.split(" ")[0]}</span>
            {product.seller.verified && (
              <svg className="h-2.5 w-2.5 shrink-0" style={{ color: "var(--green)", fill: "var(--green)" }}
                viewBox="0 0 24 24" aria-hidden>
                <path d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-.723 3.066 3.745 3.745 0 01-3.066.723A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.066-.723 3.745 3.745 0 01-.723-3.066A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 01.723-3.066 3.746 3.746 0 013.066-.723A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.066.723 3.746 3.746 0 01.723 3.066A3.745 3.745 0 0121 12z" strokeWidth="1.5" stroke="currentColor" fill="none" />
              </svg>
            )}
          </button>
          {product.seller.rating !== undefined && product.seller.rating > 0 && (
            <>
              <span>·</span>
              <span className="flex items-center gap-0.5 shrink-0">
                <Star size={9} style={{ fill: "var(--caramel)", stroke: "var(--caramel)" }} />
                {product.seller.rating.toFixed(1)}
              </span>
            </>
          )}
          <span>·</span>
          <span className="flex items-center gap-0.5 min-w-0">
            <MapPin size={9} className="shrink-0" />
            <span className="truncate">{product.location}</span>
          </span>
        </div>

        {/* Footer: views + time */}
        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5 text-[11px]" style={{ color: "var(--subtle)" }}>
            <span className="flex items-center gap-0.5">
              <Eye size={11} />
              {product.views ?? 0}
            </span>
            <span>{formatRelativeDate(product.postedAt)}</span>
          </div>

          {product.seller.premium && (
            <span className="text-[10px] font-semibold" style={{ color: "var(--caramel)" }}>
              ★ Premium
            </span>
          )}
        </div>
      </div>
    </motion.article>
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
