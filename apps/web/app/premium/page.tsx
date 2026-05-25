"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, BarChart3, CheckCircle2, Crown, HelpCircle, Loader2, Store, TrendingUp, XCircle } from "lucide-react";
import { TrustFeature } from "@/components/premium";
import { SectionHeading } from "@/components/ui";
import { useToast } from "@/providers/toast-provider";
import { api } from "@/lib/api";

const PLANS = [
  {
    key: "free" as const,
    name: "Free",
    price: "GHS 0",
    period: "",
    description: "Buy, sell, chat, and build ratings — no fees, no pressure.",
    features: ["Up to 5 listings", "Buyer and seller access", "Messaging", "Order tracking"],
    cta: "Start free",
    href: "/sell",
    highlight: false,
  },
  {
    key: "pro" as const,
    name: "Seller Pro",
    price: "GHS 20",
    period: "/month",
    description: "For students selling regularly who want more visibility and trust.",
    features: ["Unlimited listings", "Verified seller badge", "Seller analytics", "Boosted products", "Priority in search"],
    cta: "Upgrade to Pro",
    href: null,
    highlight: true,
  },
  {
    key: "featured" as const,
    name: "Featured",
    price: "GHS 50",
    period: "/month",
    description: "For local vendors who want homepage placement and priority support.",
    features: ["Everything in Pro", "Homepage featured placement", "Advanced analytics", "Priority support", "Storefront customization"],
    cta: "Get Featured",
    href: null,
    highlight: false,
  },
];

export default function PremiumPage() {
  const { success, error } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function handleUpgrade(plan: "pro" | "featured") {
    setLoadingPlan(plan);
    try {
      const { authorizationUrl } = await api.upgradeSubscription(plan);
      if (authorizationUrl) {
        window.location.href = authorizationUrl;
      } else {
        error("Payment not configured", "Paystack keys are not set up yet. Contact support.");
      }
    } catch (err) {
      error("Upgrade failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="container-shell py-8 md:py-10">
      <section
        className="overflow-hidden rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(18px)",
          border: "1px solid rgba(226,232,240,0.70)",
          boxShadow: "0 8px 48px rgba(15,23,42,0.10)",
        }}
      >
        <div className="grid gap-8 p-6 md:grid-cols-[1fr_0.8fr] md:p-10">
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold"
              style={{ background: "rgba(127,182,133,0.12)", color: "#5A9460", border: "1px solid rgba(127,182,133,0.25)" }}
            >
              <Crown className="h-4 w-4" />
              Premium seller growth
            </span>
            <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-brand-navy md:text-5xl">
              Grow your campus store without locking out free sellers.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              Campus Marche premium tools add real visibility, storefront trust, and seller analytics — while keeping the marketplace open and welcoming to everyone.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => void handleUpgrade("pro")}
                className="btn-primary"
              >
                Upgrade to Pro
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link href="/products" className="btn-secondary">Browse marketplace</Link>
            </div>
          </div>
          <div
            className="rounded-2xl p-5"
            style={{ background: "rgba(223,243,227,0.25)", border: "1px solid rgba(127,182,133,0.20)" }}
          >
            {[
              { icon: TrendingUp, label: "Featured listing priority" },
              { icon: BadgeCheck, label: "Verified seller badge" },
              { icon: Store, label: "Dedicated storefront" },
              { icon: BarChart3, label: "Views and buyer analytics" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="mb-3 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm last:mb-0">
                <Icon className="h-5 w-5 text-brand-green" />
                <span className="font-black text-slate-800">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10">
        <SectionHeading title="Premium features" subtitle="Subtle seller upgrades that make trust and discovery clearer." />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <TrustFeature type="featured" title="Featured listings" description="Premium products appear highlighted and boosted above standard listings." />
          <TrustFeature type="store" title="Storefronts" description="Branded page with banner, products, ratings, and trust context." />
          <TrustFeature type="analytics" title="Analytics" description="Track views this week, product clicks, and interested buyer signals." />
          <TrustFeature type="verified" title="Verified badge" description="Green seller verification helps students choose trusted vendors faster." />
        </div>
      </section>

      {/* Pricing */}
      <section className="py-4">
        <SectionHeading title="Pricing" subtitle="Flexible options for students and local vendors." />
        <div className="grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className="relative flex flex-col rounded-2xl p-6 shadow-sm"
              style={
                plan.highlight
                  ? {
                      background: "rgba(255,255,255,0.95)",
                      border: "2px solid rgba(127,182,133,0.50)",
                      boxShadow: "0 8px 32px rgba(90,148,96,0.12)",
                    }
                  : {
                      background: "rgba(255,255,255,0.80)",
                      border: "1px solid rgba(226,232,240,0.70)",
                    }
              }
            >
              {plan.highlight ? (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-black text-white"
                  style={{ background: "#5A9460" }}
                >
                  Most popular
                </span>
              ) : null}

              <div>
                <h3 className="text-lg font-black" style={{ color: "#0F172A" }}>{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-black" style={{ color: "#0F172A" }}>{plan.price}</span>
                  <span className="text-sm font-semibold" style={{ color: "#64748B" }}>{plan.period}</span>
                </div>
                <p className="mt-3 min-h-12 text-sm leading-6" style={{ color: "#64748B" }}>{plan.description}</p>
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm font-semibold" style={{ color: "#1E293B" }}>
                    <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#5A9460" }} />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {plan.href ? (
                  <Link href={plan.href} className="btn-secondary w-full justify-center">
                    {plan.cta}
                  </Link>
                ) : (
                  <button
                    onClick={() => void handleUpgrade(plan.key as "pro" | "featured")}
                    disabled={loadingPlan === plan.key}
                    className={`${plan.highlight ? "btn-primary" : "btn-secondary"} w-full justify-center`}
                  >
                    {loadingPlan === plan.key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    {plan.cta}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs" style={{ color: "#94A3B8" }}>
          All plans are billed monthly. Cancel anytime from your profile. Paystack processes all payments securely.
        </p>
      </section>

      {/* FAQ */}
      <section className="py-10">
        <SectionHeading title="FAQ" />
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["Can I sell without paying?", "Yes. Standard seller accounts are free and fully functional. Premium adds visibility and trust signals on top."],
            ["What does the verified badge do?", "It shows a green checkmark on your listings and profile, helping buyers choose your products with more confidence."],
            ["How is payment processed?", "All subscription payments go through Paystack, Ghana's trusted payment platform. Your card details are never stored on our servers."],
            ["Can I cancel anytime?", "Yes. Cancel from your profile at any time. Access continues until the end of your billing period."],
          ].map(([question, answer]) => (
            <div key={question} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <HelpCircle className="h-5 w-5 text-brand-green" />
              <h3 className="mt-4 font-black text-slate-950">{question}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
