"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, MessageCircle, ShoppingBag, Star,
  CheckCircle, Package, CreditCard, Wallet,
  Zap, CheckCheck, Loader2,
} from "lucide-react";
import { useSWRConfig } from "swr";
import { api } from "@/lib/api";
import { AuthGate } from "@/components/auth-gate";
import { formatRelativeDate } from "@/lib/format";
import { PageEnter, FadeUp } from "@/components/motion-primitives";
import { useCombinedNotifications, type CombinedNotification } from "@/hooks/use-combined-notifications";

const spring = { type: "spring", stiffness: 340, damping: 26 } as const;

type FilterTab = "All" | "Unread" | "Messages" | "Orders";
const FILTER_TABS: FilterTab[] = ["All", "Unread", "Messages", "Orders"];

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  message:       { icon: MessageCircle, color: "#16A34A",  bg: "rgba(22,163,74,0.10)"   },
  order:         { icon: Package,       color: "#D97706",  bg: "rgba(217,119,6,0.10)"   },
  order_status:  { icon: ShoppingBag,   color: "#D97706",  bg: "rgba(217,119,6,0.10)"   },
  payment:       { icon: CreditCard,    color: "#2563EB",  bg: "rgba(37,99,235,0.10)"   },
  escrow:        { icon: CreditCard,    color: "#2563EB",  bg: "rgba(37,99,235,0.10)"   },
  payout:        { icon: Wallet,        color: "#7C3AED",  bg: "rgba(124,58,237,0.10)"  },
  subscription:  { icon: Zap,           color: "#16A34A",  bg: "rgba(22,163,74,0.10)"   },
  review:        { icon: Star,          color: "#F59E0B",  bg: "rgba(245,158,11,0.10)"  },
  admin_warning: { icon: Zap,           color: "#EF4444",  bg: "rgba(239,68,68,0.08)"   },
  system:        { icon: Zap,           color: "#16A34A",  bg: "rgba(22,163,74,0.10)"   },
};

const DEFAULT_CFG = { icon: Bell, color: "var(--muted)", bg: "var(--surface-raised)" };

function NotifItem({
  notif,
  onRead,
}: {
  notif: CombinedNotification;
  onRead: (id: string) => void;
}) {
  const cfg = TYPE_CONFIG[notif.type] ?? DEFAULT_CFG;
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={spring}
      className="relative flex gap-3.5 px-4 py-4 transition-colors hover:bg-[var(--surface-raised)]"
      style={{
        borderBottom: "1px solid var(--border)",
        background:   notif.read ? "transparent" : "rgba(22,163,74,0.03)",
      }}
    >
      {/* Unread side indicator */}
      {!notif.read && (
        <span
          className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
          style={{ background: "var(--green)" }}
        />
      )}

      {/* Icon circle */}
      <div
        className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl"
        style={{ background: cfg.bg }}
      >
        <Icon size={17} style={{ color: cfg.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className="text-sm font-semibold leading-snug"
            style={{ color: "var(--on-surface)" }}
          >
            {notif.title}
          </p>
          {!notif.read && !notif.synthetic && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRead(notif.id); }}
              className="shrink-0 rounded-md p-0.5 transition-colors hover:bg-[var(--surface-raised)]"
              title="Mark as read"
            >
              <CheckCircle size={14} style={{ color: "var(--green)" }} />
            </button>
          )}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed line-clamp-2" style={{ color: "var(--muted)" }}>
          {notif.body}
        </p>
        <p className="mt-1.5 text-[10px] font-semibold" style={{ color: "var(--subtle)" }}>
          {formatRelativeDate(notif.createdAt)}
        </p>
      </div>
    </motion.div>
  );
}

function NotificationsContent() {
  const { data: notifications, unreadCount, isLoading } = useCombinedNotifications();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("All");
  const { mutate } = useSWRConfig();

  async function markRead(id: string) {
    // Only real DB notifications can be marked read via API (synthetic ones are just UI)
    await api.markNotificationsRead();
    await mutate("notifications");
  }

  async function markAllRead() {
    await api.markNotificationsRead();
    await mutate("notifications");
  }

  const filtered = notifications.filter((n) => {
    if (activeFilter === "Unread")   return !n.read;
    if (activeFilter === "Messages") return n.type === "message";
    if (activeFilter === "Orders")   return n.type === "order" || n.type === "order_status" || n.type === "payment" || n.type === "escrow";
    return true;
  });

  const msgCount   = notifications.filter((n) => n.type === "message").length;
  const orderCount = notifications.filter((n) => ["order","order_status","payment","escrow"].includes(n.type)).length;

  return (
    <PageEnter className="min-h-screen pb-20">

      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="container-shell max-w-2xl py-8">
          <FadeUp>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black" style={{ color: "var(--on-surface)" }}>
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-black text-white"
                    style={{ background: "var(--green)" }}
                  >
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                  style={{ color: "var(--green)" }}
                >
                  <CheckCheck size={13} />
                  Mark all read
                </button>
              )}
            </div>
          </FadeUp>

          {/* Filter tabs */}
          <FadeUp delay={0.06}>
            <div className="mt-5 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {FILTER_TABS.map((tab) => {
                const count =
                  tab === "Unread"   ? unreadCount :
                  tab === "Messages" ? msgCount    :
                  tab === "Orders"   ? orderCount  :
                  null;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveFilter(tab)}
                    className="relative shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-all"
                    style={{
                      color:      activeFilter === tab ? "white" : "var(--muted)",
                      background: activeFilter === tab ? "var(--navy)" : "var(--surface-raised)",
                      border:     `1px solid ${activeFilter === tab ? "transparent" : "var(--border)"}`,
                    }}
                  >
                    {tab}
                    {count !== null && count > 0 && (
                      <span
                        className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-black"
                        style={{
                          background: activeFilter === tab ? "rgba(255,255,255,0.20)" : "var(--border)",
                          color:      activeFilter === tab ? "white" : "var(--muted)",
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </FadeUp>
        </div>
      </div>

      {/* List */}
      <div className="container-shell max-w-2xl pt-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin" style={{ color: "var(--green)" }} />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center py-20 text-center"
              >
                <Bell size={40} className="mb-4" style={{ color: "var(--subtle)" }} />
                <h3 className="font-bold" style={{ color: "var(--on-surface)" }}>
                  {activeFilter === "Unread" ? "You're all caught up!" : "No notifications here"}
                </h3>
                <p className="mt-1.5 max-w-xs text-sm" style={{ color: "var(--muted)" }}>
                  {activeFilter === "Unread"
                    ? "No unread notifications right now."
                    : `No ${activeFilter.toLowerCase()} notifications yet.`}
                </p>
              </motion.div>
            ) : (
              filtered.map((notif) =>
                notif.href ? (
                  <Link key={notif.id} href={notif.href} onClick={() => markRead(notif.id)}>
                    <NotifItem notif={notif} onRead={markRead} />
                  </Link>
                ) : (
                  <NotifItem key={notif.id} notif={notif} onRead={markRead} />
                )
              )
            )}
          </AnimatePresence>
        )}
      </div>
    </PageEnter>
  );
}

export default function NotificationsPage() {
  return (
    <AuthGate>
      <NotificationsContent />
    </AuthGate>
  );
}
