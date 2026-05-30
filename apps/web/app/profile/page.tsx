"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, Package, ShoppingBag,
  Edit3, Settings, LogOut, MapPin, Calendar, Plus,
  Star, ShieldCheck, Heart,
} from "lucide-react";
import { clearAuthToken } from "@/lib/auth";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import { useToast } from "@/providers/toast-provider";
import { useTheme } from "@/providers/theme-provider";
import { useProfile, useMyListings, useSavedItems, useOrders } from "@/hooks/use-api";
import { UserAvatar } from "@/components/navbar";
import { ProductCard } from "@/components/product-card";
import { PageEnter, FadeUp, ScrollStaggerList, StaggerItem } from "@/components/motion-primitives";
import type { Order } from "@/types";

const spring = { type: "spring", stiffness: 340, damping: 26 } as const;
const TABS = ["Listings", "Saved", "Orders", "Settings"] as const;
type Tab = (typeof TABS)[number];

/* ── Role badge ─────────────────────────────────────────────── */
function RoleBadge({ role, accountType }: { role?: string; accountType?: string }) {
  const label = accountType ?? (
    role === "ADMIN"  ? "Administrator" :
    role === "SELLER" ? "Seller" :
    "Member"
  );
  const emoji =
    role === "ADMIN"  ? "🛡️" :
    accountType === "Teacher" ? "🎓" :
    accountType === "Local vendor" ? "🏪" :
    "🎓";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{
        background: "rgba(114,204,35,0.12)",
        color:      "#5EB81B",
        border:     "1px solid rgba(114,204,35,0.25)",
      }}
    >
      {emoji} {label}
    </span>
  );
}

/* ── Tab empty state ────────────────────────────────────────── */
function EmptyTabState({
  icon, title, sub, cta, href,
}: {
  icon: string; title: string; sub: string; cta: string; href: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-16 text-center"
    >
      <span className="mb-4 text-5xl">{icon}</span>
      <h3 className="font-bold" style={{ color: "var(--on-surface)" }}>{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm" style={{ color: "var(--muted)" }}>{sub}</p>
      <Link
        href={href}
        className="mt-5 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
        style={{ background: "#72CC23" }}
      >
        <Plus size={15} /> {cta}
      </Link>
    </motion.div>
  );
}

/* ── Order row ─────────────────────────────────────────────── */
const ORDER_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  Completed:          { label: "Completed",    color: "var(--muted)",      bg: "var(--surface-raised)"       },
  Delivered:          { label: "Delivered",    color: "var(--muted)",      bg: "var(--surface-raised)"       },
  "Out for delivery": { label: "In Transit",   color: "var(--caramel)",    bg: "rgba(217,119,6,0.10)"        },
  "In progress":      { label: "In Progress",  color: "var(--green)",      bg: "rgba(22,163,74,0.10)"        },
  "Awaiting payment": { label: "Awaiting",     color: "var(--subtle)",     bg: "var(--surface-raised)"       },
  Disputed:           { label: "Disputed",     color: "#EF4444",           bg: "rgba(239,68,68,0.08)"        },
  Refunded:           { label: "Refunded",     color: "var(--muted)",      bg: "var(--surface-raised)"       },
};

function OrderRow({ order }: { order: Order }) {
  const cfg = ORDER_STATUS[order.status] ?? { label: order.status, color: "var(--muted)", bg: "var(--surface-raised)" };
  const img = order.product.imageUrl;

  return (
    <div
      className="flex items-center gap-4 rounded-2xl p-4 transition-colors hover:bg-[var(--surface-raised)]"
      style={{ border: "1px solid var(--border)" }}
    >
      <Link href={`/orders/${order.id}`} className="shrink-0 h-14 w-14 rounded-xl overflow-hidden" style={{ background: "var(--surface-raised)" }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={order.product.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-xl">📦</div>
        )}
      </Link>
      <div className="flex-1 min-w-0">
        <p className="line-clamp-1 text-sm font-semibold" style={{ color: "var(--on-surface)" }}>
          {order.product.title}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
          {formatRelativeDate(order.updatedAt)} · {formatCurrency(order.totalAmount ?? order.price ?? 0)}
        </p>
      </div>
      <span
        className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
        style={{ background: cfg.bg, color: cfg.color }}
      >
        {cfg.label}
      </span>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────── */
export default function ProfilePage() {
  const router = useRouter();
  const { success: toastSuccess } = useToast();
  const { setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("Listings");

  const { data: profile, isLoading } = useProfile();
  const { data: myListings } = useMyListings();
  const { data: savedItems } = useSavedItems();
  const { data: orders }     = useOrders();

  function handleLogout() {
    clearAuthToken();
    setTheme("classic");
    toastSuccess("Signed out successfully.");
    router.push("/");
    router.refresh();
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" style={{ color: "#72CC23" }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm" style={{ color: "var(--muted)" }}>Please sign in to view your profile.</p>
        <Link
          href="/login"
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: "#72CC23" }}
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <PageEnter className="min-h-screen pb-20">

      {/* ── Dark hero ──────────────────────────────────────────── */}
      <div
        className="relative pb-0 pt-10"
        style={{ background: "linear-gradient(180deg, rgba(9,9,11,0.96) 0%, rgba(9,9,11,0.92) 100%)" }}
      >
        {/* Background campus photo */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1400&q=40)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.08,
          }}
        />

        <div className="container-shell relative z-10">
          <FadeUp className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            {/* Avatar + info */}
            <div className="flex items-end gap-5">
              <div
                className="relative shrink-0 overflow-hidden rounded-2xl shadow-xl md:h-24 md:w-24"
                style={{
                  width: 80, height: 80,
                  border: "3px solid rgba(114,204,35,0.35)",
                }}
              >
                <UserAvatar avatar={profile.avatar} name={profile.name} size={80} className="rounded-none" />
                {profile.verified && (
                  <span
                    className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full"
                    style={{ background: "#72CC23" }}
                  >
                    <CheckCircle size={13} className="text-white" />
                  </span>
                )}
              </div>

              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-black text-white md:text-2xl">{profile.name}</h1>
                  <RoleBadge role={profile.role} accountType={profile.accountType} />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                  <span className="flex items-center gap-1">
                    <MapPin size={11} /> {profile.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={11} /> Joined {formatRelativeDate(profile.joined)}
                  </span>
                  {profile.handle && (
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>{profile.handle}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Header actions */}
            <div className="flex items-center gap-2 pb-1">
              <Link
                href="/sell"
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white"
                style={{ background: "#72CC23" }}
              >
                <Plus size={14} /> List Item
              </Link>
              <Link
                href="/profile/edit"
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color:      "rgba(255,255,255,0.70)",
                  border:     "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <Edit3 size={13} /> Edit
              </Link>
            </div>
          </FadeUp>

          {/* Stats row */}
          <FadeUp delay={0.08}>
            <div className="mt-6 grid grid-cols-4 gap-3 md:max-w-sm">
              {[
                { label: "Listings",  value: myListings?.length ?? 0 },
                { label: "Reviews",   value: profile.reviews          },
                { label: "Rating",    value: profile.rating > 0 ? `${profile.rating}★` : "—" },
                { label: "Verified",  value: profile.verified ? "Yes" : "No" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl p-3 text-center"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div className="text-lg font-black text-white">{s.value}</div>
                  <div className="mt-0.5 text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.40)" }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </FadeUp>

          {/* Tabs */}
          <div className="mt-7 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {TABS.map((tab) => (
              <button
                type="button"
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative shrink-0 rounded-t-xl px-5 py-2.5 text-sm font-semibold transition-colors"
                style={{ color: activeTab === tab ? "white" : "rgba(255,255,255,0.40)" }}
              >
                {activeTab === tab && (
                  <motion.span
                    layoutId="profile-tab-bg"
                    className="absolute inset-0 rounded-t-xl"
                    style={{ background: "var(--background)", boxShadow: "0 -2px 0 0 #72CC23 inset" }}
                    transition={spring}
                  />
                )}
                <span className="relative">{tab}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────── */}
      <div className="container-shell pt-6">
        <AnimatePresence mode="wait">

          {/* Listings tab */}
          {activeTab === "Listings" && (
            <motion.div
              key="listings"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={spring}
            >
              {!myListings || myListings.length === 0 ? (
                <EmptyTabState
                  icon="📦" title="No listings yet"
                  sub="Start selling by listing your first item — it's free."
                  cta="List an Item" href="/sell"
                />
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>
                      {myListings.length} active listing{myListings.length !== 1 ? "s" : ""}
                    </p>
                    <Link
                      href="/sell"
                      className="flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: "#5EB81B" }}
                    >
                      <Plus size={13} /> Add new
                    </Link>
                  </div>
                  <ScrollStaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" staggerDelay={0.05}>
                    {myListings.map((p) => (
                      <StaggerItem key={p.id}>
                        <ProductCard product={p} />
                      </StaggerItem>
                    ))}
                  </ScrollStaggerList>
                </>
              )}
            </motion.div>
          )}

          {/* Saved tab */}
          {activeTab === "Saved" && (
            <motion.div
              key="saved"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={spring}
            >
              {!savedItems || savedItems.length === 0 ? (
                <EmptyTabState
                  icon="❤️" title="Nothing saved yet"
                  sub="Tap the bookmark on any listing to save it here."
                  cta="Browse Products" href="/products"
                />
              ) : (
                <ScrollStaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" staggerDelay={0.05}>
                  {savedItems.map((p) => (
                    <StaggerItem key={p.id}>
                      <ProductCard product={p} />
                    </StaggerItem>
                  ))}
                </ScrollStaggerList>
              )}
            </motion.div>
          )}

          {/* Orders tab */}
          {activeTab === "Orders" && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={spring}
              className="space-y-3"
            >
              {!orders || orders.length === 0 ? (
                <EmptyTabState
                  icon="🛒" title="No orders yet"
                  sub="Once you buy something it will show up here."
                  cta="Browse Products" href="/products"
                />
              ) : (
                <>
                  {orders.slice(0, 10).map((order) => (
                    <OrderRow key={order.id} order={order} />
                  ))}
                  {orders.length > 10 && (
                    <Link
                      href="/orders"
                      className="block text-center text-xs font-semibold py-3 transition-colors"
                      style={{ color: "#5EB81B" }}
                    >
                      View all {orders.length} orders →
                    </Link>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* Settings tab */}
          {activeTab === "Settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={spring}
            >
              <div
                className="max-w-md divide-y overflow-hidden rounded-2xl"
                style={{ border: "1px solid var(--border)" }}
              >
                {[
                  { icon: Edit3,       label: "Edit Profile",     href: "/profile/edit",    desc: "Update your name, avatar, and bio"      },
                  { icon: Package,     label: "My Listings",      href: "/profile/listings", desc: "Manage your active and archived listings" },
                  { icon: Heart,       label: "Saved Items",      href: "/saved",            desc: "Items you've bookmarked"                  },
                  { icon: ShoppingBag, label: "My Orders",        href: "/orders",           desc: "Track your purchases and escrow status"   },
                  { icon: Star,        label: "Wallet & Payouts", href: "/wallet",           desc: "Balance, MoMo payouts, and history"       },
                  { icon: Settings,    label: "Settings",         href: "/settings",         desc: "Appearance, notifications, security"      },
                  { icon: ShieldCheck, label: "Verify Phone",     href: "/verify-phone",     desc: "Add phone verification to your account"   },
                ].map(({ icon: Icon, label, href, desc }) => (
                  <Link
                    key={label}
                    href={href}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--surface-raised)]"
                  >
                    <div
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                      style={{ background: "var(--green-surface)", color: "var(--green)" }}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>{label}</p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>{desc}</p>
                    </div>
                  </Link>
                ))}

                {/* Logout */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-4 px-5 py-4 transition-colors hover:bg-[rgba(239,68,68,0.05)]"
                >
                  <div
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                    style={{ background: "rgba(239,68,68,0.08)" }}
                  >
                    <LogOut size={16} style={{ color: "#EF4444" }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "#EF4444" }}>Sign Out</p>
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </PageEnter>
  );
}
