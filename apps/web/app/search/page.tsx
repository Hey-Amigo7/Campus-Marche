"use client";

import { Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { EmptyState, LoadingSkeleton, SectionHeading } from "@/components/ui";
import { ProductGrid } from "@/components/product-card";
import { useCategories, useSearchProducts } from "@/hooks/use-api";

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [committed, setCommitted] = useState(initialQuery);

  const { data: categoriesData } = useCategories();
  const categories = categoriesData ?? [];
  const { data: results, isLoading } = useSearchProducts(committed);

  function applyChip(value: string) {
    setQuery(value);
    setCommitted(value);
  }

  function handleChange(value: string) {
    setQuery(value);
    if (!value) setCommitted("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") setCommitted(query);
  }

  return (
    <div className="container-shell py-8 md:py-10">
      <SectionHeading
        title="Search Campus Marche"
        subtitle="Search listings by title, category, seller keywords, or tags."
      />
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search for laptops, notes, hoodies..."
            className="min-w-0 flex-1 py-4 text-sm font-semibold outline-none"
          />
          {query ? (
            <button
              onClick={() => { setQuery(""); setCommitted(""); }}
              className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.slice(0, 6).map((category) => (
            <button
              key={category.name}
              onClick={() => applyChip(category.name)}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-brand-green hover:text-brand-green"
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <LoadingSkeleton />
        ) : !committed ? (
          <p className="text-center text-sm text-slate-500">
            Type a keyword and press Enter, or pick a category above.
          </p>
        ) : results.length ? (
          <>
            <p className="mb-4 text-sm font-bold text-slate-500">
              {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{committed}&rdquo;
            </p>
            <ProductGrid products={results} />
          </>
        ) : (
          <EmptyState
            title="No results found"
            description="Try another keyword, category, or a shorter search phrase."
          />
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container-shell py-10"><LoadingSkeleton /></div>}>
      <SearchContent />
    </Suspense>
  );
}
