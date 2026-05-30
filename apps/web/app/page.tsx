"use client";

import Link from "next/link";
import { ShoppingBag, Truck, Shield, Gift, ArrowRight } from "lucide-react";
import { CategoryCard } from "@/components/category-card";
import { ProductCard } from "@/components/product-card";
import { useProducts, useCategories, useSiteStats } from "@/hooks/use-api";
import type { Product } from "@/types";
import {
  FadeUp,
  MotionButton,
  PageEnter,
  ScrollFadeUp,
  ScrollStaggerList,
  SectionHeader,
  StaggerItem,
} from "@/components/motion-primitives";
import { AnimatedArrowRight } from "@/components/animated-icons";
import { ProgressiveBlur } from "@/components/progressive-blur";
import { motion } from "framer-motion";
import { LoopText } from "@/components/skiper-loop";
import { StatsRow } from "@/components/skiper-numbers";
import { CarouselNavigator, useCarousel } from "@/components/watermelon-carousel-nav";

/* ─── Constants ────────────────────────────────────────────── */

const CATEGORY_IMAGES: Record<string, string> = {
  Electronics: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80",
  Textbooks:   "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=600&q=80",
  Clothing:    "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=600&q=80",
  Furniture:   "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80",
  Notes:       "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=600&q=80",
  Sports:      "https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=600&q=80",
  Services:    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80",
  Other:       "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=600&q=80",
};

const MARQUEE_ITEMS = [
  "Electronics", "Textbooks", "Fashion", "Services", "Furniture",
  "Sports", "Notes", "Stationery", "Free listings", "Campus meetup",
  "Escrow protected", "Student verified",
];

const COLLECTION_GRID = [
  {
    slug: "Electronics",
    label: "Gadgets & Tech",
    tagline: "Phones, laptops & accessories",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    wide: true,
  },
  {
    slug: "Clothing",
    label: "Fashion",
    tagline: "Campus fits & style",
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=800&q=80",
    wide: false,
  },
  {
    slug: "Services",
    label: "Student Services",
    tagline: "Tutoring, design & more",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80",
    wide: false,
  },
];


const FEATURES = [
  {
    Icon: ShoppingBag,
    title: "Free to list",
    description: "No platform fees, no commission. List your product or service and keep 100% of what you earn.",
  },
  {
    Icon: Truck,
    title: "Campus meetup",
    description: "Arrange safe exchanges right on HTU campus. No strangers at your door, ever.",
  },
  {
    Icon: Shield,
    title: "Escrow-protected",
    description: "Funds are held safely until you confirm pickup or delivery. Buyers and sellers both protected.",
  },
  {
    Icon: Gift,
    title: "Student verified",
    description: "Only Ho Technical University students and trusted local vendors trade on Campus Marché.",
  },
];

const snap = { type: "spring", stiffness: 360, damping: 24 } as const;

/* ─── Skeleton ────────────────────────────────────────────── */
function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      <div className="h-48 animate-pulse" style={{ background: "var(--surface-raised)" }} />
      <div className="space-y-2.5 p-3">
        <div className="h-3.5 w-3/4 animate-pulse rounded-full" style={{ background: "var(--border)" }} />
        <div className="h-3 w-1/2 animate-pulse rounded-full"   style={{ background: "var(--surface-raised)" }} />
        <div className="h-3 w-2/3 animate-pulse rounded-full"   style={{ background: "var(--surface-raised)" }} />
      </div>
    </div>
  );
}

/* ─── 1. Hero ─────────────────────────────────────────────── */
function Hero() {
  return (
    <section
      className="relative flex flex-col items-center justify-center px-4 py-24 text-center md:py-36"
      style={{ background: "var(--background)", minHeight: "86vh" }}
    >
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(22,163,74,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-3xl">
        {/* Badge */}
        <FadeUp delay={0}>
          <span
            className="badge-glow mb-7 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold"
            style={{
              background:  "var(--green-tint)",
              borderColor: "rgba(22,163,74,0.25)",
              color:       "var(--green-dark)",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--green)" }} />
            HTU Student Marketplace · Ho, Ghana
          </span>
        </FadeUp>

        {/* Heading with loop animation */}
        <FadeUp delay={0.08}>
          <h1
            className="text-5xl font-black leading-[1.04] tracking-[-0.04em] sm:text-6xl lg:text-7xl"
            style={{ color: "var(--on-surface)" }}
          >
            Everything you need
            <br />
            <span style={{ color: "var(--green)" }}>
              <LoopText
                items={["on campus.", "for less.", "right here.", "from students.", "in minutes."]}
                interval={2400}
                className="h-[1.05em]"
              />
            </span>
          </h1>
        </FadeUp>

        <FadeUp delay={0.18}>
          <p
            className="mx-auto mt-5 max-w-lg text-base leading-7 md:text-lg"
            style={{ color: "var(--muted)" }}
          >
            Buy gadgets, textbooks, fashion, and room essentials from verified HTU students.
            No fees. No friction. All on campus.
          </p>
        </FadeUp>

        <FadeUp delay={0.26}>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {/* Primary CTA — Watermelon pill style, near-black */}
            <MotionButton hoverScale={1.04} hoverY={-2} tapScale={0.96}>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-white transition-shadow"
                style={{
                  background:  "var(--navy)",
                  boxShadow:   "0 4px 14px rgba(9,9,11,0.20)",
                }}
              >
                Browse marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </MotionButton>

            {/* Secondary CTA — outlined */}
            <MotionButton hoverScale={1.03} hoverY={-1} tapScale={0.96}>
              <Link
                href="/sell"
                className="inline-flex items-center gap-2 rounded-full border px-7 py-3 text-sm font-semibold transition-all"
                style={{
                  borderColor: "var(--border)",
                  color:       "var(--on-surface)",
                }}
              >
                Start selling free
              </Link>
            </MotionButton>
          </div>
        </FadeUp>

        {/* Trust pills */}
        <FadeUp delay={0.36}>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {["Free to list", "Campus meetup", "Escrow-protected", "Student verified"].map((label) => (
              <span
                key={label}
                className="trust-pill hero-pill inline-flex items-center rounded-full px-3 py-1 text-xs font-medium cursor-default"
              >
                {label}
              </span>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

/* ─── 2. Marquee ticker ───────────────────────────────────── */
function Marquee() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div
      className="overflow-hidden border-y py-3"
      style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}
    >
      <div className="flex marquee-track">
        {items.map((item, i) => (
          <span
            key={i}
            className="mx-6 shrink-0 text-xs font-semibold uppercase tracking-[0.16em] whitespace-nowrap"
            style={{ color: "var(--subtle)" }}
          >
            {item}
            <span className="ml-6" style={{ color: "var(--border)" }}>·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── 3. Category circles ─────────────────────────────────── */
function CategoryCircles() {
  const { data: categoriesData } = useCategories();
  const categories = categoriesData ?? [];
  if (categories.length === 0) return null;

  return (
    <section className="container-shell py-10 overflow-hidden">
      <div className="relative flex items-start gap-6 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
        <ProgressiveBlur position="left"  color="var(--background)" size="40px" blurAmount="3px" />
        <ProgressiveBlur position="right" color="var(--background)" size="40px" blurAmount="3px" />

        {categories.map((cat, i) => (
          <motion.div
            key={cat.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.055, type: "spring", stiffness: 340, damping: 24 }}
            className="shrink-0"
          >
            <Link href={`/products?category=${encodeURIComponent(cat.name)}`}>
              <motion.div
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.95 }}
                transition={snap}
                className="flex flex-col items-center gap-2.5"
              >
                <div
                  className="relative h-[108px] w-[108px] overflow-hidden rounded-full md:h-[124px] md:w-[124px]"
                  style={{
                    border:     "2px solid var(--border)",
                    boxShadow:  "0 2px 12px rgba(0,0,0,0.06)",
                    background: "var(--surface-raised)",
                  }}
                >
                  {CATEGORY_IMAGES[cat.name] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={CATEGORY_IMAGES[cat.name]}
                      alt={cat.name}
                      className="h-full w-full object-cover transition-transform duration-400 hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-3xl">📦</div>
                  )}
                </div>
                <span className="text-center text-xs font-semibold" style={{ color: "var(--on-surface)" }}>
                  {cat.name}
                </span>
                <span className="text-[10px] font-medium" style={{ color: "var(--subtle)" }}>
                  {cat.count}
                </span>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ─── 4. Stats ────────────────────────────────────────────── */
function Stats() {
  const { data: siteStats } = useSiteStats();
  const { data: categories } = useCategories();

  return (
    <section className="container-shell py-4">
      <StatsRow
        stats={[
          { value: siteStats?.users ?? 0,    suffix: (siteStats?.users ?? 0) > 20    ? "+" : "", label: "registered students"  },
          { value: siteStats?.products ?? 0, suffix: (siteStats?.products ?? 0) > 20 ? "+" : "", label: "active listings"      },
          { value: categories?.length ?? 0,  suffix: "",                                          label: "product categories"   },
        ]}
      />
    </section>
  );
}

/* ─── 5. Live listings with carousel nav ─────────────────── */
function LiveListings() {
  const { data: products, isLoading } = useProducts();

  const fresh = [...(products ?? [])]
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

  const ITEMS_PER_PAGE = 8;
  const pages = Math.max(1, Math.ceil(fresh.length / ITEMS_PER_PAGE));
  const { current, go } = useCarousel(pages);
  const paginated = fresh.slice(current * ITEMS_PER_PAGE, (current + 1) * ITEMS_PER_PAGE);

  return (
    <section className="container-shell py-10">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--on-surface)" }}>
            Just listed
          </h2>
          <p className="mt-0.5 text-sm" style={{ color: "var(--muted)" }}>
            Fresh from HTU students and local vendors
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pages > 1 && (
            <CarouselNavigator
              count={pages}
              current={current}
              onChange={go}
              autoDelay={5000}
              theme={{
                bg:       "bg-zinc-900",
                button:   "bg-zinc-800 text-white hover:bg-zinc-700",
                dot:      "bg-zinc-600",
                progress: "bg-white",
              }}
            />
          )}
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-sm font-semibold transition-colors"
            style={{ color: "var(--green)" }}
          >
            See all <AnimatedArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
        </div>
      ) : fresh.length === 0 ? (
        <div
          className="rounded-xl border border-dashed py-20 text-center"
          style={{ borderColor: "rgba(22,163,74,0.25)", background: "var(--green-surface)" }}
        >
          <p className="text-2xl mb-3">🛍️</p>
          <p className="font-semibold mb-4" style={{ color: "var(--muted)" }}>No listings yet</p>
          <Link href="/sell" className="btn-primary">List something first</Link>
        </div>
      ) : (
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          {paginated.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </motion.div>
      )}
    </section>
  );
}

/* ─── 6. Collection editorial grid ───────────────────────── */
function CollectionGrid() {
  const [wide, ...stacked] = COLLECTION_GRID;
  return (
    <section className="container-shell py-10">
      <SectionHeader className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--on-surface)" }}>
          Shop by collection
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Curated categories from HTU students and trusted vendors
        </p>
      </SectionHeader>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:h-[560px]">
        {/* Wide card — 2 cols */}
        <motion.div
          whileHover={{ scale: 1.008 }}
          transition={snap}
          className="relative col-span-1 overflow-hidden rounded-2xl lg:col-span-2"
          style={{ minHeight: 280 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={wide!.image}
            alt={wide!.label}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(9,9,11,0.72) 0%, rgba(9,9,11,0.16) 60%, transparent 100%)" }}
          />
          <div className="absolute bottom-0 left-0 p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55 mb-2">
              {wide!.tagline}
            </p>
            <h3 className="text-3xl font-black text-white mb-4">{wide!.label}</h3>
            <Link
              href={`/products?category=${encodeURIComponent(wide!.slug)}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/12 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/20"
              style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
            >
              Browse now <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.div>

        {/* Stacked column */}
        <div className="flex flex-col gap-3">
          {stacked.map((col) => (
            <motion.div
              key={col.slug}
              whileHover={{ scale: 1.012 }}
              transition={snap}
              className="relative flex-1 overflow-hidden rounded-2xl"
              style={{ minHeight: 140 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={col.image}
                alt={col.label}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-600 hover:scale-[1.04]"
              />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(9,9,11,0.68) 0%, rgba(9,9,11,0.10) 70%, transparent 100%)" }}
              />
              <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-5">
                <div>
                  <p className="text-[11px] font-medium text-white/55 mb-0.5">{col.tagline}</p>
                  <h3 className="text-lg font-black text-white">{col.label}</h3>
                </div>
                <Link
                  href={`/products?category=${encodeURIComponent(col.slug)}`}
                  className="shrink-0 grid h-8 w-8 place-items-center rounded-full text-white transition-all"
                  style={{
                    background:     "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    border:         "1px solid rgba(255,255,255,0.20)",
                  }}
                  aria-label={`Browse ${col.label}`}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 7. Trending ─────────────────────────────────────────── */
function TrendingSection() {
  const { data: products } = useProducts();
  const top = [...(products ?? [])].sort((a: Product, b: Product) => b.views - a.views).slice(0, 5);
  if (top.length === 0) return null;

  return (
    <section className="container-shell py-6">
      <SectionHeader className="mb-5">
        <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--on-surface)" }}>
          Trending this week
        </h2>
      </SectionHeader>
      <ScrollStaggerList className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" staggerDelay={0.07}>
        {top.map((p) => (
          <StaggerItem key={p.id}><ProductCard product={p} compact /></StaggerItem>
        ))}
      </ScrollStaggerList>
    </section>
  );
}


/* ─── 9. Feature cards ────────────────────────────────────── */
function FeatureCards() {
  return (
    <section
      className="container-shell py-16"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <ScrollStaggerList
        className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4"
        staggerDelay={0.09}
        amount={0.08}
      >
        {FEATURES.map(({ Icon, title, description }) => (
          <StaggerItem key={title}>
            <motion.div
              whileHover={{ y: -3 }}
              transition={snap}
              className="flex flex-col"
            >
              <div
                className="mb-4 grid h-12 w-12 place-items-center rounded-xl"
                style={{
                  background:  "var(--green-surface)",
                  border:      "1px solid rgba(22,163,74,0.18)",
                  color:       "var(--green)",
                }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h4 className="mb-2 text-base font-bold" style={{ color: "var(--on-surface)" }}>
                {title}
              </h4>
              <p className="text-sm leading-6" style={{ color: "var(--muted)" }}>
                {description}
              </p>
            </motion.div>
          </StaggerItem>
        ))}
      </ScrollStaggerList>
    </section>
  );
}

/* ─── 10. Editorial split — mission copy ─────────────────── */
function EditorialSplit() {
  return (
    <section
      style={{
        background:  "var(--surface-raised)",
        borderTop:   "1px solid var(--border)",
        borderBottom:"1px solid var(--border)",
      }}
    >
      <div className="container-shell grid grid-cols-1 gap-0 md:grid-cols-2 md:min-h-[440px]">
        {/* Image side */}
        <div className="relative overflow-hidden rounded-none md:rounded-l-2xl" style={{ minHeight: 280 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80"
            alt="Students at HTU"
            className="h-full w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, rgba(22,163,74,0.08) 0%, transparent 60%)" }}
          />
        </div>

        {/* Copy side */}
        <ScrollFadeUp
          className="flex flex-col justify-center px-8 py-12 md:px-12 md:py-16"
          delay={0.1}
        >
          <p
            className="mb-3 text-xs font-bold uppercase tracking-[0.22em]"
            style={{ color: "var(--green)" }}
          >
            Campus Marché
          </p>
          <h2
            className="mb-4 text-3xl font-black leading-tight tracking-tight md:text-4xl"
            style={{ color: "var(--on-surface)" }}
          >
            Trade smart.
            <br />
            Study hard.
          </h2>
          <p className="mb-8 text-sm leading-7" style={{ color: "var(--muted)" }}>
            We believe every student deserves access to affordable campus essentials —
            and every seller deserves a fair deal. No hidden fees. No friction.
            Just your campus, your market.
          </p>
          <div className="flex flex-wrap gap-3">
            <MotionButton hoverScale={1.04} hoverY={-2} tapScale={0.96}>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white"
                style={{ background: "var(--navy)", boxShadow: "0 4px 12px rgba(9,9,11,0.18)" }}
              >
                Browse marketplace <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </MotionButton>
            <MotionButton hoverScale={1.03} hoverY={-1} tapScale={0.96}>
              <Link
                href="/sell"
                className="inline-flex items-center gap-2 rounded-full border px-6 py-2.5 text-sm font-semibold"
                style={{ borderColor: "var(--border)", color: "var(--on-surface)" }}
              >
                Start selling
              </Link>
            </MotionButton>
          </div>
        </ScrollFadeUp>
      </div>
    </section>
  );
}

/* ─── 11. Browse by category grid ────────────────────────── */
function CategoriesGrid() {
  const { data: categoriesData } = useCategories();
  const categories = categoriesData ?? [];
  if (categories.length === 0) return null;

  return (
    <ScrollStaggerList className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" staggerDelay={0.08}>
      {categories.map((category, i) => (
        <StaggerItem key={category.name}>
          <CategoryCard category={category} index={i} />
        </StaggerItem>
      ))}
    </ScrollStaggerList>
  );
}

/* ─── 12. Final CTA ───────────────────────────────────────── */
function FinalCTA() {
  return (
    <section className="container-shell py-20 text-center">
      <ScrollFadeUp delay={0.05}>
        <div
          className="mx-auto max-w-2xl rounded-2xl px-8 py-14"
          style={{ background: "var(--green-surface)", border: "1px solid rgba(22,163,74,0.18)" }}
        >
          <p
            className="mb-2 text-xs font-bold uppercase tracking-[0.20em]"
            style={{ color: "var(--green)" }}
          >
            Ready to trade?
          </p>
          <h2
            className="mb-4 text-3xl font-black tracking-tight"
            style={{ color: "var(--on-surface)" }}
          >
            Join the marketplace today.
          </h2>
          <p className="mb-8 text-sm leading-6" style={{ color: "var(--muted)" }}>
            Connect with thousands of HTU students buying and selling right on campus.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <MotionButton hoverScale={1.05} hoverY={-2} tapScale={0.95}>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-white"
                style={{ background: "var(--green)", boxShadow: "0 4px 14px rgba(22,163,74,0.30)" }}
              >
                Create free account <ArrowRight className="h-4 w-4" />
              </Link>
            </MotionButton>
            <MotionButton hoverScale={1.03} hoverY={-1} tapScale={0.96}>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-full border px-7 py-3 text-sm font-semibold"
                style={{ borderColor: "rgba(22,163,74,0.25)", color: "var(--on-surface)" }}
              >
                Browse as guest
              </Link>
            </MotionButton>
          </div>
        </div>
      </ScrollFadeUp>
    </section>
  );
}

/* ─── Page ────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <PageEnter>
      <Hero />
      <Marquee />
      <CategoryCircles />
      <Stats />
      <LiveListings />
      <CollectionGrid />
      <TrendingSection />
      <EditorialSplit />
      <FeatureCards />

      <section
        className="container-shell py-8 pb-12"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <SectionHeader className="mb-5">
          <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--on-surface)" }}>
            Browse by category
          </h2>
        </SectionHeader>
        <CategoriesGrid />
      </section>

      <FinalCTA />
    </PageEnter>
  );
}
