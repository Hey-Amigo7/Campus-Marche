"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, ShieldCheck, ShoppingBag, Sparkles, Store, Users, Zap } from "lucide-react";
import { CategoryCard } from "@/components/category-card";
import { ProductGrid } from "@/components/product-card";
import { SectionHeading } from "@/components/ui";
import { useProducts, useCategories } from "@/hooks/use-api";
import type { Product } from "@/types";

function EmptySection({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-pink-100/50 bg-white py-14 text-center">
      <Store className="mx-auto h-10 w-10 text-pink-200" />
      <p className="mt-3 text-sm font-bold text-slate-400">{label}</p>
      <Link href="/sell" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-pink hover:underline">
        List something <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function RecentlyListed() {
  const { data: products } = useProducts();
  if (products.length === 0) return <EmptySection label="No listings yet — be the first!" />;
  const display = [...products].sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()).slice(0, 4);
  return <ProductGrid products={display} />;
}

function TrendingProducts() {
  const { data: products } = useProducts();
  if (products.length === 0) return <EmptySection label="No trending products yet." />;
  const display = [...products].sort((a: Product, b: Product) => b.views - a.views).slice(0, 4);
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
        <div
          className="relative overflow-hidden rounded-3xl border border-pink-100/60 shadow-2xl shadow-pink-200/20"
          style={{ background: "linear-gradient(135deg, #fff0f8 0%, #fdf8ff 45%, #f0f8ff 100%)" }}
        >
          {/* Decorative blobs */}
          <div
            className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(249,168,212,0.45), transparent 70%)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(125,211,252,0.38), transparent 70%)" }}
          />
          <div
            className="pointer-events-none absolute right-1/4 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(192,132,252,0.18), transparent 70%)" }}
          />

          <div className="relative mx-auto max-w-3xl px-6 py-14 text-center sm:py-20 sm:px-10">
            <span className="chip chip-pink">
              <Sparkles className="h-3.5 w-3.5" />
              For Students, By Students
            </span>

            <h1 className="mt-6 text-4xl font-black leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem]">
              Buy. Sell.{" "}
              <span className="gradient-text">Connect.</span>
              <br />
              <span className="text-brand-pink">All on Campus.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-slate-500 sm:text-lg">
              A trusted HTU marketplace for gadgets, textbooks, room essentials, notes, fashion,
              and local vendor deals around campus.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/products" className="btn-primary">
                <ShoppingBag className="h-5 w-5" />
                Shop Now
              </Link>
              <Link href="/sell" className="btn-secondary">
                Sell Your Product
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mx-auto mt-9 grid max-w-sm grid-cols-3 gap-3">
              {[
                ["2.8k+", "students", "bg-pink-50 text-pink-600"],
                ["540+", "listings", "bg-sky-50 text-sky-600"],
                ["4.8/5", "trust score", "bg-violet-50 text-violet-600"],
              ].map(([value, label, classes]) => (
                <div key={label} className={`rounded-2xl p-4 ${classes}`}>
                  <p className="text-xl font-black">{value}</p>
                  <p className="mt-0.5 text-xs font-semibold opacity-70">{label}</p>
                </div>
              ))}
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
            <Link href="/products" className="btn-ghost text-brand-pink">
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
              color: "bg-pink-50 text-pink-500",
              ring: "ring-pink-100",
            },
            {
              icon: MessageCircle,
              title: "Chat securely",
              body: "Coordinate questions and campus meetups inside the marketplace.",
              color: "bg-sky-50 text-sky-500",
              ring: "ring-sky-100",
            },
            {
              icon: ShieldCheck,
              title: "Build trust",
              body: "Ratings, verified badges, and premium signals help students buy confidently.",
              color: "bg-violet-50 text-violet-500",
              ring: "ring-violet-100",
            },
          ].map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-2xl border border-pink-100/40 bg-white p-6 shadow-sm shadow-pink-100/20 transition-all hover:-translate-y-1 hover:shadow-md hover:shadow-pink-100/30">
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
          className="relative overflow-hidden rounded-3xl p-6 text-white shadow-2xl shadow-pink-500/20 md:p-10"
          style={{ background: "linear-gradient(135deg, #1a0a2e 0%, #831843 55%, #1e3a8a 100%)" }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #f9a8d4 0%, transparent 55%)" }}
          />
          <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="flex items-center gap-2 text-pink-300">
                <Users className="h-5 w-5" />
                <span className="text-sm font-bold">Trusted by HTU students</span>
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight">
                Ready to turn unused items into campus cash?
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-pink-100">
                Start free, then boost only when you want extra visibility. No aggressive paywalls,
                just practical growth tools for sellers.
              </p>
            </div>
            <Link
              href="/sell"
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-pink px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-pink-500/30 hover:bg-pink-400 hover:-translate-y-1 transition-all"
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
