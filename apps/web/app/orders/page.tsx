"use client";

import { useMemo, useState } from "react";
import { OrderCard } from "@/components/order-card";
import { AuthGate } from "@/components/auth-gate";
import { EmptyState, LoadingSkeleton, SectionHeading } from "@/components/ui";
import { useOrders } from "@/hooks/use-api";

const tabs = ["To Buy", "To Sell", "Completed"] as const;

export default function OrdersPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("To Buy");
  const { data: orders = [], isLoading } = useOrders();

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
        ) : visible.length ? (
          visible.map((order) => <OrderCard key={order.id} order={order} />)
        ) : (
          <EmptyState title="No orders here yet" description="Your marketplace activity will appear here once you buy or sell an item." />
        )}
      </div>
    </div>
    </AuthGate>
  );
}
