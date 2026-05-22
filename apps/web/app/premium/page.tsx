import Link from "next/link";
import { ArrowRight, BadgeCheck, BarChart3, Crown, HelpCircle, Store, TrendingUp } from "lucide-react";
import { TrustFeature } from "@/components/premium";
import { SectionHeading } from "@/components/ui";

const plans = [
  { name: "Free", price: "GHS 0", description: "Buy, sell, chat, and build ratings with no platform pressure.", cta: "Start free", featured: false },
  { name: "Boosted", price: "GHS 3/day", description: "Promote individual listings when you need faster visibility.", cta: "Boost Listing", featured: true },
  { name: "Premium Seller", price: "GHS 20/month", description: "Storefront, premium indicators, and analytics placeholders.", cta: "Upgrade seller", featured: false },
  { name: "Vendor Plus", price: "Custom", description: "For local vendors selling regularly to HTU students.", cta: "Contact team", featured: false },
];

export default function PremiumPage() {
  return (
    <div className="container-shell py-8 md:py-10">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
        <div className="grid gap-8 p-6 md:grid-cols-[1fr_0.8fr] md:p-10">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-sm font-bold text-brand-green ring-1 ring-green-100">
              <Crown className="h-4 w-4" />
              Premium seller growth
            </span>
            <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-brand-navy md:text-5xl">
              Grow your campus store without making free sellers feel locked out.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              Campus Marche premium tools add visibility, storefront trust, and seller analytics while keeping the marketplace open and welcoming.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/sell" className="btn-primary">
                Boost a product
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/products" className="btn-secondary">Browse marketplace</Link>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5">
            {[
              { icon: TrendingUp, label: "Featured listing priority" },
              { icon: BadgeCheck, label: "Verified seller badge" },
              { icon: Store, label: "Dedicated storefront" },
              { icon: BarChart3, label: "Views and buyer analytics" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="mb-3 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm last:mb-0">
                  <Icon className="h-5 w-5 text-brand-green" />
                  <span className="font-black text-slate-800">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-10">
        <SectionHeading title="Premium features" subtitle="Subtle seller upgrades that make trust and discovery clearer." />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <TrustFeature type="featured" title="Featured listings" description="Premium products appear highlighted and can be boosted above standard listings." />
          <TrustFeature type="store" title="Storefronts" description="Sellers get a branded page with banner, products, ratings, and trust context." />
          <TrustFeature type="analytics" title="Analytics" description="Track views this week, product clicks, and interested buyer signals." />
          <TrustFeature type="verified" title="Verified badge" description="Green seller verification helps students choose trusted vendors faster." />
        </div>
      </section>

      <section className="py-4">
        <SectionHeading title="Pricing" subtitle="Flexible options for students and vendors." />
        <div className="grid gap-5 lg:grid-cols-4">
          {plans.map((plan) => (
            <div key={plan.name} className={`rounded-2xl border p-5 shadow-sm ${plan.featured ? "border-green-200 bg-green-50/60" : "border-slate-200 bg-white"}`}>
              <h3 className="text-lg font-black text-slate-950">{plan.name}</h3>
              <p className="mt-3 text-3xl font-black text-brand-navy">{plan.price}</p>
              <p className="mt-3 min-h-20 text-sm leading-6 text-slate-600">{plan.description}</p>
              <Link href={plan.name === "Free" ? "/sell" : "/sell"} className={plan.featured ? "btn-primary mt-5 w-full bg-brand-green hover:bg-green-700" : "btn-secondary mt-5 w-full"}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="py-10">
        <SectionHeading title="FAQ" />
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["Can I sell without paying?", "Yes. Standard seller accounts are free and fully usable."],
            ["What does boosting do?", "Boosting gives one product more visibility for a selected time period."],
            ["Is verification required?", "No. It is a trust signal for sellers who want added confidence."],
            ["Can vendors use Campus Marche?", "Yes. Vendor Plus is designed for local vendors who sell often to HTU students."],
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
