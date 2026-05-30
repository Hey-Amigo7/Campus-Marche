"use client";

import { MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ProductGrid } from "@/components/product-card";
import { useCategories, useLocations, useProducts } from "@/hooks/use-api";
import { formatCurrency } from "@/lib/format";

const CATEGORY_ICONS: Record<string, string> = {
  Electronics: "💻", Textbooks: "📚", Clothing: "👕", Furniture: "🪑",
  Notes: "📝", Sports: "⚽", Stationery: "✏️", Services: "🎯", Other: "📦",
};

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "newest",      label: "Newest"      },
  { value: "price-low",   label: "Price ↑"     },
  { value: "price-high",  label: "Price ↓"     },
];

const snap = { type: "spring", stiffness: 340, damping: 24 } as const;

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query,     setQuery]     = useState(searchParams.get("q")        ?? "");
  const [category,  setCategory]  = useState(searchParams.get("category") ?? "");
  const [location,  setLocation]  = useState("");
  const [sort,      setSort]      = useState("recommended");
  const [verified,  setVerified]  = useState(false);
  const [maxPrice,  setMaxPrice]  = useState(5000);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: products = [], isLoading } = useProducts();
  const { data: categoriesData }           = useCategories();
  const { data: locationsData }            = useLocations();

  const categories = categoriesData ?? [];
  const locations  = locationsData  ?? [];

  const activeFiltersCount = [location !== "", verified, maxPrice < 5000].filter(Boolean).length;

  const filtered = useMemo(() => {
    return [...products]
      .filter((p) => {
        const q = query.trim().toLowerCase();
        const matchesQuery    = !q || p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
        const matchesCategory = !category || p.category === category;
        const matchesLocation = !location  || p.location === location;
        const matchesVerified = !verified  || p.seller?.verified;
        const matchesMax      = p.price <= maxPrice;
        return matchesQuery && matchesCategory && matchesLocation && matchesVerified && matchesMax;
      })
      .sort((a, b) => {
        if (sort === "price-low")  return a.price - b.price;
        if (sort === "price-high") return b.price - a.price;
        if (sort === "newest")     return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
        return Number(b.boosted) - Number(a.boosted) || Number(b.featured) - Number(a.featured) || b.views - a.views;
      });
  }, [products, query, category, location, verified, maxPrice, sort]);

  function clearAllFilters() {
    setLocation("");
    setVerified(false);
    setMaxPrice(5000);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      {/* ── Dark editorial header ── */}
      <div
        className="relative overflow-hidden"
        style={{ background: "var(--shop-header-bg)" }}
      >
        {/* Glows */}
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(127,182,133,0.10) 0%, transparent 65%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 h-[380px] w-[380px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(198,139,89,0.07) 0%, transparent 65%)" }}
        />

        <div className="container-shell relative z-10 pb-6 pt-10">
          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold"
              style={{ background: "rgba(127,182,133,0.10)", border: "1px solid rgba(127,182,133,0.20)", color: "#7FB685" }}>
              {products.length > 0 ? `${products.length} listings available` : "Browse the marketplace"}
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl" style={{ color: "#ffffff" }}>
              Explore the Marketplace
            </h1>
            <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.40)" }}>
              Find what you need from fellow students
            </p>
          </motion.div>

          {/* Search + controls row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 flex gap-2.5"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.30)" }} />
              <input
                type="text"
                placeholder="Search listings…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-2xl py-3 pl-10 pr-4 text-sm font-semibold outline-none transition-all placeholder:text-[rgba(255,255,255,0.22)]"
                style={{
                  background:  "rgba(255,255,255,0.06)",
                  border:      "1px solid rgba(255,255,255,0.09)",
                  color:       "#fff",
                  caretColor:  "#7FB685",
                }}
                onFocus={(e)  => { e.currentTarget.style.borderColor = "rgba(127,182,133,0.45)"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                onBlur={(e)   => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              />
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="relative inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all hover:-translate-y-px"
              style={{
                background: filtersOpen ? "rgba(127,182,133,0.18)" : "rgba(255,255,255,0.06)",
                color:      filtersOpen ? "#7FB685"               : "rgba(255,255,255,0.60)",
                border:     filtersOpen ? "1px solid rgba(127,182,133,0.35)" : "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white"
                  style={{ background: "#7FB685" }}>
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="hidden rounded-2xl px-4 py-3 text-sm font-bold outline-none sm:block"
              style={{
                background: "rgba(255,255,255,0.06)",
                border:     "1px solid rgba(255,255,255,0.09)",
                color:      "rgba(255,255,255,0.70)",
              }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </motion.div>

          {/* ── Category pills ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.18 }}
            className="mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
          >
            <button
              type="button"
              onClick={() => setCategory("")}
              className="inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all hover:-translate-y-px"
              style={{
                background: !category ? "rgba(127,182,133,0.18)" : "rgba(255,255,255,0.05)",
                color:      !category ? "#7FB685"               : "rgba(255,255,255,0.45)",
                border:     !category ? "1px solid rgba(127,182,133,0.35)" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              All
              <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black"
                style={{ background: !category ? "rgba(127,182,133,0.20)" : "rgba(255,255,255,0.08)", color: !category ? "#7FB685" : "rgba(255,255,255,0.40)" }}>
                {products.length}
              </span>
            </button>

            {categories.map((cat) => {
              const active = category === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setCategory(active ? "" : cat.name)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all hover:-translate-y-px"
                  style={{
                    background: active ? "rgba(127,182,133,0.18)" : "rgba(255,255,255,0.05)",
                    color:      active ? "#7FB685"               : "rgba(255,255,255,0.45)",
                    border:     active ? "1px solid rgba(127,182,133,0.35)" : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <span>{CATEGORY_ICONS[cat.name] ?? "📦"}</span>
                  {cat.name}
                  <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black"
                    style={{ background: active ? "rgba(127,182,133,0.20)" : "rgba(255,255,255,0.08)", color: active ? "#7FB685" : "rgba(255,255,255,0.35)" }}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </motion.div>

          {/* ── Collapsible filter panel ── */}
          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={snap}
                className="overflow-hidden"
              >
                <div
                  className="rounded-2xl p-5"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Location */}
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                        Location
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setLocation("")}
                          className="rounded-xl px-3 py-1.5 text-xs font-bold transition-all"
                          style={{
                            background: !location ? "rgba(127,182,133,0.18)" : "rgba(255,255,255,0.05)",
                            color:      !location ? "#7FB685"               : "rgba(255,255,255,0.50)",
                            border:     !location ? "1px solid rgba(127,182,133,0.30)" : "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          All
                        </button>
                        {locations.slice(0, 8).map((l) => (
                          <button
                            type="button"
                            key={l.location}
                            onClick={() => setLocation(location === l.location ? "" : l.location)}
                            className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all"
                            style={{
                              background: location === l.location ? "rgba(127,182,133,0.18)" : "rgba(255,255,255,0.05)",
                              color:      location === l.location ? "#7FB685"               : "rgba(255,255,255,0.50)",
                              border:     location === l.location ? "1px solid rgba(127,182,133,0.30)" : "1px solid rgba(255,255,255,0.08)",
                            }}
                          >
                            <MapPin className="h-2.5 w-2.5" />
                            {l.location}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Price */}
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                        Max price — <span className="text-white">{formatCurrency(maxPrice)}</span>
                      </label>
                      <input
                        type="range"
                        min="30"
                        max="5000"
                        step="50"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(Number(e.target.value))}
                        className="w-full accent-green-500"
                      />
                      <div className="mt-1 flex justify-between text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.25)" }}>
                        <span>GHS 30</span><span>GHS 5,000</span>
                      </div>
                    </div>

                    {/* Options */}
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                        Options
                      </label>
                      <label
                        className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      >
                        <button
                          type="button"
                          onClick={() => setVerified(!verified)}
                          className="relative h-5 w-9 rounded-full transition-colors"
                          style={{ background: verified ? "#7FB685" : "rgba(255,255,255,0.15)" }}
                        >
                          <div
                            className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                            style={{ transform: verified ? "translateX(1.1rem)" : "translateX(0.125rem)" }}
                          />
                        </button>
                        <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.60)" }}>
                          Verified sellers only
                        </span>
                      </label>

                      {/* Mobile sort */}
                      <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className="mt-2 w-full rounded-xl px-3 py-2 text-sm font-bold outline-none sm:hidden"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.70)" }}
                      >
                        {SORT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold transition-opacity hover:opacity-70"
                      style={{ color: "#C68B59" }}
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear all filters
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Results area ── */}
      <div className="container-shell py-8">
        {/* Active filter chips */}
        {(category || location || query) && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: "var(--on-surface-muted)" }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
            {query && <Chip label={`"${query}"`} onRemove={() => setQuery("")} />}
            {category && <Chip label={category} onRemove={() => setCategory("")} />}
            {location && <Chip label={location} onRemove={() => setLocation("")} />}
          </div>
        )}

        {isLoading ? (
          <LoadingGrid />
        ) : filtered.length > 0 ? (
          <ProductGrid products={filtered} />
        ) : (
          <EmptyResults onClear={() => { setQuery(""); setCategory(""); clearAllFilters(); }} />
        )}
      </div>
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
      style={{ background: "rgba(127,182,133,0.10)", color: "#7FB685", border: "1px solid rgba(127,182,133,0.22)" }}
    >
      {label}
      <button type="button" onClick={onRemove} className="hover:opacity-70">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl"
          style={{ background: "var(--surface)", border: "1px solid var(--surface-border)" }}>
          <div className="h-48 animate-pulse rounded-t-2xl"
            style={{ background: "var(--surface-raised)" }} />
          <div className="space-y-2 p-3">
            <div className="h-3.5 w-3/4 animate-pulse rounded-full" style={{ background: "var(--surface-border)" }} />
            <div className="h-3 w-1/2 animate-pulse rounded-full" style={{ background: "var(--surface-raised)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyResults({ onClear }: { onClear: () => void }) {
  return (
    <div
      className="rounded-3xl border border-dashed py-24 text-center"
      style={{ borderColor: "rgba(127,182,133,0.18)", background: "rgba(127,182,133,0.03)" }}
    >
      <p className="text-4xl">🔍</p>
      <p className="mt-5 text-xl font-black" style={{ color: "var(--on-surface)" }}>Nothing found</p>
      <p className="mt-2 text-sm" style={{ color: "var(--on-surface-muted)" }}>
        Try different keywords or clear your filters
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-6 inline-flex items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-black text-white transition-all hover:-translate-y-px"
        style={{ background: "linear-gradient(135deg, #7FB685 0%, #5A9460 100%)", boxShadow: "0 6px 20px rgba(127,182,133,0.25)" }}
      >
        Clear all
      </button>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--background)" }}>
        <div className="container-shell py-10">
          <div className="h-10 w-64 animate-pulse rounded-2xl" style={{ background: "var(--surface)" }} />
          <div className="mt-3 h-5 w-48 animate-pulse rounded-xl" style={{ background: "var(--surface-raised)" }} />
        </div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
