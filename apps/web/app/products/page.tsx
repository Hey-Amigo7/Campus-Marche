"use client";

import { MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ProductGrid } from "@/components/product-card";
import { useCategories, useLocations, useProducts } from "@/hooks/use-api";
import { formatCurrency } from "@/lib/format";

const CATEGORY_ICONS: Record<string, string> = {
  Electronics: "💻", Textbooks: "📚", Clothing: "👕", Furniture: "🪑",
  Notes: "📝", Sports: "⚽", Stationery: "✏️", Services: "🎯", Other: "📦",
};

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "price-low", label: "Price: low to high" },
  { value: "price-high", label: "Price: high to low" },
];

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [location, setLocation] = useState("");
  const [sort, setSort] = useState("recommended");
  const [verified, setVerified] = useState(false);
  const [maxPrice, setMaxPrice] = useState(5000);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: products = [], isLoading } = useProducts();
  const { data: categoriesData } = useCategories();
  const { data: locationsData } = useLocations();

  const categories = categoriesData ?? [];
  const locations = locationsData ?? [];

  const activeFiltersCount = [
    location !== "",
    verified,
    maxPrice < 5000,
  ].filter(Boolean).length;

  const filtered = useMemo(() => {
    return [...products]
      .filter((p) => {
        const q = query.trim().toLowerCase();
        const matchesQuery = !q || p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
        const matchesCategory = !category || p.category === category;
        const matchesLocation = !location || p.location === location;
        const matchesVerified = !verified || p.seller?.verified;
        const matchesMax = p.price <= maxPrice;
        return matchesQuery && matchesCategory && matchesLocation && matchesVerified && matchesMax;
      })
      .sort((a, b) => {
        if (sort === "price-low") return a.price - b.price;
        if (sort === "price-high") return b.price - a.price;
        if (sort === "newest") return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
        return Number(b.boosted) - Number(a.boosted) || Number(b.featured) - Number(a.featured) || b.views - a.views;
      });
  }, [products, query, category, location, verified, maxPrice, sort]);

  function clearAllFilters() {
    setLocation("");
    setVerified(false);
    setMaxPrice(5000);
  }

  return (
    <div>
      {/* ── Search bar ── */}
      <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(226,232,240,0.60)" }}>
        <div className="container-shell py-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#94A3B8" }} />
              <input
                type="text"
                placeholder="Search listings…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-2xl py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:ring-2"
                style={{
                  background: "rgba(248,245,239,0.80)",
                  border: "1px solid rgba(226,232,240,0.70)",
                  color: "#1E293B",
                }}
              />
            </div>
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="relative inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all hover:-translate-y-0.5"
              style={{
                background: filtersOpen ? "#0F172A" : "rgba(255,255,255,0.90)",
                color: filtersOpen ? "#fff" : "#1E293B",
                border: filtersOpen ? "none" : "1px solid rgba(226,232,240,0.70)",
                boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
              }}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black"
                  style={{ background: "#7FB685", color: "#fff" }}>
                  {activeFiltersCount}
                </span>
              )}
            </button>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="hidden rounded-2xl px-4 py-3 text-sm font-bold outline-none sm:block"
              style={{
                background: "rgba(255,255,255,0.90)",
                border: "1px solid rgba(226,232,240,0.70)",
                color: "#1E293B",
              }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* ── Collapsible filter panel ── */}
          {filtersOpen && (
            <div className="mt-3 overflow-hidden rounded-2xl p-4"
              style={{ background: "rgba(248,245,239,0.80)", border: "1px solid rgba(226,232,240,0.70)" }}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Location filter */}
                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-wide" style={{ color: "#64748B" }}>Location</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setLocation("")}
                      className="rounded-xl px-3 py-1.5 text-xs font-bold transition-all"
                      style={{
                        background: !location ? "#0F172A" : "rgba(255,255,255,0.90)",
                        color: !location ? "#fff" : "#475569",
                        border: !location ? "none" : "1px solid rgba(226,232,240,0.80)",
                      }}
                    >
                      All
                    </button>
                    {locations.slice(0, 8).map((l) => (
                      <button
                        key={l.location}
                        onClick={() => setLocation(location === l.location ? "" : l.location)}
                        className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all"
                        style={{
                          background: location === l.location ? "#0F172A" : "rgba(255,255,255,0.90)",
                          color: location === l.location ? "#fff" : "#475569",
                          border: location === l.location ? "none" : "1px solid rgba(226,232,240,0.80)",
                        }}
                      >
                        <MapPin className="h-2.5 w-2.5" />
                        {l.location}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price range */}
                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-wide" style={{ color: "#64748B" }}>
                    Max price — <span style={{ color: "#1E293B" }}>{formatCurrency(maxPrice)}</span>
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="5000"
                    step="50"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-green-600"
                  />
                  <div className="mt-1 flex justify-between text-[10px] font-semibold" style={{ color: "#94A3B8" }}>
                    <span>GHS 30</span>
                    <span>GHS 5,000</span>
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex flex-col gap-2">
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-wide" style={{ color: "#64748B" }}>Options</label>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2"
                    style={{ background: "rgba(255,255,255,0.90)", border: "1px solid rgba(226,232,240,0.80)" }}>
                    <div
                      onClick={() => setVerified(!verified)}
                      className="relative h-5 w-9 rounded-full transition-colors"
                      style={{ background: verified ? "#7FB685" : "#CBD5E1" }}
                    >
                      <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                        style={{ transform: verified ? "translateX(1.1rem)" : "translateX(0.125rem)" }} />
                    </div>
                    <span className="text-xs font-bold" style={{ color: "#475569" }}>Verified sellers only</span>
                  </label>
                </div>

                {/* Sort (mobile) */}
                <div className="sm:hidden">
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-wide" style={{ color: "#64748B" }}>Sort by</label>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 text-sm font-bold outline-none"
                    style={{ background: "rgba(255,255,255,0.90)", border: "1px solid rgba(226,232,240,0.80)", color: "#1E293B" }}
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <button onClick={clearAllFilters}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold transition-opacity hover:opacity-70"
                  style={{ color: "#C68B59" }}>
                  <X className="h-3.5 w-3.5" />
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="container-shell py-6">
        {/* ── Category pills (Airbnb-style) ── */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setCategory("")}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5"
            style={{
              background: !category ? "#0F172A" : "rgba(255,255,255,0.88)",
              color: !category ? "#fff" : "#1E293B",
              border: !category ? "none" : "1px solid rgba(226,232,240,0.70)",
              backdropFilter: "blur(12px)",
            }}
          >
            All
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black"
              style={{ background: !category ? "rgba(255,255,255,0.15)" : "rgba(127,182,133,0.15)", color: !category ? "#fff" : "#5A9460" }}>
              {products.length}
            </span>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setCategory(category === cat.name ? "" : cat.name)}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5"
              style={{
                background: category === cat.name ? "#0F172A" : "rgba(255,255,255,0.88)",
                color: category === cat.name ? "#fff" : "#1E293B",
                border: category === cat.name ? "none" : "1px solid rgba(226,232,240,0.70)",
                backdropFilter: "blur(12px)",
              }}
            >
              <span>{CATEGORY_ICONS[cat.name] ?? "📦"}</span>
              {cat.name}
              <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black"
                style={{ background: category === cat.name ? "rgba(255,255,255,0.15)" : "rgba(127,182,133,0.15)", color: category === cat.name ? "#fff" : "#5A9460" }}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Active filters summary ── */}
        {(category || location || query) && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: "#64748B" }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
            {query && (
              <Chip label={`"${query}"`} onRemove={() => setQuery("")} />
            )}
            {category && (
              <Chip label={category} onRemove={() => setCategory("")} />
            )}
            {location && (
              <Chip label={location} onRemove={() => setLocation("")} />
            )}
          </div>
        )}

        {/* ── Grid ── */}
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
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
      style={{ background: "rgba(127,182,133,0.12)", color: "#5A9460", border: "1px solid rgba(127,182,133,0.25)" }}>
      {label}
      <button onClick={onRemove} className="hover:opacity-70">
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
          style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(226,232,240,0.60)" }}>
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

function EmptyResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed py-20 text-center"
      style={{ borderColor: "rgba(127,182,133,0.30)", background: "rgba(223,243,227,0.12)" }}>
      <p className="text-3xl">🔍</p>
      <p className="mt-4 text-lg font-black" style={{ color: "#1E293B" }}>Nothing found</p>
      <p className="mt-2 text-sm" style={{ color: "#64748B" }}>Try different keywords or clear your filters</p>
      <button onClick={onClear}
        className="mt-5 inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black text-white transition-all hover:-translate-y-0.5"
        style={{ background: "#7FB685", boxShadow: "0 6px 20px rgba(127,182,133,0.30)" }}>
        Clear all
      </button>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="container-shell py-10">
        <div className="h-12 w-full animate-pulse rounded-2xl" style={{ background: "rgba(226,232,240,0.40)" }} />
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
