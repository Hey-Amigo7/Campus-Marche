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
    <div
      className="rounded-2xl py-14 text-center"
      style={{
        border:     "1.5px dashed rgba(127,182,133,0.30)",
        background: "rgba(223,243,227,0.18)",
      }}
    >
      <Store className="mx-auto h-10 w-10" style={{ color: "#7FB685" }} />
      <p className="mt-3 text-sm font-bold" style={{ color: "#94A3B8" }}>{label}</p>
      <Link
        href="/sell"
        className="mt-4 inline-flex items-center gap-1 text-sm font-bold hover:underline"
        style={{ color: "#5A9460" }}
      >
        List something <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function RecentlyListed() {
  const { data: products } = useProducts();
  if (products.length === 0) return <EmptySection label="No listings yet — be the first!" />;
  const display = [...products]
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
    .slice(0, 4);
  return <ProductGrid products={display} />;
}

function TrendingProducts() {
  const { data: products } = useProducts();
  if (products.length === 0) return <EmptySection label="No trending products yet." />;
  const display = [...products]
    .sort((a: Product, b: Product) => b.views - a.views)
    .slice(0, 4);
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
          className="relative overflow-hidden rounded-3xl"
          style={{
            background: "linear-gradient(135deg, #0F172A 0%, #102542 55%, #1a3a2a 100%)",
            boxShadow:  "0 20px 60px rgba(15,23,42,0.35)",
          }}
        >
          {/* Decorative blobs */}
          <div
            className="pointer-events-none absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(127,182,133,0.22), transparent 65%)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-28 -left-28 h-80 w-80 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(198,139,89,0.15), transparent 65%)" }}
          />
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-px w-full -translate-x-1/2"
            style={{ background: "linear-gradient(90deg, transparent, rgba(127,182,133,0.35), transparent)" }}
          />

          <div className="relative mx-auto max-w-3xl px-6 py-16 text-center sm:py-24 sm:px-10">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold"
              style={{
                background: "rgba(127,182,133,0.15)",
                color:      "#A8D4AE",
                border:     "1px solid rgba(127,182,133,0.25)",
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              For Students, By Students
            </span>

            <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.6rem]">
              Buy. Sell.{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #7FB685, #A8D4AE)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Connect.
              </span>
              <br />
              <span style={{ color: "#C68B59" }}>All on Campus.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-lg text-base leading-7 sm:text-lg" style={{ color: "#94A3B8" }}>
              A trusted HTU marketplace for gadgets, textbooks, room essentials, notes, fashion,
              and local vendor deals around campus.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-black text-white transition-all hover:-translate-y-0.5 hover:opacity-90"
                style={{ background: "#7FB685", boxShadow: "0 6px 20px rgba(127,182,133,0.40)" }}
              >
                <ShoppingBag className="h-5 w-5" />
                Shop Now
              </Link>
              <Link
                href="/sell"
                className="inline-flex items-center gap-2 rounded-2xl border px-7 py-3.5 text-sm font-black text-white transition-all hover:border-white/30 hover:-translate-y-0.5"
                style={{
                  border:     "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(12px)",
                }}
              >
                Sell Your Product
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mx-auto mt-10 grid max-w-xs grid-cols-3 gap-3">
              {[
                { value: "2.8k+",  label: "students",   bg: "rgba(127,182,133,0.12)", color: "#A8D4AE"  },
                { value: "540+",   label: "listings",    bg: "rgba(198,139,89,0.12)",  color: "#C68B59"   },
                { value: "4.8/5",  label: "trust score", bg: "rgba(255,255,255,0.07)", color: "#CBD5E1"   },
              ].map(({ value, label, bg, color }) => (
                <div key={label} className="rounded-2xl p-4" style={{ background: bg }}>
                  <p className="text-xl font-black" style={{ color }}>{value}</p>
                  <p className="mt-0.5 text-xs font-semibold" style={{ color: "#64748B" }}>{label}</p>
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
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all hover:-translate-y-0.5"
              style={{ color: "#5A9460" }}
            >
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
        <SectionHeading title="How it works" subtitle="List, chat, and transact safely in three steps." />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon:  ShoppingBag,
              title: "List in minutes",
              body:  "Add product details, photos, price, and pickup location.",
              bg:    "rgba(127,182,133,0.10)",
              color: "#5A9460",
              border:"rgba(127,182,133,0.20)",
            },
            {
              icon:  MessageCircle,
              title: "Chat securely",
              body:  "Coordinate questions and campus meetups inside the marketplace.",
              bg:    "rgba(198,139,89,0.10)",
              color: "#C68B59",
              border:"rgba(198,139,89,0.20)",
            },
            {
              icon:  ShieldCheck,
              title: "Build trust",
              body:  "Ratings, verified badges, and premium signals help students buy confidently.",
              bg:    "rgba(15,23,42,0.06)",
              color: "#0F172A",
              border:"rgba(15,23,42,0.12)",
            },
          ].map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="rounded-2xl p-6 transition-all hover:-translate-y-1"
                style={{
                  background:    "rgba(255,255,255,0.80)",
                  backdropFilter:"blur(18px)",
                  border:        `1px solid ${step.border}`,
                  boxShadow:     "0 2px 12px rgba(15,23,42,0.06)",
                }}
              >
                <div
                  className="grid h-11 w-11 place-items-center rounded-2xl"
                  style={{ background: step.bg, color: step.color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-black" style={{ color: "#1E293B" }}>{step.title}</h3>
                <p className="mt-2 text-sm leading-6" style={{ color: "#64748B" }}>{step.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="container-shell py-8 pb-12">
        <div
          className="relative overflow-hidden rounded-3xl p-6 text-white md:p-10"
          style={{
            background: "linear-gradient(135deg, #0F172A 0%, #102542 50%, #1a3a2a 100%)",
            boxShadow:  "0 20px 60px rgba(15,23,42,0.30)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{ backgroundImage: "radial-gradient(circle at 75% 50%, rgba(127,182,133,0.25) 0%, transparent 55%)" }}
          />
          <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="flex items-center gap-2" style={{ color: "#A8D4AE" }}>
                <Users className="h-5 w-5" />
                <span className="text-sm font-bold">Trusted by HTU students</span>
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight">
                Ready to turn unused items into campus cash?
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: "#94A3B8" }}>
                Start free, then boost only when you want extra visibility. No aggressive paywalls,
                just practical growth tools for sellers.
              </p>
            </div>
            <Link
              href="/sell"
              className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-black text-white transition-all hover:-translate-y-1 hover:opacity-90"
              style={{ background: "#7FB685", boxShadow: "0 6px 20px rgba(127,182,133,0.35)" }}
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
