"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArrowLeft, Eye, Loader2, Package, Plus, RefreshCw, Tag } from "lucide-react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { api } from "@/lib/api";
import { useMyListings } from "@/hooks/use-api";
import { AuthGate } from "@/components/auth-gate";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import { useToast } from "@/providers/toast-provider";
import type { Product } from "@/types";

const CATEGORY_ICONS: Record<string, string> = {
  Electronics: "💻", Textbooks: "📚", Clothing: "👕", Furniture: "🪑",
  Notes: "📝", Sports: "⚽", Stationery: "✏️", Services: "🎯", Other: "📦",
};

function StatusBadge({ product }: { product: Product & { active?: boolean; soldAt?: string | null } }) {
  const soldAt = (product as Product & { soldAt?: string | null }).soldAt;
  if (soldAt) return (
    <span className="rounded-full px-2.5 py-1 text-[10px] font-black"
      style={{ background: "rgba(148,163,184,0.15)", color: "#64748B" }}>Sold</span>
  );
  if (product.active === false) return (
    <span className="rounded-full px-2.5 py-1 text-[10px] font-black"
      style={{ background: "rgba(239,68,68,0.10)", color: "#EF4444" }}>Archived</span>
  );
  if (product.featured) return (
    <span className="rounded-full px-2.5 py-1 text-[10px] font-black"
      style={{ background: "rgba(198,139,89,0.15)", color: "#C68B59" }}>Featured</span>
  );
  return (
    <span className="rounded-full px-2.5 py-1 text-[10px] font-black"
      style={{ background: "rgba(127,182,133,0.15)", color: "#5A9460" }}>Active</span>
  );
}

function ListingCard({ product, onAction }: { product: Product & { active?: boolean; soldAt?: string | null }; onAction: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const soldAt = (product as Product & { soldAt?: string | null }).soldAt;
  const isActive = product.active !== false && !soldAt;
  const isArchived = product.active === false && !soldAt;

  async function action(type: "sold" | "archive" | "restore") {
    setLoading(type);
    try {
      if (type === "sold") await api.markSold(product.id);
      else if (type === "archive") await api.archiveListing(product.id);
      else await api.restoreListing(product.id);
      toast(type === "sold" ? "Marked as sold." : type === "archive" ? "Listing archived." : "Listing restored.");
      onAction();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl transition-all hover:-translate-y-0.5"
      style={{ background: "rgba(255,255,255,0.90)", border: "1px solid rgba(226,232,240,0.65)", boxShadow: "0 2px 14px rgba(15,23,42,0.06)" }}>
      {/* Image */}
      <div className="relative h-40 w-full overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl"
            style={{ background: "linear-gradient(135deg, #F0F7F1, #F8F5EF)" }}>
            {CATEGORY_ICONS[product.category] ?? "📦"}
          </div>
        )}
        <div className="absolute left-2 top-2">
          <StatusBadge product={product} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex items-end p-2 pt-8"
          style={{ background: "linear-gradient(to top, rgba(15,23,42,0.55) 0%, transparent 100%)" }}>
          <span className="text-sm font-black text-white">{formatCurrency(product.price)}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        <h3 className="line-clamp-1 text-sm font-bold" style={{ color: "#1E293B" }}>{product.title}</h3>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs" style={{ color: "#94A3B8" }}>
            <Eye className="mr-0.5 inline h-3 w-3" />{product.views} views · {formatRelativeDate(product.postedAt)}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-3 flex gap-1.5 flex-wrap">
          <Link href={`/products/${product.id}`}
            className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all hover:-translate-y-0.5"
            style={{ background: "rgba(15,23,42,0.07)", color: "#1E293B" }}>
            View
          </Link>

          {isActive && (
            <>
              <button onClick={() => action("sold")} disabled={loading === "sold"}
                className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all hover:-translate-y-0.5"
                style={{ background: "rgba(127,182,133,0.15)", color: "#5A9460" }}>
                {loading === "sold" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tag className="h-3 w-3" />}
                Mark sold
              </button>
              <button onClick={() => action("archive")} disabled={loading === "archive"}
                className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all hover:-translate-y-0.5"
                style={{ background: "rgba(239,68,68,0.10)", color: "#EF4444" }}>
                {loading === "archive" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Archive className="h-3 w-3" />}
                Archive
              </button>
            </>
          )}

          {isArchived && (
            <button onClick={() => action("restore")} disabled={loading === "restore"}
              className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all hover:-translate-y-0.5"
              style={{ background: "rgba(127,182,133,0.15)", color: "#5A9460" }}>
              {loading === "restore" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Restore
            </button>
          )}

          {!!soldAt && (
            <button onClick={() => action("restore")} disabled={loading === "restore"}
              className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all hover:-translate-y-0.5"
              style={{ background: "rgba(127,182,133,0.15)", color: "#5A9460" }}>
              {loading === "restore" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Relist
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyListingsPage() {
  return (
    <AuthGate>
      <ListingsContent />
    </AuthGate>
  );
}

function ListingsContent() {
  const router = useRouter();
  const { data: listings = [], isLoading, mutate } = useMyListings();

  const active = listings.filter((p) => p.active !== false && !(p as Product & { soldAt?: string | null }).soldAt);
  const archived = listings.filter((p) => p.active === false && !(p as Product & { soldAt?: string | null }).soldAt);
  const sold = listings.filter((p) => !!(p as Product & { soldAt?: string | null }).soldAt);

  return (
    <div className="container-shell py-8 md:py-10">
      <div className="mb-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="grid h-9 w-9 place-items-center rounded-xl transition-colors hover:bg-slate-100"
            style={{ color: "#64748B" }}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black" style={{ color: "#1E293B" }}>My listings</h1>
            <p className="text-sm" style={{ color: "#64748B" }}>{listings.length} total · {active.length} active</p>
          </div>
        </div>
        <Link href="/sell"
          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black text-white transition-all hover:-translate-y-0.5"
          style={{ background: "#7FB685", boxShadow: "0 4px 14px rgba(127,182,133,0.30)" }}>
          <Plus className="h-4 w-4" /> New listing
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl" style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(226,232,240,0.60)" }}>
              <div className="h-40 animate-pulse" style={{ background: "linear-gradient(135deg, #F0F7F1, #F8F5EF)" }} />
              <div className="space-y-2 p-3">
                <div className="h-3.5 w-3/4 animate-pulse rounded-full" style={{ background: "#F0F7F1" }} />
                <div className="h-3 w-1/2 animate-pulse rounded-full" style={{ background: "#F8F5EF" }} />
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-3xl border border-dashed py-20 text-center"
          style={{ borderColor: "rgba(127,182,133,0.30)", background: "rgba(223,243,227,0.12)" }}>
          <Package className="mx-auto h-10 w-10" style={{ color: "#D1FAE5" }} />
          <p className="mt-4 text-lg font-black" style={{ color: "#1E293B" }}>No listings yet</p>
          <p className="mt-2 text-sm" style={{ color: "#64748B" }}>Create your first product or service listing</p>
          <Link href="/sell"
            className="mt-5 inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black text-white"
            style={{ background: "#7FB685" }}>
            <Plus className="h-4 w-4" /> Create listing
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-black uppercase tracking-wide" style={{ color: "#5A9460" }}>
                Active ({active.length})
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {active.map((p) => <ListingCard key={p.id} product={p as Product & { active?: boolean; soldAt?: string | null }} onAction={() => mutate()} />)}
              </div>
            </section>
          )}
          {archived.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-black uppercase tracking-wide" style={{ color: "#94A3B8" }}>
                Archived ({archived.length})
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {archived.map((p) => <ListingCard key={p.id} product={p as Product & { active?: boolean; soldAt?: string | null }} onAction={() => mutate()} />)}
              </div>
            </section>
          )}
          {sold.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-black uppercase tracking-wide" style={{ color: "#64748B" }}>
                Sold ({sold.length})
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {sold.map((p) => <ListingCard key={p.id} product={p as Product & { active?: boolean; soldAt?: string | null }} onAction={() => mutate()} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
