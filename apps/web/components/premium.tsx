import Link from "next/link";
import { BarChart3, BadgeCheck, Crown, TrendingUp } from "lucide-react";

export function PremiumUpsellCard({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background:    "rgba(223,243,227,0.30)",
        border:        "1px solid rgba(127,182,133,0.25)",
        backdropFilter:"blur(12px)",
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-11 w-11 place-items-center rounded-2xl shadow-sm"
          style={{ background: "#ffffff", color: "#5A9460" }}
        >
          <TrendingUp className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-black" style={{ color: "#1E293B" }}>Boost this product</h3>
          <p className="mt-1 text-sm leading-6" style={{ color: "#64748B" }}>
            Reach more HTU students while keeping your standard listing free.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm font-bold" style={{ color: "#1E293B" }}>
        {["GHS 3/day", "GHS 10/week", "GHS 20/month"].map((tier) => (
          <span
            key={tier}
            className="rounded-xl px-3 py-2"
            style={{ background: "rgba(255,255,255,0.70)" }}
          >
            {tier}
          </span>
        ))}
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
    { label: "Views this week",    value: views,  icon: BarChart3,  color: "#5A9460",  bg: "rgba(127,182,133,0.10)" },
    { label: "Product clicks",     value: clicks, icon: TrendingUp, color: "#C68B59",  bg: "rgba(198,139,89,0.10)"  },
    { label: "Interested buyers",  value: buyers, icon: Crown,      color: "#0F172A",  bg: "rgba(15,23,42,0.07)"    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="rounded-2xl p-5"
            style={{
              background:    "rgba(255,255,255,0.82)",
              backdropFilter:"blur(16px)",
              border:        "1px solid rgba(226,232,240,0.70)",
              boxShadow:     "0 2px 12px rgba(15,23,42,0.06)",
            }}
          >
            <span
              className="grid h-10 w-10 place-items-center rounded-xl"
              style={{ background: item.bg, color: item.color }}
            >
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-4 text-2xl font-black" style={{ color: "#0F172A" }}>{item.value.toLocaleString()}</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: "#64748B" }}>{item.label}</p>
          </div>
        );
      })}
    </div>
  );
}

export function TrustFeature({ title, description, type }: { title: string; description: string; type: "featured" | "verified" | "analytics" | "store" }) {
  const icon = type === "verified" ? BadgeCheck : type === "analytics" ? BarChart3 : type === "store" ? Crown : TrendingUp;
  const Icon = icon;
  const colors: Record<string, { bg: string; color: string }> = {
    featured:  { bg: "rgba(127,182,133,0.10)", color: "#5A9460" },
    verified:  { bg: "rgba(198,139,89,0.10)",  color: "#C68B59" },
    analytics: { bg: "rgba(15,23,42,0.07)",    color: "#0F172A" },
    store:     { bg: "rgba(127,182,133,0.10)", color: "#5A9460" },
  };
  const c = colors[type]!;

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background:    "rgba(255,255,255,0.82)",
        backdropFilter:"blur(16px)",
        border:        "1px solid rgba(226,232,240,0.70)",
        boxShadow:     "0 2px 12px rgba(15,23,42,0.06)",
      }}
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: c.bg, color: c.color }}>
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-5 text-lg font-black" style={{ color: "#1E293B" }}>{title}</h3>
      <p className="mt-2 text-sm leading-6" style={{ color: "#64748B" }}>{description}</p>
    </div>
  );
}
