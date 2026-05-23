"use client";

import Link from "next/link";
import { BriefcaseBusiness, Crown, Edit, ShieldCheck, Star } from "lucide-react";
import { AnalyticsCards } from "@/components/premium";
import { ProductGrid } from "@/components/product-card";
import { Rating, SectionHeading, SellerBadge, EmptyState, LoadingSkeleton } from "@/components/ui";
import { useProducts, useProfile } from "@/hooks/use-api";

const GLASS_PANEL = {
  background:    "rgba(255,255,255,0.82)",
  backdropFilter:"blur(18px) saturate(150%)",
  border:        "1px solid rgba(226,232,240,0.70)",
  boxShadow:     "0 4px 24px rgba(15,23,42,0.07)",
} as const;

export default function ProfilePage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: products = [], isLoading: productsLoading } = useProducts();

  const listed = profile ? products.filter((p) => p.seller?.id === profile.id) : [];

  if (profileLoading || productsLoading) {
    return <div className="container-shell py-8 md:py-10"><LoadingSkeleton /></div>;
  }

  if (!profile) {
    return (
      <div className="container-shell py-8 md:py-10">
        <EmptyState
          title="Sign in to view your profile"
          description="Please log in to access your account details and listed products."
          action={<Link href="/login?next=/profile" className="btn-primary">Log in</Link>}
        />
      </div>
    );
  }

  return (
    <div className="container-shell py-8 md:py-10">
      {/* Profile header */}
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
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(127,182,133,0.18), transparent 65%)" }}
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-4">
              <span
                className="grid h-20 w-20 place-items-center rounded-2xl text-lg font-black shadow-md"
                style={{ background: "rgba(255,255,255,0.12)", color: "#ffffff", backdropFilter: "blur(8px)" }}
              >
                {profile.avatar}
              </span>
              <div>
                <h1 className="text-3xl font-black">{profile.name}</h1>
                <p className="mt-1 font-semibold" style={{ color: "#A8D4AE" }}>
                  {profile.handle} · {profile.location}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Rating value={profile.rating} reviews={profile.reviews} />
                  {profile.accountType ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.20)" }}>
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {profile.accountType}
                    </span>
                  ) : null}
                  <SellerBadge verified={profile.verified} premium={profile.premium} compact />
                </div>
              </div>
            </div>
            {profile.business?.premium ? (
              <Link href="/premium" className="btn-primary">
                <Crown className="h-5 w-5" />
                Premium active
              </Link>
            ) : (
              <Link href="/sell" className="btn-primary">
                <BriefcaseBusiness className="h-5 w-5" />
                {profile.business ? "Manage business" : "Create business"}
              </Link>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_320px] md:p-8" style={{ background: "rgba(250,247,242,0.60)" }}>
          <div>
            <h2 className="text-xl font-black" style={{ color: "#1E293B" }}>
              {profile.business ? "Business overview" : "Account overview"}
            </h2>
            <p className="mt-3 leading-7" style={{ color: "#64748B" }}>{profile.bio}</p>

            {profile.business ? (
              <div className="mt-6">
                <AnalyticsCards
                  views={profile.analytics.viewsThisWeek}
                  clicks={profile.analytics.productClicks}
                  buyers={profile.analytics.interestedBuyers}
                />
              </div>
            ) : (
              <div
                className="mt-6 rounded-2xl border border-dashed p-5"
                style={{ borderColor: "rgba(127,182,133,0.30)", background: "rgba(223,243,227,0.18)" }}
              >
                <h3 className="font-black" style={{ color: "#1E293B" }}>Buyer account</h3>
                <p className="mt-2 text-sm leading-6" style={{ color: "#64748B" }}>
                  You can browse, order, and track purchases. Create a business profile only when you are ready to sell.
                </p>
                <Link href="/sell" className="btn-primary mt-4">
                  Create business profile
                </Link>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="rounded-2xl p-5" style={GLASS_PANEL}>
            <h3 className="font-black" style={{ color: "#1E293B" }}>
              {profile.business ? "Seller badges" : "Account status"}
            </h3>
            <div className="mt-4 space-y-3">
              {(profile.business
                ? ["Business profile active", profile.business.verified ? "Verified seller" : "Verification pending", profile.business.premium ? "Premium storefront" : "Standard seller"]
                : ["Buyer access active", "No business profile yet", "Selling locked until setup"]
              ).map((badge) => (
                <div key={badge} className="flex items-center gap-3 rounded-2xl p-3 text-sm font-bold" style={{ background: "rgba(255,255,255,0.70)", color: "#1E293B" }}>
                  <Star className="h-4 w-4" style={{ fill: "#C68B59", color: "#C68B59" }} />
                  {badge}
                </div>
              ))}
            </div>

            <Link href="/profile/edit" className="btn-secondary mt-5 w-full">
              <Edit className="h-4 w-4" />
              Edit profile
            </Link>
            {!profile.verified ? (
              <Link
                href={`/verify-email?email=${encodeURIComponent(profile.email ?? "")}`}
                className="btn-secondary mt-2 w-full"
                style={{ color: "#92400E", borderColor: "rgba(251,191,36,0.40)", background: "rgba(251,191,36,0.06)" }}
              >
                <ShieldCheck className="h-4 w-4" />
                Verify email
              </Link>
            ) : null}
            <Link href="/verify-phone" className="btn-secondary mt-2 w-full">
              <ShieldCheck className="h-4 w-4" />
              Verify phone
            </Link>
          </aside>
        </div>
      </section>

      {/* Listings */}
      <section className="mt-10">
        <SectionHeading
          title={profile.business ? "Listed products and services" : "Seller area"}
          subtitle={profile.business ? "Your active marketplace listings." : "Create a business profile before listings appear here."}
        />
        {profile.business ? (
          listed.length
            ? <ProductGrid products={listed} />
            : <EmptyState title="No listings found" description="Create your first product or service listing from the sell page." />
        ) : (
          <EmptyState
            title="No business profile yet"
            description="Your account is set up for buying. Create a business profile to unlock selling tools."
            action={<Link href="/sell" className="btn-primary">Start business setup</Link>}
          />
        )}
      </section>

      {/* Reviews */}
      {profile.business ? (
        <section className="mt-10">
          <SectionHeading title="Reviews" />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { stars: 5,   text: "Great communication and quick meetup. Recommended for buyers and sellers.", author: "Campus Marketplace Team" },
              { stars: 4.5, text: "Fast responses and trusted delivery on campus.",                            author: "Study Circle"            },
              { stars: 4.8, text: "Great seller — helped coordinate a secure pickup at the main gate.",         author: "HTU Buyer"               },
            ].map((r) => (
              <div key={r.author} className="rounded-2xl p-5" style={GLASS_PANEL}>
                <Rating value={r.stars} />
                <p className="mt-3 text-sm leading-6" style={{ color: "#64748B" }}>{r.text}</p>
                <p className="mt-3 text-xs font-black" style={{ color: "#94A3B8" }}>{r.author}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
