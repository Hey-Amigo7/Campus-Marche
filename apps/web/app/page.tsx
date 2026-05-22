"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, ShieldCheck, ShoppingBag, Sparkles, Store, Users, Zap } from "lucide-react";
import { products as mockProducts } from "@/constants/mock-data";
import { CategoryCard } from "@/components/category-card";
import { ProductArt, ProductGrid } from "@/components/product-card";
import { Logo, SectionHeading, SellerBadge } from "@/components/ui";
import { useProducts, useCategories } from "@/hooks/use-api";
import type { Product } from "@/types";

function HeroProductPreviews() {
  const { data: products } = useProducts();
  const displayProducts = products.length >= 3 ? products.slice(0, 3) : mockProducts.slice(0, 3);

  return (
    <>
      {displayProducts.map((product: Product, index: number) => (
        <div
          key={product.id}
          className={`rounded-2xl border border-white/60 bg-white/85 p-4 shadow-xl shadow-indigo-400/10 backdrop-blur-sm ${index === 1 ? "ml-6" : index === 2 ? "mr-6" : ""}`}
        >
          <div className="flex items-center gap-4">
            <ProductArt
              style={product.imageStyle}
              imageUrl={product.imageUrl}
              title={product.title}
              className="min-h-20 w-24 shrink-0 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-900">{product.title}</p>
              <p className="mt-1 text-sm font-black text-brand-navy">GHS {product.price.toLocaleString()}</p>
              <SellerBadge verified={product.seller.verified} premium={product.seller.premium} compact />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function RecentlyListed() {
  const { data: products } = useProducts();
  const display = products.length > 0
    ? [...products].sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()).slice(0, 4)
    : mockProducts.slice(0, 4);

  return <ProductGrid products={display} />;
}

function TrendingProducts() {
  const { data: products } = useProducts();
  const display = products.length > 0
    ? [...products].sort((a, b) => b.views - a.views).slice(0, 4)
    : [...mockProducts].sort((a, b) => b.views - a.views).slice(0, 4);

  return <ProductGrid products={display} />;
}

function CategoriesSection() {
  const { data: categoriesData } = useCategories();
  const categories = categoriesData ?? [];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((category, i) => (
        <CategoryCard key={category.name} category={category} index={i} />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div>
      {/* ── Hero ── */}
      <section className="container-shell py-8 md:py-12">
        <div className="grid overflow-hidden rounded-3xl border border-indigo-100 shadow-2xl shadow-indigo-200/40 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left: copy */}
          <div className="bg-white p-6 sm:p-10 lg:p-14">
            <span className="chip chip-indigo">
              <Sparkles className="h-3.5 w-3.5" />
              For Students, By Students
            </span>
            <h1 className="mt-6 max-w-xl text-4xl font-black leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem]">
              Buy. Sell.{" "}
              <span className="gradient-text">Connect.</span>
              <br />
              <span className="text-brand-gold">All on Campus.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-500 sm:text-lg">
              A trusted HTU marketplace for gadgets, textbooks, room essentials, notes, fashion,
              and local vendor deals around campus.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/products" className="btn-primary">
                <ShoppingBag className="h-5 w-5" />
                Shop Now
              </Link>
              <Link href="/sell" className="btn-secondary">
                Sell Your Product
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-9 grid grid-cols-3 gap-3">
              {[
                ["2.8k+", "students", "bg-indigo-50 text-brand-navy"],
                ["540+", "listings", "bg-amber-50 text-amber-700"],
                ["4.8/5", "trust score", "bg-emerald-50 text-emerald-700"],
              ].map(([value, label, classes]) => (
                <div key={label} className={`rounded-2xl p-4 ${classes}`}>
                  <p className="text-xl font-black">{value}</p>
                  <p className="mt-0.5 text-xs font-semibold opacity-70">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: product previews */}
          <div className="relative min-h-[420px] p-6" style={{
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6d28d9 100%)"
          }}>
            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: "radial-gradient(circle at 30% 20%, #f59e0b 0%, transparent 40%), radial-gradient(circle at 70% 80%, #10b981 0%, transparent 35%)"
              }}
            />
            <div className="relative grid h-full content-center gap-4">
              <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm sm:max-w-xs">
                <Logo />
              </div>
              <HeroProductPreviews />
            </div>
          </div>
        </div>
      </section>

      {/* ── Recently Listed ── */}
      <section className="container-shell py-8">
        <SectionHeading
          title="Recently Listed"
          subtitle="Fresh products from students and local vendors around HTU."
          action={
            <Link href="/products" className="btn-ghost text-brand-navy">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
        <RecentlyListed />
      </section>

      {/* ── Trending ── */}
      <section className="container-shell py-8">
        <SectionHeading
          title="Trending Products"
          subtitle="Items getting the most attention this week."
        />
        <TrendingProducts />
      </section>

      {/* ── Categories ── */}
      <section className="container-shell py-8">
        <SectionHeading
          title="Popular Categories"
          subtitle="Browse the things students search for most."
        />
        <CategoriesSection />
      </section>

      {/* ── How it works ── */}
      <section className="container-shell py-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: ShoppingBag,
              title: "List in minutes",
              body: "Add product details, photos, price, and pickup location.",
              color: "bg-indigo-50 text-brand-navy",
              ring: "ring-indigo-100",
            },
            {
              icon: MessageCircle,
              title: "Chat securely",
              body: "Coordinate questions and campus meetups inside the marketplace.",
              color: "bg-amber-50 text-amber-600",
              ring: "ring-amber-100",
            },
            {
              icon: ShieldCheck,
              title: "Build trust",
              body: "Ratings, verified badges, and premium signals help students buy confidently.",
              color: "bg-emerald-50 text-emerald-600",
              ring: "ring-emerald-100",
            },
          ].map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-2xl border border-indigo-100/60 bg-white p-6 shadow-sm shadow-indigo-100/40">
                <div className={`grid h-11 w-11 place-items-center rounded-2xl ring-1 ${step.color} ${step.ring}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-black text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{step.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="container-shell py-8 pb-12">
        <div
          className="overflow-hidden rounded-3xl p-6 text-white shadow-2xl shadow-indigo-500/25 md:p-10"
          style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #4f46e5 50%, #7c3aed 100%)",
          }}
        >
          <div className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage: "radial-gradient(circle at 80% 50%, #f59e0b 0%, transparent 50%)"
            }}
          />
          <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="flex items-center gap-2 text-amber-300">
                <Users className="h-5 w-5" />
                <span className="text-sm font-bold">Trusted by HTU students</span>
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight">
                Ready to turn unused items into campus cash?
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-indigo-200">
                Start free, then boost only when you want extra visibility. No aggressive paywalls,
                just practical growth tools for sellers.
              </p>
            </div>
            <Link
              href="/sell"
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-gold px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-amber-500/30 hover:bg-amber-500 hover:-translate-y-1 transition-all"
            >
              <Zap className="h-5 w-5" />
              Start selling
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
