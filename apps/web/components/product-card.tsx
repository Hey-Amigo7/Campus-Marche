import Link from "next/link";
import { MapPin, ImageOff, TrendingUp } from "lucide-react";
import type { Product } from "@/types";
import { cn, formatCurrency } from "@/lib/format";
import { FeaturedBadge, SellerBadge } from "@/components/ui";

export function ProductArt({ style, className, imageUrl, title }: { style: string; className?: string; imageUrl?: string; title?: string }) {
  void style;

  if (imageUrl) {
    return (
      <div className={cn("relative overflow-hidden rounded-3xl bg-pink-50", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={title ?? "Product image"} className="h-full w-full object-cover" loading="lazy" />
      </div>
    );
  }

  return (
    <div className={cn("relative grid place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-pink-50 to-sky-50 text-slate-400", className)}>
      <div className="flex flex-col items-center gap-3 px-4 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/80 shadow-sm shadow-pink-100">
          <ImageOff className="h-5 w-5 text-pink-200" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-pink-200">No photo yet</p>
        {title ? <span className="text-xs text-slate-400">{title}</span> : null}
      </div>
    </div>
  );
}

export function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl bg-white transition-all duration-300",
        "border shadow-sm",
        "hover:-translate-y-1.5 hover:shadow-xl hover:shadow-pink-200/40",
        product.featured
          ? "border-pink-200/60 shadow-pink-100/40"
          : "border-pink-100/40 hover:border-pink-200/50",
      )}
    >
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative">
          <ProductArt
            style={product.imageStyle}
            imageUrl={product.imageUrl}
            title={product.title}
            className={compact ? "min-h-28" : "min-h-36"}
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {product.featured ? <FeaturedBadge /> : null}
            {product.boosted ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-600 shadow-sm ring-1 ring-sky-100">
                <TrendingUp className="h-3.5 w-3.5" />
                Boosted
              </span>
            ) : null}
          </div>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/products/${product.id}`} className="min-w-0">
            <h3 className="line-clamp-2 text-sm font-bold tracking-tight text-slate-900 group-hover:text-pink-500">
              {product.title}
            </h3>
          </Link>
          <span className="shrink-0 rounded-lg bg-sky-50 px-2 py-0.5 text-sm font-black text-sky-600">
            {formatCurrency(product.price)}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1 text-xs font-semibold text-slate-400">
          <span className="inline-flex items-center gap-0.5">
            <MapPin className="h-3 w-3" />
            {product.location}
          </span>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <Link href={`/store/${product.sellerId}`} className="min-w-0 text-xs font-bold text-slate-500 hover:text-pink-500">
            {product.seller.name}
          </Link>
          <SellerBadge verified={product.seller.verified} premium={product.seller.premium} compact />
        </div>
        {!compact ? (
          <div className="mt-3">
            <Link
              href={`/products/${product.id}`}
              className="btn-primary min-h-8 w-full rounded-xl px-3 py-2 text-xs"
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
