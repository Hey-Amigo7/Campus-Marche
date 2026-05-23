import Link from "next/link";
import { MapPin, ImageOff, TrendingUp } from "lucide-react";
import type { Product } from "@/types";
import { cn, formatCurrency } from "@/lib/format";
import { FeaturedBadge, SellerBadge } from "@/components/ui";

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
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={cn("relative grid place-items-center overflow-hidden", className)}
      style={{ background: "linear-gradient(135deg, #F8F5EF 0%, #DFF3E3 100%)" }}
    >
      <div className="flex flex-col items-center gap-3 px-4 text-center">
        <div
          className="grid h-12 w-12 place-items-center rounded-2xl shadow-sm"
          style={{ background: "rgba(255,255,255,0.80)", boxShadow: "0 2px 10px rgba(127,182,133,0.15)" }}
        >
          <ImageOff className="h-5 w-5" style={{ color: "#7FB685" }} />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: "#7FB685" }}>
          No photo yet
        </p>
        {title ? <span className="text-xs" style={{ color: "#94A3B8" }}>{title}</span> : null}
      </div>
    </div>
  );
}

export function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl transition-all duration-300",
        "hover:-translate-y-1.5",
        product.featured ? "ring-1" : "",
      )}
      style={{
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        border: product.featured
          ? "1.5px solid rgba(127,182,133,0.50)"
          : "1px solid rgba(226,232,240,0.70)",
        boxShadow: product.featured
          ? "0 4px 20px rgba(127,182,133,0.18), 0 1px 4px rgba(15,23,42,0.06)"
          : "0 2px 12px rgba(15,23,42,0.07), 0 1px 3px rgba(15,23,42,0.04)",
      }}
    >
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative">
          <ProductArt
            style={product.imageStyle}
            imageUrl={product.imageUrl}
            title={product.title}
            className={compact ? "min-h-28" : "min-h-44"}
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {product.featured ? <FeaturedBadge /> : null}
            {product.boosted ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm"
                style={{
                  background: "rgba(198,139,89,0.12)",
                  color: "#C68B59",
                  border: "1px solid rgba(198,139,89,0.25)",
                }}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Boosted
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/products/${product.id}`} className="min-w-0">
            <h3
              className="line-clamp-2 text-sm font-bold tracking-tight transition-colors"
              style={{ color: "#1E293B" }}
            >
              {product.title}
            </h3>
          </Link>
          <span
            className="shrink-0 rounded-xl px-2.5 py-1 text-sm font-black"
            style={{ background: "#DFF3E3", color: "#5A9460" }}
          >
            {formatCurrency(product.price)}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1 text-xs font-semibold" style={{ color: "#94A3B8" }}>
          <span className="inline-flex items-center gap-0.5">
            <MapPin className="h-3 w-3" />
            {product.location}
          </span>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <Link
            href={`/store/${product.sellerId}`}
            className="min-w-0 text-xs font-bold transition-colors hover:underline"
            style={{ color: "#64748B" }}
          >
            {product.seller.name}
          </Link>
          <SellerBadge verified={product.seller.verified} premium={product.seller.premium} compact />
        </div>

        {!compact ? (
          <div className="mt-4">
            <Link
              href={`/products/${product.id}`}
              className="btn-primary min-h-9 w-full rounded-xl px-3 py-2 text-xs"
            >
              View Details
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
