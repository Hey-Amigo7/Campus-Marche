"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit3, Loader2, MapPin, MessageCircle, Save, Store, X } from "lucide-react";
import { notFound } from "next/navigation";
import { use, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSWRConfig } from "swr";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { AnalyticsCards } from "@/components/premium";
import { ProductGrid } from "@/components/product-card";
import { EmptyState, Rating, SectionHeading, SellerBadge } from "@/components/ui";
import { useSeller, useProfile } from "@/hooks/use-api";
import { useToast } from "@/providers/toast-provider";

const spring = { type: "spring", stiffness: 340, damping: 26 } as const;

export default function StorefrontPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const { data: seller, isLoading } = useSeller(sellerId);
  const { data: profile } = useProfile();
  const { mutate } = useSWRConfig();
  const { success, error: toastError } = useToast();

  const isOwner = !!profile && profile.id === sellerId;

  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);

  const [editBanner, setEditBanner]   = useState("");
  const [editBio,    setEditBio]      = useState("");
  const [editLocation, setEditLocation] = useState("");

  if (isLoading) {
    return (
      <div className="container-shell flex min-h-[400px] items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--green)" }} />
      </div>
    );
  }

  if (!seller) notFound();

  const sellerProducts = (seller as typeof seller & { products?: unknown[] }).products as
    | Parameters<typeof ProductGrid>[0]["products"]
    | undefined;

  function startEdit() {
    setEditBanner(seller!.banner ?? "");
    setEditBio(seller!.bio ?? "");
    setEditLocation(seller!.location ?? "");
    setEditing(true);
  }

  function cancelEdit() { setEditing(false); }

  async function saveEdit() {
    if (!seller) return;
    setSaving(true);
    try {
      await api.saveBusiness({
        name:        seller.banner || seller.name,
        type:        (seller.business?.type ?? "Student business") as Parameters<typeof api.saveBusiness>[0]["type"],
        location:    editLocation.trim() || seller.location,
        description: editBio.trim() || undefined,
      });
      await mutate(`seller-${sellerId}`);
      await mutate("profile");
      success("Storefront updated.");
      setEditing(false);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container-shell py-8 md:py-10">
      <section
        className="overflow-hidden rounded-2xl"
        style={{ border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(9,9,11,0.06)" }}
      >
        {/* Banner */}
        <div
          className="relative overflow-hidden p-6 text-white md:p-10"
          style={{ background: "linear-gradient(135deg, #0F172A 0%, #102542 55%, #1a3a2a 100%)" }}
        >
          <div
            className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(114,204,35,0.18), transparent 65%)" }}
          />

          <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <span
                className="grid h-20 w-20 place-items-center rounded-2xl text-lg font-black shadow-md shrink-0"
                style={{ background: "rgba(255,255,255,0.12)", color: "#ffffff", backdropFilter: "blur(8px)" }}
              >
                {seller.avatar ?? seller.name.slice(0, 2).toUpperCase()}
              </span>

              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <SellerBadge verified={seller.verified} premium={seller.premium} compact />
                  {isOwner && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.70)" }}
                    >
                      Your storefront
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-black tracking-tight md:text-3xl">{seller.name} Storefront</h1>
                <p className="mt-2 flex items-center gap-2 font-semibold" style={{ color: "#A8D4AE" }}>
                  <MapPin className="h-4 w-4" />
                  {seller.location} · Joined {seller.joined}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pb-1">
              {isOwner ? (
                editing ? (
                  <>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={cancelEdit}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold"
                      style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.70)", border: "1px solid rgba(255,255,255,0.12)" }}
                    >
                      <X size={14} />
                      Cancel
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={saveEdit}
                      disabled={saving}
                      className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-black text-white disabled:opacity-60"
                      style={{ background: "#72CC23" }}
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save
                    </motion.button>
                  </>
                ) : (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={spring}
                    onClick={startEdit}
                    className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                    style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                  >
                    <Edit3 size={14} />
                    Edit storefront
                  </motion.button>
                )
              ) : (
                <Link
                  href={`/messages?sellerId=${sellerId}`}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                  style={{ background: "#72CC23" }}
                >
                  <MessageCircle size={15} />
                  Message seller
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_340px] md:p-8" style={{ background: "var(--surface-raised)" }}>
          <div>
            <AnimatePresence mode="wait">
              {editing ? (
                <motion.div
                  key="edit-form"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={spring}
                  className="rounded-2xl p-5 space-y-4"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Edit3 size={15} style={{ color: "var(--green)" }} />
                    <h2 className="text-base font-black" style={{ color: "var(--on-surface)" }}>
                      Edit your storefront
                    </h2>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                      Store headline
                    </label>
                    <input
                      value={editBanner}
                      onChange={(e) => setEditBanner(e.target.value)}
                      placeholder={seller.banner || "e.g. Premium Campus Essentials"}
                      className="input-shell"
                      maxLength={80}
                    />
                    <p className="mt-1 text-xs" style={{ color: "var(--subtle)" }}>
                      Short tagline shown at the top of your store
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                      About your store
                    </label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder={seller.bio || "Tell buyers what you sell and why they should trust you…"}
                      rows={4}
                      className="input-shell resize-none"
                      maxLength={400}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                      Location
                    </label>
                    <input
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder={seller.location || "HTU, Ho"}
                      className="input-shell"
                      maxLength={60}
                    />
                  </div>

                  <p className="text-xs" style={{ color: "var(--subtle)" }}>
                    To change your avatar or profile photo, go to{" "}
                    <Link href="/profile/edit" className="font-semibold hover:underline" style={{ color: "var(--green)" }}>
                      Profile edit
                    </Link>.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="store-info"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={spring}
                  className="rounded-2xl p-5"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-start gap-3">
                    <Store className="mt-1 h-5 w-5 shrink-0" style={{ color: "var(--green)" }} />
                    <div>
                      <h2 className="text-xl font-black" style={{ color: "var(--on-surface)" }}>
                        {seller.banner || `${seller.name}'s Store`}
                      </h2>
                      <p className="mt-2 leading-7" style={{ color: "var(--muted)" }}>
                        {seller.bio || "No store description yet."}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {seller.analytics ? (
              <div className="mt-6">
                <AnalyticsCards
                  views={seller.analytics.viewsThisWeek}
                  clicks={seller.analytics.productClicks}
                  buyers={seller.analytics.interestedBuyers}
                />
              </div>
            ) : null}
          </div>

          {/* Sidebar */}
          <aside
            className="rounded-2xl p-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h3 className="font-black" style={{ color: "var(--on-surface)" }}>Seller trust</h3>
            <div className="mt-4 space-y-3">
              <Rating value={seller.rating} reviews={seller.reviews} />
              {seller.responseTime ? (
                <p className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
                  Avg. response: {seller.responseTime}
                </p>
              ) : null}
              {sellerProducts != null && (
                <p className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
                  {sellerProducts.length} active listing{sellerProducts.length !== 1 ? "s" : ""}
                </p>
              )}
              {seller.location && (
                <p className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--muted)" }}>
                  <MapPin size={13} />
                  {seller.location}
                </p>
              )}
            </div>

            {!isOwner && (
              <Link
                href={`/messages?sellerId=${sellerId}`}
                className="mt-5 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white w-full"
                style={{ background: "var(--green)" }}
              >
                <MessageCircle size={14} />
                Message seller
              </Link>
            )}

            {isOwner && (
              <div className="mt-5 space-y-2">
                <Link
                  href="/profile/listings"
                  className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold w-full transition-colors hover:bg-[var(--surface-raised)]"
                  style={{ border: "1px solid var(--border)", color: "var(--on-surface)" }}
                >
                  Manage listings
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold w-full transition-colors hover:bg-[var(--surface-raised)]"
                  style={{ border: "1px solid var(--border)", color: "var(--on-surface)" }}
                >
                  Account settings
                </Link>
              </div>
            )}
          </aside>
        </div>
      </section>

      {/* Listings */}
      <section className="mt-10">
        <SectionHeading
          title="Store listings"
          subtitle={isOwner ? "Your published products." : "Products available from this seller."}
        />
        {sellerProducts && sellerProducts.length > 0 ? (
          <ProductGrid products={sellerProducts} />
        ) : (
          <EmptyState
            title={isOwner ? "No listings yet" : "No listings yet"}
            description={
              isOwner
                ? "Publish your first listing to start selling."
                : "This seller hasn't posted any products yet."
            }
            action={isOwner ? <Link href="/sell" className="btn-primary">Create a listing</Link> : undefined}
          />
        )}
      </section>
    </div>
  );
}
