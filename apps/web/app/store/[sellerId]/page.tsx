"use client";

import Link from "next/link";
import { Loader2, MapPin, MessageCircle, Store } from "lucide-react";
import { notFound } from "next/navigation";
import { use } from "react";
import { AnalyticsCards } from "@/components/premium";
import { ProductGrid } from "@/components/product-card";
import { EmptyState, Rating, SectionHeading, SellerBadge } from "@/components/ui";
import { useSeller } from "@/hooks/use-api";

const GLASS_PANEL = {
  background:    "rgba(255,255,255,0.82)",
  backdropFilter:"blur(18px) saturate(150%)",
  border:        "1px solid rgba(226,232,240,0.70)",
  boxShadow:     "0 4px 24px rgba(15,23,42,0.07)",
} as const;

export default function StorefrontPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const { data: seller, isLoading } = useSeller(sellerId);

  if (isLoading) {
    return (
      <div className="container-shell flex min-h-[400px] items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#7FB685" }} />
      </div>
    );
  }

  if (!seller) notFound();

  const sellerProducts = (seller as typeof seller & { products?: unknown[] }).products as
    | Parameters<typeof ProductGrid>[0]["products"]
    | undefined;

  return (
    <div className="container-shell py-8 md:py-10">
      <section
        className="overflow-hidden rounded-2xl"
        style={{ border: "1px solid rgba(226,232,240,0.60)", boxShadow: "0 4px 24px rgba(15,23,42,0.08)" }}
      >
        {/* Navy banner */}
        <div
          className="relative overflow-hidden p-6 text-white md:p-10"
          style={{ background: "linear-gradient(135deg, #0F172A 0%, #102542 55%, #1a3a2a 100%)" }}
        >
          <div
            className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(127,182,133,0.18), transparent 65%)" }}
          />
          <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div className="flex items-center gap-4">
              <span
                className="grid h-20 w-20 place-items-center rounded-2xl text-lg font-black shadow-md"
                style={{ background: "rgba(255,255,255,0.12)", color: "#ffffff", backdropFilter: "blur(8px)" }}
              >
                {seller.avatar ?? seller.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <SellerBadge verified={seller.verified} premium={seller.premium} compact />
                </div>
                <h1 className="text-3xl font-black tracking-tight">{seller.name} Storefront</h1>
                <p className="mt-2 flex items-center gap-2 font-semibold" style={{ color: "#A8D4AE" }}>
                  <MapPin className="h-4 w-4" />
                  {seller.location} · Joined {seller.joined}
                </p>
              </div>
            </div>
            <Link href="/messages" className="btn-primary">
              <MessageCircle className="h-5 w-5" />
              Message seller
            </Link>
          </div>
        </div>

        {/* Body */}
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_340px] md:p-8" style={{ background: "rgba(250,247,242,0.60)" }}>
          <div>
            <div className="rounded-2xl p-5" style={GLASS_PANEL}>
              <div className="flex items-start gap-3">
                <Store className="mt-1 h-5 w-5" style={{ color: "#5A9460" }} />
                <div>
                  <h2 className="text-xl font-black" style={{ color: "#1E293B" }}>{seller.banner}</h2>
                  <p className="mt-2 leading-7" style={{ color: "#64748B" }}>{seller.bio}</p>
                </div>
              </div>
            </div>
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

          <aside className="rounded-2xl p-5" style={GLASS_PANEL}>
            <h3 className="font-black" style={{ color: "#1E293B" }}>Seller trust</h3>
            <div className="mt-4 space-y-4">
              <Rating value={seller.rating} reviews={seller.reviews} />
              {seller.responseTime ? (
                <p className="text-sm font-semibold" style={{ color: "#64748B" }}>{seller.responseTime}</p>
              ) : null}
              {sellerProducts != null ? (
                <p className="text-sm font-semibold" style={{ color: "#64748B" }}>
                  {sellerProducts.length} active listing{sellerProducts.length !== 1 ? "s" : ""}
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading title="Store listings" subtitle="Products available from this seller." />
        {sellerProducts && sellerProducts.length > 0 ? (
          <ProductGrid products={sellerProducts} />
        ) : (
          <EmptyState title="No listings yet" description="This seller hasn't posted any products yet." />
        )}
      </section>
    </div>
  );
}
