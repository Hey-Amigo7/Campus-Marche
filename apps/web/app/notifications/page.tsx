"use client";

import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useSWRConfig } from "swr";
import { api } from "@/lib/api";
import { cn, formatRelativeDate } from "@/lib/format";
import { AuthGate } from "@/components/auth-gate";
import { SectionHeading } from "@/components/ui";
import { useNotifications } from "@/hooks/use-api";

const iconByType: Record<string, string> = {
  order:         "🛒",
  order_status:  "📦",
  message:       "💬",
  review:        "⭐",
  payment:       "💳",
  payout:        "💰",
  admin_warning: "⚠️",
  system:        "📢",
};

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const { mutate } = useSWRConfig();

  const unreadCount = (notifications ?? []).filter((n) => !n.read).length;

  async function markAllRead() {
    await api.markNotificationsRead();
    await mutate("notifications");
  }

  return (
    <AuthGate>
      <div className="container-shell py-8 md:py-10">
        <SectionHeading
          title="Notifications"
          subtitle="Activity updates for your orders, messages, and listings."
          action={
            unreadCount > 0 ? (
              <button onClick={markAllRead} className="btn-secondary">
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            ) : null
          }
        />

        <div
          className="overflow-hidden rounded-2xl"
          style={{
            background:    "rgba(255,255,255,0.82)",
            backdropFilter:"blur(18px) saturate(150%)",
            border:        "1px solid rgba(226,232,240,0.70)",
            boxShadow:     "0 4px 24px rgba(15,23,42,0.07)",
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin" style={{ color: "#7FB685" }} />
            </div>
          ) : notifications && notifications.length > 0 ? (
            <ul className="divide-y" style={{ borderColor: "rgba(226,232,240,0.50)" }}>
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={cn("flex items-start gap-4 p-4 transition-colors")}
                  style={!notification.read ? { background: "rgba(127,182,133,0.06)" } : undefined}
                >
                  <span className="mt-0.5 text-xl" aria-hidden>
                    {iconByType[notification.type] ?? "🔔"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold" style={{ color: "#1E293B" }}>{notification.title}</p>
                    <p className="mt-0.5 text-sm" style={{ color: "#64748B" }}>{notification.body}</p>
                    <p className="mt-1 text-xs font-semibold" style={{ color: "#94A3B8" }}>
                      {formatRelativeDate(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.read ? (
                    <span
                      className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: "#7FB685" }}
                      aria-label="Unread"
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Bell className="h-10 w-10" style={{ color: "#CBD5E1" }} />
              <p className="font-black" style={{ color: "#1E293B" }}>All caught up!</p>
              <p className="text-sm" style={{ color: "#64748B" }}>
                You&apos;ll see order updates, messages, and alerts here.
              </p>
            </div>
          )}
        </div>
      </div>
    </AuthGate>
  );
}
