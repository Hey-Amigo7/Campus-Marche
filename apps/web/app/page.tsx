"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, TrendingUp, Zap } from "lucide-react";
import { CategoryCard } from "@/components/category-card";
import { ProductCard } from "@/components/product-card";
import { useProducts, useCategories } from "@/hooks/use-api";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/types";

const CATEGORY_ICONS: Record<string, string> = {
  Electronics: "💻", Textbooks: "📚", Clothing: "👕", Furniture: "🪑",
  Notes: "📝", Sports: "⚽", Stationery: "✏️", Services: "🎯", Other: "📦",
};

function LiveFeed() {
  const { data: products, isLoading } = useProducts();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl" style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(226,232,240,0.60)" }}>
            <div className="h-48 animate-pulse" style={{ background: "linear-gradient(135deg, #F0F7F1, #F8F5EF)" }} />
            <div className="space-y-2 p-3">
              <div className="h-3.5 w-3/4 animate-pulse rounded-full" style={{ background: "#F0F7F1" }} />
              <div className="h-3 w-1/2 animate-pulse rounded-full" style={{ background: "#F8F5EF" }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const fresh = [...products]
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
    .slice(0, 10);

  if (fresh.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed py-20 text-center"
        style={{ borderColor: "rgba(127,182,133,0.30)", background: "rgba(223,243,227,0.12)" }}>
        <p className="text-2xl">🛍️</p>
        <p className="mt-3 font-bold" style={{ color: "#64748B" }}>No listings yet</p>
        <Link href="/sell" className="btn-primary mt-4 inline-flex">List something first</Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {fresh.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  );
}

function TrendingSection() {
  const { data: products } = useProducts();
  const top = [...products].sort((a: Product, b: Product) => b.views - a.views).slice(0, 5);
  if (top.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {top.map((p) => <ProductCard key={p.id} product={p} compact />)}
    </div>
  );
}

function CategoryStrip() {
  const { data: categoriesData } = useCategories();
  const categories = categoriesData ?? [];
  if (categories.length === 0) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {categories.map((cat, i) => (
        <Link
          key={cat.name}
          href={`/products?category=${encodeURIComponent(cat.name)}`}
          className="inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-md"
          style={{
            background: i === 0 ? "#0F172A" : "rgba(255,255,255,0.88)",
            color: i === 0 ? "#fff" : "#1E293B",
            border: i === 0 ? "none" : "1px solid rgba(226,232,240,0.70)",
            backdropFilter: "blur(12px)",
          }}
        >
          <span>{CATEGORY_ICONS[cat.name] ?? "📦"}</span>
          {cat.name}
          <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black"
            style={{ background: i === 0 ? "rgba(255,255,255,0.15)" : "rgba(127,182,133,0.15)", color: i === 0 ? "#fff" : "#5A9460" }}>
            {cat.count}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div>
      {/* ── Hero — editorial, not template ── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0F172A 0%, #0d2118 50%, #0F172A 100%)" }}
      >
        {/* Subtle texture */}
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, rgba(127,182,133,0.18) 0%, transparent 55%), radial-gradient(circle at 80% 20%, rgba(198,139,89,0.10) 0%, transparent 45%)" }} />
        <div className="pointer-events-none absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2"
          style={{ background: "linear-gradient(90deg, transparent, rgba(127,182,133,0.40), transparent)" }} />

        <div className="container-shell grid gap-8 py-14 md:grid-cols-[1fr_1fr] md:py-20 lg:py-24">
          {/* Left — copy */}
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold"
              style={{ background: "rgba(127,182,133,0.14)", color: "#A8D4AE", border: "1px solid rgba(127,182,133,0.22)" }}>
              <Sparkles className="h-3.5 w-3.5" />
              HTU Student Marketplace
            </div>

            <h1 className="text-4xl font-black leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
              Your campus.<br />
              Your{" "}
              <span style={{ background: "linear-gradient(135deg, #7FB685, #A8D4AE)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                market.
              </span>
            </h1>

            <p className="mt-5 max-w-md text-base leading-7" style={{ color: "#94A3B8" }}>
              Buy gadgets, textbooks, fashion, and room essentials from verified HTU students and trusted local vendors.
              No fees. No friction. All on campus.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products"
                className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-black text-white transition-all hover:-translate-y-1"
                style={{ background: "#7FB685", boxShadow: "0 8px 24px rgba(127,182,133,0.38)" }}>
                Browse marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/sell"
                className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-black transition-all hover:-translate-y-1"
                style={{ background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.14)", backdropFilter: "blur(12px)" }}>
                <Zap className="h-4 w-4" style={{ color: "#C68B59" }} />
                Sell in minutes
              </Link>
            </div>

            {/* Social proof chips */}
            <div className="mt-8 flex flex-wrap gap-3">
              {[
                { label: "Free to list", icon: "✓" },
                { label: "Campus meetup", icon: "📍" },
                { label: "Student verified", icon: "🎓" },
              ].map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#94A3B8", border: "1px solid rgba(255,255,255,0.10)" }}>
                  {item.icon} {item.label}
                </span>
              ))}
            </div>
          </div>

          {/* Right — floating listing previews */}
          <div className="hidden md:flex md:flex-col md:justify-center">
            <RecentHeroCards />
          </div>
        </div>
      </section>

      {/* ── Category Strip (Airbnb-style) ── */}
      <section className="container-shell pt-6 pb-2">
        <CategoryStrip />
      </section>

      {/* ── Live feed ── */}
      <section className="container-shell py-8">
        <div className="mb-5 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-tight" style={{ color: "#1E293B" }}>Just listed</h2>
            <p className="mt-1 text-sm" style={{ color: "#94A3B8" }}>Fresh from HTU students and local vendors</p>
          </div>
          <Link href="/products" className="inline-flex items-center gap-1 text-sm font-bold transition-colors hover:underline" style={{ color: "#5A9460" }}>
            See all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <LiveFeed />
      </section>

      {/* ── Trending ── */}
      <section className="container-shell py-6">
        <div className="mb-5 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" style={{ color: "#C68B59" }} />
          <h2 className="text-xl font-black tracking-tight" style={{ color: "#1E293B" }}>Trending this week</h2>
        </div>
        <TrendingSection />
      </section>

      {/* ── Categories grid ── */}
      <section className="container-shell py-8 pb-14">
        <div className="mb-5">
          <h2 className="text-xl font-black tracking-tight" style={{ color: "#1E293B" }}>Browse by category</h2>
        </div>
        <CategoriesGrid />
      </section>
    </div>
  );
}

function RecentHeroCards() {
  const { data: products } = useProducts();
  const recent = [...products].sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()).slice(0, 3);

  if (recent.length === 0) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
        <p className="text-sm font-semibold" style={{ color: "#64748B" }}>Listings will appear here</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Stacked cards effect */}
      {recent[2] && (
        <div className="absolute -bottom-2 left-6 right-0 overflow-hidden rounded-2xl opacity-40 scale-[0.96] origin-bottom"
          style={{ height: "80px", background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.12)" }} />
      )}
      {recent[1] && (
        <div className="absolute -bottom-1 left-3 right-0 overflow-hidden rounded-2xl opacity-60 scale-[0.98] origin-bottom"
          style={{ height: "80px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }} />
      )}
      {recent[0] && (
        <div className="relative overflow-hidden rounded-2xl"
          style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.70)" }}>
          {recent[0].imageUrl ? (
            <img src={recent[0].imageUrl} alt={recent[0].title} className="h-40 w-full object-cover" />
          ) : (
            <div className="h-40 w-full" style={{ background: "linear-gradient(135deg, #DFF3E3, #F0F7F1)" }}>
              <div className="flex h-full items-center justify-center text-5xl">
                {CATEGORY_ICONS[recent[0].category ?? ""] ?? "📦"}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="font-black text-slate-950 line-clamp-1">{recent[0].title}</p>
              <p className="text-sm text-slate-500">{recent[0].seller.name} · {recent[0].location}</p>
            </div>
            <span className="shrink-0 rounded-xl px-3 py-1.5 text-sm font-black"
              style={{ background: "#DFF3E3", color: "#5A9460" }}>
              {formatCurrency(recent[0].price)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoriesGrid() {
  const { data: categoriesData } = useCategories();
  const categories = categoriesData ?? [];
  if (categories.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((category, i) => (
        <CategoryCard key={category.name} category={category} index={i} />
      ))}
    </div>
  );
}
