"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  ArrowDownCircle, ArrowUpCircle, ArrowLeft,
  Clock, CheckCircle2, ShoppingBag, Store,
  Loader2, ReceiptText,
} from "lucide-react";
import { useOrders, usePayouts, useWallet } from "@/hooks/use-api";
import { PAID_ESCROW_STATES, PAYOUT_METHOD_LABELS, PAYOUT_STATUS_LABELS, type EscrowStatus, type Payout } from "@/types";
import { AuthGate } from "@/components/auth-gate";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import type { Order } from "@/types";

/* ── Types ──────────────────────────────────────────────────────────── */
type TxType = "purchase" | "sale" | "payout";
type FilterTab = "all" | "purchases" | "sales" | "payouts";

interface TxItem {
  id: string;
  type: TxType;
  date: string;
  title: string;
  subtitle: string;
  amount: number;
  status: string;
  href?: string;
  failureReason?: string | null;
}

/* ── Helpers ────────────────────────────────────────────────────────── */
const DEFAULT_STATUS_COLORS = { bg: "rgba(148,163,184,0.10)", text: "#64748B" };

const PAYOUT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING:    { bg: "rgba(245,158,11,0.10)",  text: "#B45309" },
  APPROVED:   { bg: "rgba(59,130,246,0.10)",  text: "#1D4ED8" },
  PROCESSING: { bg: "rgba(14,165,233,0.10)",  text: "#0369A1" },
  COMPLETED:  { bg: "rgba(22,163,74,0.10)",   text: "#15803D" },
  FAILED:     { bg: "rgba(239,68,68,0.10)",   text: "#B91C1C" },
  CANCELLED:  DEFAULT_STATUS_COLORS,
};

const ESCROW_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING_PAYMENT:     { bg: "rgba(148,163,184,0.10)", text: "#64748B" },
  PAYMENT_INITIALIZED: { bg: "rgba(245,158,11,0.10)",  text: "#B45309" },
  PAYMENT_VERIFIED:    { bg: "rgba(59,130,246,0.10)",  text: "#1D4ED8" },
  ESCROW_HELD:         { bg: "rgba(14,165,233,0.10)",  text: "#0369A1" },
  PROCESSING:          { bg: "rgba(14,165,233,0.10)",  text: "#0369A1" },
  SHIPPED:             { bg: "rgba(99,102,241,0.10)",  text: "#4338CA" },
  DELIVERED:           { bg: "rgba(22,163,74,0.10)",   text: "#15803D" },
  RELEASE_PENDING:     { bg: "rgba(22,163,74,0.10)",   text: "#15803D" },
  RELEASED:            { bg: "rgba(22,163,74,0.10)",   text: "#15803D" },
  REFUNDED:            { bg: "rgba(148,163,184,0.10)", text: "#64748B" },
  FAILED:              { bg: "rgba(239,68,68,0.10)",   text: "#B91C1C" },
};

const ESCROW_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT:     "Unpaid",
  PAYMENT_INITIALIZED: "Payment initiated",
  PAYMENT_VERIFIED:    "Verified",
  ESCROW_HELD:         "In escrow",
  PROCESSING:          "Processing",
  SHIPPED:             "Shipped",
  DELIVERED:           "Delivered",
  RELEASE_PENDING:     "Releasing",
  RELEASED:            "Completed",
  REFUNDED:            "Refunded",
  FAILED:              "Failed",
  DISPUTED:            "Disputed",
};

function buildTxItems(orders: Order[], payouts: Payout[]): TxItem[] {
  const items: TxItem[] = [];

  for (const order of orders) {
    const escrow = (order.escrowStatus ?? "PENDING_PAYMENT") as EscrowStatus;
    const isPaid = PAID_ESCROW_STATES.includes(escrow);
    const role = order.role ?? "buyer";
    const productTitle = order.product?.title ?? "Order";

    if (role === "buyer" && isPaid) {
      items.push({
        id: `order-buy-${order.id}`,
        type: "purchase",
        date: order.updatedAt,
        title: productTitle,
        subtitle: `Purchased from ${order.counterpart ?? "seller"}`,
        amount: order.totalAmount ?? order.price ?? 0,
        status: escrow,
        href: `/orders/${order.id}`,
      });
    } else if (role === "seller" && isPaid) {
      items.push({
        id: `order-sell-${order.id}`,
        type: "sale",
        date: order.updatedAt,
        title: productTitle,
        subtitle: `Sold to ${order.counterpart ?? "buyer"}`,
        amount: order.sellerAmount ?? order.price ?? 0,
        status: escrow,
        href: `/orders/${order.id}`,
      });
    }
  }

  for (const payout of payouts) {
    items.push({
      id: `payout-${payout.id}`,
      type: "payout",
      date: payout.createdAt,
      title: PAYOUT_METHOD_LABELS[payout.payoutMethod] ?? payout.payoutMethod,
      subtitle: "Withdrawal",
      amount: payout.amount,
      status: payout.status,
      failureReason: payout.failureReason,
    });
  }

  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/* ── Stat card ──────────────────────────────────────────────────────── */
function StatCard({ label, value, icon, accent }: {
  label: string; value: string; icon: React.ReactNode; accent: string;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
          style={{ background: accent + "18", color: accent }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</p>
          <p className="mt-0.5 text-lg font-black" style={{ color: "var(--on-surface)" }}>{value}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Transaction row ────────────────────────────────────────────────── */
function TxRow({ tx }: { tx: TxItem }) {
  const isPurchase = tx.type === "purchase";
  const isSale     = tx.type === "sale";
  const isPayout   = tx.type === "payout";

  const statusColors = isPayout
    ? (PAYOUT_STATUS_COLORS[tx.status] ?? DEFAULT_STATUS_COLORS)
    : (ESCROW_STATUS_COLORS[tx.status] ?? DEFAULT_STATUS_COLORS);

  const statusLabel = isPayout
    ? (PAYOUT_STATUS_LABELS[tx.status as keyof typeof PAYOUT_STATUS_LABELS] ?? tx.status)
    : (ESCROW_STATUS_LABELS[tx.status] ?? tx.status);

  const amountColor = isPurchase ? "#B91C1C" : "#15803D";
  const amountSign  = isPurchase ? "−" : "+";

  const icon = isPurchase ? (
    <ShoppingBag className="h-4 w-4" />
  ) : isSale ? (
    <Store className="h-4 w-4" />
  ) : (
    <ArrowDownCircle className="h-4 w-4" />
  );

  const iconAccent = isPurchase ? "#B91C1C" : isPayout ? "#7C3AED" : "#15803D";

  const inner = (
    <div
      className="flex items-center gap-4 rounded-2xl px-5 py-4 transition-all"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Icon */}
      <div
        className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
        style={{ background: iconAccent + "15", color: iconAccent }}
      >
        {icon}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black" style={{ color: "var(--on-surface)" }}>{tx.title}</p>
        <p className="mt-0.5 truncate text-xs font-semibold" style={{ color: "var(--muted)" }}>
          {tx.subtitle} · {formatRelativeDate(tx.date)}
        </p>
        {tx.failureReason && (
          <p className="mt-0.5 truncate text-xs font-semibold text-red-600">{tx.failureReason}</p>
        )}
      </div>

      {/* Status + amount */}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-bold"
          style={{ background: statusColors.bg, color: statusColors.text }}
        >
          {statusLabel}
        </span>
        <span className="text-sm font-black" style={{ color: amountColor }}>
          {amountSign}{formatCurrency(tx.amount)}
        </span>
      </div>
    </div>
  );

  return tx.href ? (
    <Link href={tx.href} className="block hover:opacity-90 transition-opacity">
      {inner}
    </Link>
  ) : (
    <div>{inner}</div>
  );
}

/* ── Filter tabs ────────────────────────────────────────────────────── */
const TABS: { id: FilterTab; label: string }[] = [
  { id: "all",       label: "All" },
  { id: "purchases", label: "Purchases" },
  { id: "sales",     label: "Sales" },
  { id: "payouts",   label: "Payouts" },
];

/* ── Page ──────────────────────────────────────────────────────────── */
function TransactionsContent() {
  const { data: orders,  isLoading: ordersLoading  } = useOrders();
  const { data: payouts, isLoading: payoutsLoading } = usePayouts();
  const { data: wallet } = useWallet();
  const [filter, setFilter] = useState<FilterTab>("all");

  const allTx = useMemo(
    () => buildTxItems(orders ?? [], payouts ?? []),
    [orders, payouts],
  );

  const filtered = useMemo(() => {
    if (filter === "all")       return allTx;
    if (filter === "purchases") return allTx.filter(t => t.type === "purchase");
    if (filter === "sales")     return allTx.filter(t => t.type === "sale");
    if (filter === "payouts")   return allTx.filter(t => t.type === "payout");
    return allTx;
  }, [allTx, filter]);

  const totalSpent    = useMemo(() => allTx.filter(t => t.type === "purchase").reduce((s, t) => s + t.amount, 0), [allTx]);
  const totalEarned   = useMemo(() => allTx.filter(t => t.type === "sale" && t.status === "RELEASED").reduce((s, t) => s + t.amount, 0), [allTx]);
  const totalWithdrawn = wallet?.totalWithdrawn ?? 0;

  const isLoading = ordersLoading || payoutsLoading;

  return (
    <div className="container-shell py-8 md:py-10">
      {/* Header */}
      <div className="mb-7 flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors hover:bg-slate-100"
          style={{ color: "var(--muted)" }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--on-surface)" }}>Transactions</h1>
          <p className="text-sm font-semibold" style={{ color: "var(--muted)" }}>Your full payment history</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-7 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total spent"
          value={formatCurrency(totalSpent)}
          icon={<ArrowUpCircle className="h-4 w-4" />}
          accent="#B91C1C"
        />
        <StatCard
          label="Total earned"
          value={formatCurrency(totalEarned)}
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent="#15803D"
        />
        <StatCard
          label="Total withdrawn"
          value={formatCurrency(totalWithdrawn)}
          icon={<ArrowDownCircle className="h-4 w-4" />}
          accent="#7C3AED"
        />
      </div>

      {/* Filter tabs */}
      <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map(tab => {
          const count = tab.id === "all" ? allTx.length
            : tab.id === "purchases" ? allTx.filter(t => t.type === "purchase").length
            : tab.id === "sales"     ? allTx.filter(t => t.type === "sale").length
            : allTx.filter(t => t.type === "payout").length;

          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition-all"
              style={
                filter === tab.id
                  ? { background: "var(--green)", color: "#fff" }
                  : { background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }
              }
            >
              {tab.label}
              {count > 0 && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-xs"
                  style={
                    filter === tab.id
                      ? { background: "rgba(255,255,255,0.25)" }
                      : { background: "var(--border)" }
                  }
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Transaction list */}
      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin" style={{ color: "var(--green)" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex min-h-[30vh] flex-col items-center justify-center rounded-2xl p-10 text-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <ReceiptText className="mx-auto h-10 w-10" style={{ color: "var(--border)" }} />
          <p className="mt-4 text-sm font-black" style={{ color: "var(--on-surface)" }}>
            {filter === "all" ? "No transactions yet" : `No ${filter} yet`}
          </p>
          <p className="mt-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>
            {filter === "purchases"
              ? "Completed purchases will appear here."
              : filter === "sales"
              ? "Sales where buyers have paid will show here."
              : filter === "payouts"
              ? "Payout requests appear here."
              : "Buy or sell something to see your transaction history."}
          </p>
          {filter === "all" && (
            <Link href="/browse" className="btn-primary mt-5 text-sm">
              Browse listings
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(tx => <TxRow key={tx.id} tx={tx} />)}
        </div>
      )}

      {/* Wallet link for sellers */}
      {filter !== "payouts" && (payouts ?? []).length > 0 && (
        <div className="mt-6 text-center">
          <Link
            href="/wallet"
            className="text-sm font-bold hover:underline"
            style={{ color: "var(--green)" }}
          >
            Manage your wallet &amp; request payouts →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <AuthGate>
      <TransactionsContent />
    </AuthGate>
  );
}
