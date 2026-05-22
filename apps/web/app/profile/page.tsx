"use client";

import Link from "next/link";
import { BriefcaseBusiness, Crown, Edit, ShieldCheck, Star } from "lucide-react";
import { AnalyticsCards } from "@/components/premium";
import { ProductGrid } from "@/components/product-card";
import { Rating, SectionHeading, SellerBadge, EmptyState, LoadingSkeleton } from "@/components/ui";
import { useProducts, useProfile } from "@/hooks/use-api";

export default function ProfilePage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: products = [], isLoading: productsLoading } = useProducts();

  const listed = profile ? products.filter((product) => product.seller?.id === profile.id) : [];

  if (profileLoading || productsLoading) {
    return (
      <div className="container-shell py-8 md:py-10">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container-shell py-8 md:py-10">
        <EmptyState
          title="Sign in to view your profile"
          description="Please log in to access your account details and listed products."
          action={<Link href="/login?next=/profile" className="btn-primary bg-brand-green hover:bg-green-700">Log in</Link>}
        />
      </div>
    );
  }

  return (
    <div className="container-shell py-8 md:py-10">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-brand-navy p-6 text-white md:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid h-20 w-20 place-items-center rounded-2xl bg-white text-lg font-black text-brand-navy">{profile.avatar}</span>
              <div>
                <h1 className="text-3xl font-black">{profile.name}</h1>
                <p className="mt-1 font-semibold text-blue-100">{profile.handle} · {profile.location}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Rating value={profile.rating} reviews={profile.reviews} />
                  {profile.accountType ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white ring-1 ring-white/20">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {profile.accountType}
                    </span>
                  ) : null}
                  <SellerBadge verified={profile.verified} premium={profile.premium} compact />
                </div>
              </div>
            </div>
            {profile.business?.premium ? (
              <Link href="/premium" className="btn-primary bg-brand-green hover:bg-green-700">
                <Crown className="h-5 w-5" />
                Premium active
              </Link>
            ) : (
              <Link href="/sell" className="btn-primary bg-brand-green hover:bg-green-700">
                <BriefcaseBusiness className="h-5 w-5" />
                {profile.business ? "Manage business" : "Create business"}
              </Link>
            )}
          </div>
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_320px] md:p-8">
          <div>
            <h2 className="text-xl font-black text-slate-950">{profile.business ? "Business overview" : "Account overview"}</h2>
            <p className="mt-3 leading-7 text-slate-600">{profile.bio}</p>
            {profile.business ? (
              <div className="mt-6">
                <AnalyticsCards views={profile.analytics.viewsThisWeek} clicks={profile.analytics.productClicks} buyers={profile.analytics.interestedBuyers} />
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <h3 className="font-black text-slate-950">Buyer account</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  You can browse, order, and track purchases. Create a business profile only when you are ready to sell products or services.
                </p>
                <Link href="/sell" className="btn-primary mt-4 bg-brand-green hover:bg-green-700">
                  Create business profile
                </Link>
              </div>
            )}
          </div>
          <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-black text-slate-950">{profile.business ? "Seller badges" : "Account status"}</h3>
            <div className="mt-4 space-y-3">
              {(profile.business ? ["Business profile active", profile.business.verified ? "Verified seller" : "Verification pending", profile.business.premium ? "Premium storefront" : "Standard seller"] : ["Buyer access active", "No business profile yet", "Selling locked until setup"]).map((badge) => (
                <div key={badge} className="flex items-center gap-3 rounded-2xl bg-white p-3 text-sm font-bold text-slate-700">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {badge}
                </div>
              ))}
            </div>
            <button className="btn-secondary mt-5 w-full">
              <Edit className="h-4 w-4" />
              Edit profile
            </button>
          </aside>
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading title={profile.business ? "Listed products and services" : "Seller area"} subtitle={profile.business ? "Your active marketplace listings." : "Create a business profile before listings appear here."} />
        {profile.business ? (
          listed.length ? <ProductGrid products={listed} /> : <EmptyState title="No listings found" description="Create your first product or service listing from the sell page." />
        ) : (
          <EmptyState title="No business profile yet" description="Your account is currently set up for buying. Create a business profile to unlock selling tools." action={<Link href="/sell" className="btn-primary bg-brand-green hover:bg-green-700">Start business setup</Link>} />
        )}
      </section>

      {profile.business ? <section className="mt-10">
        <SectionHeading title="Reviews" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Rating value={5} />
            <p className="mt-3 text-sm leading-6 text-slate-600">Great communication and quick meetup. Recommended for buyers and sellers.</p>
            <p className="mt-3 text-xs font-black text-slate-400">Campus Marketplace Team</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Rating value={4.5} />
            <p className="mt-3 text-sm leading-6 text-slate-600">Fast responses and trusted delivery on campus.</p>
            <p className="mt-3 text-xs font-black text-slate-400">Study Circle</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Rating value={4.8} />
            <p className="mt-3 text-sm leading-6 text-slate-600">Great seller—helped coordinate a secure pickup at the main gate.</p>
            <p className="mt-3 text-xs font-black text-slate-400">HTU Buyer</p>
          </div>
        </div>
      </section> : null}
    </div>
  );
}
