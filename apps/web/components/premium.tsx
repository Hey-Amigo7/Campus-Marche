import Link from "next/link";
import { BarChart3, BadgeCheck, Crown, TrendingUp } from "lucide-react";

export function PremiumUpsellCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-green-100 bg-green-50/70 p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-brand-green shadow-sm">
          <TrendingUp className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-black text-slate-950">Boost this product</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Reach more HTU students while keeping your standard listing free.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm font-bold text-slate-700">
        <span className="rounded-xl bg-white px-3 py-2">GHS 3/day</span>
        <span className="rounded-xl bg-white px-3 py-2">GHS 10/week</span>
        <span className="rounded-xl bg-white px-3 py-2">GHS 20/month</span>
      </div>
      {!compact ? (
        <Link href="/premium" className="btn-primary mt-4 w-full">
          See premium tools
        </Link>
      ) : null}
    </div>
  );
}

export function AnalyticsCards({ views, clicks, buyers }: { views: number; clicks: number; buyers: number }) {
  const items = [
    { label: "Views this week", value: views, icon: BarChart3 },
    { label: "Product clicks", value: clicks, icon: TrendingUp },
    { label: "Interested buyers", value: buyers, icon: Crown },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Icon className="h-5 w-5 text-brand-green" />
            <p className="mt-4 text-2xl font-black text-brand-navy">{item.value.toLocaleString()}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{item.label}</p>
          </div>
        );
      })}
    </div>
  );
}

export function TrustFeature({ title, description, type }: { title: string; description: string; type: "featured" | "verified" | "analytics" | "store" }) {
  const icon = type === "verified" ? BadgeCheck : type === "analytics" ? BarChart3 : type === "store" ? Crown : TrendingUp;
  const Icon = icon;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-green-50 text-brand-green">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-5 text-lg font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
