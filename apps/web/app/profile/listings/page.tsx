"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Eye, Pencil, Pause, Play, Trash2,
  MoreVertical, Package, AlertTriangle, Search,
} from "lucide-react";
import { useSWRConfig } from "swr";
import { api } from "@/lib/api";
import { useMyListings } from "@/hooks/use-api";
import { useToast } from "@/providers/toast-provider";
import { AuthGate } from "@/components/auth-gate";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import type { Product } from "@/types";

const spring = { type: "spring", stiffness: 300, damping: 26 } as const;

type FilterStatus = "all" | "active" | "archived" | "sold";

type ExtProduct = Product & { active?: boolean; soldAt?: string | null };

function deriveStatus(p: ExtProduct): "active" | "archived" | "sold" {
  if ((p as ExtProduct).soldAt) return "sold";
  if (p.active === false)       return "archived";
  return "active";
}

const STATUS_CFG: Record<"active" | "archived" | "sold", { label: string; color: string; bg: string }> = {
  active:   { label: "Active",   color: "#72CC23", bg: "rgba(114,204,35,0.12)"  },
  archived: { label: "Paused",   color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  sold:     { label: "Sold",     color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
};

/* ── Delete confirm modal ───────────────────────────────── */
function DeleteConfirm({
  title,
  onConfirm,
  onCancel,
}: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={spring}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl p-7"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div
          className="mb-4 h-12 w-12 rounded-2xl grid place-items-center"
          style={{ background: "rgba(239,68,68,0.12)" }}
        >
          <AlertTriangle size={22} style={{ color: "#EF4444" }} />
        </div>
        <h2 className="text-lg font-black" style={{ color: "var(--on-surface)" }}>Delete listing?</h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          &ldquo;{title}&rdquo; will be permanently removed. This cannot be undone.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl py-3 text-sm font-semibold transition-colors hover:bg-[var(--surface-raised)]"
            style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl py-3 text-sm font-black text-white transition-opacity hover:opacity-90"
            style={{ background: "#EF4444" }}
          >
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Listing row ─────────────────────────────────────────── */
function ListingRow({
  product,
  onRefresh,
}: {
  product: ExtProduct;
  onRefresh: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const status = deriveStatus(product);
  const cfg    = STATUS_CFG[status];
  const img    = product.imageUrl ?? product.imageUrls?.[0];

  async function handleAction(type: "sold" | "archive" | "restore") {
    setLoading(type);
    try {
      if (type === "sold")    await api.markSold(product.id);
      if (type === "archive") await api.archiveListing(product.id);
      if (type === "restore") await api.restoreListing(product.id);
      success(
        type === "sold"    ? "Marked as sold."   :
        type === "archive" ? "Listing paused."   :
        "Listing resumed.",
      );
      onRefresh();
    } catch {
      toastError("Action failed. Please try again.");
    } finally {
      setLoading(null);
      setMenuOpen(false);
    }
  }

  async function handleDelete() {
    setLoading("delete");
    try {
      await api.archiveListing(product.id);
      success("Listing archived.");
      onRefresh();
    } catch {
      toastError("Could not archive. Please try again.");
    } finally {
      setLoading(null);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={spring}
        className="flex items-center gap-4 rounded-2xl p-4 transition-colors hover:bg-[var(--surface-raised)]"
        style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
      >
        {/* Image */}
        <Link href={`/products/${product.id}`} className="shrink-0 h-16 w-16 rounded-xl overflow-hidden" style={{ background: "var(--surface-raised)" }}>
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={product.title} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-xl">📦</div>
          )}
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/products/${product.id}`}>
              <p
                className="text-sm font-semibold truncate max-w-[200px] hover:underline sm:max-w-[280px]"
                style={{ color: "var(--on-surface)" }}
              >
                {product.title}
              </p>
            </Link>
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
              style={{ background: cfg.bg, color: cfg.color }}
            >
              {cfg.label}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--muted)" }}>
            <span className="font-bold" style={{ color: "var(--on-surface)" }}>
              {formatCurrency(product.price)}
            </span>
            <span className="flex items-center gap-1"><Eye size={11} /> {product.views ?? 0}</span>
            <span className="hidden sm:inline">{product.category}</span>
            <span>{formatRelativeDate(product.postedAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {status !== "sold" && (
            <Link href={`/profile/listings/${product.id}/edit`} className="block">
              <button
                type="button"
                aria-label="Edit listing"
                className="h-9 w-9 rounded-xl grid place-items-center transition-colors hover:bg-[var(--surface-raised)]"
                style={{ border: "1px solid var(--border)" }}
              >
                <Pencil size={14} style={{ color: "var(--muted)" }} />
              </button>
            </Link>
          )}

          <div className="relative">
            <button
              type="button"
              aria-label="More options"
              onClick={() => setMenuOpen((v) => !v)}
              className="h-9 w-9 rounded-xl grid place-items-center transition-colors hover:bg-[var(--surface-raised)]"
              style={{ border: "1px solid var(--border)" }}
            >
              <MoreVertical size={14} style={{ color: "var(--muted)" }} />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={spring}
                  className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl py-1.5 z-20"
                  style={{
                    background:  "var(--surface)",
                    border:      "1px solid var(--border)",
                    boxShadow:   "0 12px 32px rgba(0,0,0,0.10)",
                  }}
                >
                  {status === "active" && (
                    <button
                      type="button"
                      onClick={() => handleAction("archive")}
                      disabled={!!loading}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--surface-raised)]"
                      style={{ color: "var(--on-surface)" }}
                    >
                      <Pause size={14} /> Pause listing
                    </button>
                  )}
                  {status === "archived" && (
                    <button
                      type="button"
                      onClick={() => handleAction("restore")}
                      disabled={!!loading}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--surface-raised)]"
                      style={{ color: "var(--on-surface)" }}
                    >
                      <Play size={14} /> Resume listing
                    </button>
                  )}
                  {status === "active" && (
                    <button
                      type="button"
                      onClick={() => handleAction("sold")}
                      disabled={!!loading}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--surface-raised)]"
                      style={{ color: "var(--on-surface)" }}
                    >
                      <Package size={14} /> Mark as sold
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setConfirmDelete(true); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-[rgba(239,68,68,0.05)]"
                    style={{ color: "#EF4444" }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {confirmDelete && (
          <DeleteConfirm
            title={product.title}
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Page ────────────────────────────────────────────────── */
function ListingsContent() {
  const { mutate } = useSWRConfig();
  const { data: listings, isLoading } = useMyListings();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");

  function refresh() { void mutate("my-listings"); }

  const typed = (listings ?? []) as ExtProduct[];

  const counts = {
    all:      typed.length,
    active:   typed.filter((l) => deriveStatus(l) === "active").length,
    archived: typed.filter((l) => deriveStatus(l) === "archived").length,
    sold:     typed.filter((l) => deriveStatus(l) === "sold").length,
  };

  const shown = typed
    .filter((l) => filter === "all" || deriveStatus(l) === filter)
    .filter((l) => !search || l.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="container-shell py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--on-surface)" }}>My Listings</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            {typed.length} total listing{typed.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/sell">
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            transition={spring}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white"
            style={{ background: "linear-gradient(135deg, #72CC23, #5EB81B)" }}
          >
            <Plus size={16} /> New listing
          </motion.button>
        </Link>
      </div>

      {/* Filter + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Filter tabs */}
        <div
          className="flex gap-1 rounded-2xl p-1"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {(["all", "active", "archived", "sold"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="rounded-xl px-3.5 py-2 text-xs font-semibold capitalize transition-all"
              style={{
                background: filter === f ? "#72CC23" : "transparent",
                color:      filter === f ? "white"   : "var(--muted)",
              }}
            >
              {f} ({counts[f]})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: "var(--muted)" }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your listings…"
            className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none"
            style={{
              background: "var(--surface)",
              border:     "1px solid var(--border)",
              color:      "var(--on-surface)",
            }}
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {shown.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center py-20 text-center"
              >
                <Package size={40} className="mb-3" style={{ color: "var(--muted)" }} />
                <p className="font-semibold" style={{ color: "var(--on-surface)" }}>
                  {search
                    ? "No listings match your search"
                    : `No ${filter === "all" ? "" : filter} listings`}
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                  {search
                    ? "Try a different keyword."
                    : "Create your first listing and start selling."}
                </p>
                {!search && filter === "all" && (
                  <Link href="/sell">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      transition={spring}
                      className="mt-5 flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black text-white"
                      style={{ background: "linear-gradient(135deg, #72CC23, #5EB81B)" }}
                    >
                      <Plus size={15} /> Create listing
                    </motion.button>
                  </Link>
                )}
              </motion.div>
            ) : (
              shown.map((listing) => (
                <ListingRow key={listing.id} product={listing} onRefresh={refresh} />
              ))
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default function ListingsPage() {
  return (
    <AuthGate>
      <ListingsContent />
    </AuthGate>
  );
}
