"use client";

import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useSWRConfig } from "swr";
import { api } from "@/lib/api";
import { cn, formatRelativeDate } from "@/lib/format";
import { AuthGate } from "@/components/auth-gate";
import { SectionHeading } from "@/components/ui";
import { useNotifications } from "@/hooks/use-api";

const iconByType: Record<string, string> = {
  order: "🛒",
  message: "💬",
  review: "⭐",
  system: "📢",
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

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
            </div>
          ) : notifications && notifications.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-4 p-4 transition-colors",
                    !notification.read && "bg-green-50/40",
                  )}
                >
                  <span className="mt-0.5 text-xl" aria-hidden>
                    {iconByType[notification.type] ?? "🔔"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-950">{notification.title}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{notification.body}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {formatRelativeDate(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.read ? (
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-green" aria-label="Unread" />
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Bell className="h-10 w-10 text-slate-300" />
              <p className="font-black text-slate-950">All caught up!</p>
              <p className="text-sm text-slate-500">
                You&apos;ll see order updates, messages, and alerts here.
              </p>
            </div>
          )}
        </div>
      </div>
    </AuthGate>
  );
}
