import Link from "next/link";
import { MapPin, MessageCircle } from "lucide-react";
import type { Order } from "@/types";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import { ProductArt } from "@/components/product-card";

const STATUS_COLORS: Record<string, string> = {
  "Payment pending": "bg-amber-100 text-amber-700",
  "In progress": "bg-blue-100 text-blue-700",
  "Out for delivery": "bg-sky-100 text-sky-700",
  Completed: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

export function OrderCard({ order }: { order: Order }) {
  const statusClass = STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-700";

  return (
    <article className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[120px_1fr_auto] sm:items-center">
      <ProductArt style={order.product.imageStyle} className="min-h-28 rounded-xl" />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass}`}>{order.status}</span>
          <span className="text-xs font-semibold text-slate-400">{formatRelativeDate(order.updatedAt)}</span>
        </div>
        <h3 className="mt-3 text-lg font-black text-slate-950">{order.product.title}</h3>
        <p className="mt-1 text-base font-black text-brand-navy">{formatCurrency(order.product.price)}</p>
        {order.meetupLocation ? (
          <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-slate-500">
            <MapPin className="h-4 w-4" />
            {order.meetupLocation}{order.counterpart ? ` · ${order.counterpart}` : ""}
          </p>
        ) : null}
      </div>
      <div className="flex gap-2 sm:flex-col">
        <Link href={`/orders/${order.id}`} className="btn-primary min-h-10 flex-1 rounded-xl px-3 py-2 text-center text-xs">
          View
        </Link>
        <button className="btn-secondary min-h-10 flex-1 rounded-xl px-3 py-2 text-xs">
          <MessageCircle className="h-4 w-4" />
          Chat
        </button>
      </div>
    </article>
  );
}
