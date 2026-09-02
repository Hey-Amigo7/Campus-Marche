"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { OrderCard } from "@/components/order-card";
import { AuthGate } from "@/components/auth-gate";
import { EmptyState, LoadingSkeleton, SectionHeading } from "@/components/ui";
import { useOrders } from "@/hooks/use-api";

const tabs = ["To Buy", "To Sell", "Completed"] as const;

export default function OrdersPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("To Buy");
  const { data: orders = [], isLoading, error, mutate } = useOrders();

  const visible = useMemo(() => {
    if (tab === "Completed") return orders.filter((order) => order.status === "Completed" || order.status === "Cancelled");
    if (tab === "To Sell") return orders.filter((order) => order.role === "seller" && order.status !== "Completed");
    return orders.filter((order) => order.role === "buyer" && order.status !== "Completed" && order.status !== "Cancelled");
  }, [orders, tab]);

  return (
    <AuthGate>
    <div className="container-shell py-8 md:py-10">
      <SectionHeading title="Orders" subtitle="Track campus meetups, product handovers, and completed purchases." />
      <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`min-h-11 flex-1 rounded-xl px-4 text-sm font-black ${tab === item ? "bg-brand-navy text-white" : "text-slate-600 hover:bg-slate-50"}`}>
            {item}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl py-14 text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
              Couldn&apos;t load your orders. The server may be starting up.
            </p>
            <button
              onClick={() => mutate()}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black text-white transition-all hover:-translate-y-px active:scale-95"
              style={{ background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)" }}
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        ) : visible.length ? (
          visible.map((order) => <OrderCard key={order.id} order={order} onStatusChange={mutate} />)
        ) : (
          <EmptyState title="No orders here yet" description="Your marketplace activity will appear here once you buy or sell an item." />
        )}
      </div>
    </div>
    </AuthGate>
  );
}
