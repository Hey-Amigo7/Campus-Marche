"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Crown, Loader2, Rocket, Star, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/providers/toast-provider";

const spring = { type: "spring", stiffness: 340, damping: 26 } as const;

const PLANS = [
  {
    key:      "daily"    as const,
    icon:     Zap,
    name:     "Daily Boost",
    price:    "GHS 3",
    period:   "/day",
    tagline:  "More visibility, fast",
    accent:   "#F59E0B",
    accentBg: "rgba(245,158,11,0.10)",
    features: ["Boosted listing for 24 hrs", "More search impressions", "No commitment"],
  },
  {
    key:      "pro"      as const,
    icon:     Rocket,
    name:     "Seller Pro",
    price:    "GHS 20",
    period:   "/month",
    tagline:  "For regular sellers",
    accent:   "#72CC23",
    accentBg: "rgba(114,204,35,0.10)",
    features: ["Unlimited listings", "Verified badge", "Seller analytics", "Priority search"],
    highlight: true,
  },
  {
    key:      "featured" as const,
    icon:     Crown,
    name:     "Featured",
    price:    "GHS 50",
    period:   "/month",
    tagline:  "Maximum exposure",
    accent:   "#C68B59",
    accentBg: "rgba(198,139,89,0.10)",
    features: ["Everything in Pro", "Homepage placement", "Storefront customization", "Priority support"],
  },
] as const;

interface SubscriptionBoxProps {
  compact?: boolean;
}

export function SubscriptionBox({ compact = false }: SubscriptionBoxProps) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleUpgrade(plan: "daily" | "pro" | "featured") {
    setLoading(plan);
    try {
      const { authorizationUrl } = await api.upgradeSubscription(plan);
      if (authorizationUrl) {
        window.location.href = authorizationUrl;
      } else {
        error("Payment not ready", "Paystack is not configured yet. Contact support.");
      }
    } catch (err) {
      error("Upgrade failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <Star size={15} style={{ color: "#F59E0B" }} />
        <div>
          <p className="text-sm font-black" style={{ color: "var(--on-surface)" }}>Boost your listings</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Reach more buyers on campus</p>
        </div>
      </div>

      {/* Plans */}
      <div className={compact ? "divide-y" : "divide-y"} style={{ borderColor: "var(--border)" }}>
        {PLANS.map((plan) => {
          const Icon   = plan.icon;
          const isLoad = loading === plan.key;

          return (
            <motion.div
              key={plan.key}
              whileHover={{ backgroundColor: "var(--surface-raised)" }}
              transition={spring}
              className="flex items-center gap-3 px-5 py-3.5"
            >
              {/* Icon */}
              <div
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                style={{ background: plan.accentBg }}
              >
                <Icon size={15} style={{ color: plan.accent }} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold" style={{ color: "var(--on-surface)" }}>
                    {plan.name}
                  </span>
                  {"highlight" in plan && plan.highlight && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide"
                      style={{ background: "rgba(114,204,35,0.15)", color: "#5EB81B" }}
                    >
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  <span className="font-bold" style={{ color: plan.accent }}>{plan.price}</span>
                  <span>{plan.period}</span>
                  {" · "}{plan.tagline}
                </p>
                {!compact && (
                  <ul className="mt-1.5 space-y-0.5">
                    {plan.features.slice(0, 2).map((f) => (
                      <li key={f} className="flex items-center gap-1 text-[11px]" style={{ color: "var(--muted)" }}>
                        <Check size={9} style={{ color: plan.accent }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* CTA */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={spring}
                onClick={() => handleUpgrade(plan.key)}
                disabled={!!loading}
                className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
                style={{ background: plan.accent }}
              >
                <AnimatePresence mode="wait">
                  {isLoad ? (
                    <motion.span key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Loader2 size={12} className="animate-spin" />
                    </motion.span>
                  ) : (
                    <motion.span key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      Get
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
