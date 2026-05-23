"use client";

import { Filter, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState, LoadingSkeleton, SectionHeading } from "@/components/ui";
import { ProductGrid } from "@/components/product-card";
import { useCategories, useProducts } from "@/hooks/use-api";

function FilterPanel({
  category,
  setCategory,
  verified,
  setVerified,
  featured,
  setFeatured,
  maxPrice,
  setMaxPrice,
  categoryList,
}: {
  category: string;
  setCategory: (value: string) => void;
  verified: boolean;
  setVerified: (value: boolean) => void;
  featured: boolean;
  setFeatured: (value: boolean) => void;
  maxPrice: number;
  setMaxPrice: (value: number) => void;
  categoryList: { name: string }[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-black text-slate-950">Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-shell mt-2">
          <option value="">All categories</option>
          {categoryList.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-black text-slate-950">Max price</label>
        <input
          type="range"
          min="30"
          max="5000"
          step="50"
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="mt-3 w-full accent-green-600"
        />
        <p className="mt-2 text-sm font-bold text-brand-navy">Up to GHS {maxPrice.toLocaleString()}</p>
      </div>
      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 text-sm font-bold text-slate-700">
        <input
          type="checkbox"
          checked={verified}
          onChange={(e) => setVerified(e.target.checked)}
          className="h-4 w-4 accent-green-600"
        />
        Verified sellers only
      </label>
      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 text-sm font-bold text-slate-700">
        <input
          type="checkbox"
          checked={featured}
          onChange={(e) => setFeatured(e.target.checked)}
          className="h-4 w-4 accent-green-600"
        />
        Featured only
      </label>
      <div>
        <label className="text-sm font-black text-slate-950">Location</label>
        <div className="mt-2 grid gap-2">
          {["HTU Main Gate", "SRC Cafeteria", "Hostel", "Engineering Block"].map((location) => (
            <span key={location} className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
              {location}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("recommended");
  const [verified, setVerified] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [maxPrice, setMaxPrice] = useState(5000);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: products = [], isLoading } = useProducts();
  const { data: categoriesData } = useCategories();
  const categoryList = categoriesData ?? [];

  const filtered = useMemo(() => {
    return [...products]
      .filter((product) => {
        const matchesCategory = !category || product.category === category;
        const matchesVerified = !verified || product.seller?.verified;
        const matchesFeatured = !featured || product.featured;
        const matchesMax = !maxPrice || product.price <= maxPrice;
        return matchesCategory && matchesVerified && matchesFeatured && matchesMax;
      })
      .sort((a, b) => {
        if (sort === "price-low") return a.price - b.price;
        if (sort === "price-high") return b.price - a.price;
        if (sort === "newest") {
          return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
        }
        return Number(b.boosted) - Number(a.boosted) || Number(b.featured) - Number(a.featured) || b.views - a.views;
      });
  }, [category, featured, maxPrice, products, sort, verified]);

  return (
    <div className="container-shell py-8 md:py-10">
      <SectionHeading
        title="Recommended for you"
        subtitle="Featured and boosted listings appear higher while every student can still browse and sell freely."
        action={
          <div className="flex gap-2">
            <button onClick={() => setDrawerOpen(true)} className="btn-secondary lg:hidden">
              <Filter className="h-4 w-4" />
              Filters
            </button>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-shell w-48">
              <option value="recommended">Recommended</option>
              <option value="newest">Newest</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
            </select>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="hidden rounded-2xl p-5 lg:block" style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(18px)", border: "1px solid rgba(226,232,240,0.70)", boxShadow: "0 2px 12px rgba(15,23,42,0.07)" }}>
          <div className="mb-5 flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-brand-green" />
            <h2 className="font-black text-slate-950">Filters</h2>
          </div>
          <FilterPanel
            category={category}
            setCategory={setCategory}
            verified={verified}
            setVerified={setVerified}
            featured={featured}
            setFeatured={setFeatured}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            categoryList={categoryList}
          />
        </aside>
        <div>
          {isLoading ? (
            <LoadingSkeleton />
          ) : filtered.length ? (
            <ProductGrid products={filtered} />
          ) : (
            <EmptyState
              title="No listings match those filters"
              description="Try widening the price range or clearing the featured and verified filters."
            />
          )}
        </div>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden">
          <div className="ml-auto h-full w-[88%] max-w-sm overflow-y-auto bg-white p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-black">Filters</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-100"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <FilterPanel
              category={category}
              setCategory={setCategory}
              verified={verified}
              setVerified={setVerified}
              featured={featured}
              setFeatured={setFeatured}
              maxPrice={maxPrice}
              setMaxPrice={setMaxPrice}
              categoryList={categoryList}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
