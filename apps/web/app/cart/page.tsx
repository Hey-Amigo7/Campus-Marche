"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Trash2, Plus, Minus, ArrowRight,
  MapPin, CheckCircle, Shield, Loader2,
} from "lucide-react";
import { useState } from "react";
import { useCart, type CartItem } from "@/providers/cart-provider";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { hasAuthToken } from "@/lib/auth";
import { useToast } from "@/providers/toast-provider";
import { FadeUp, PageEnter } from "@/components/motion-primitives";
import { ProductArt } from "@/components/product-card";

const spring = { type: "spring", stiffness: 340, damping: 26 } as const;

/* ── Cart item row ─────────────────────────────────────────────── */
function CartItemRow({
  item,
  onRemove,
  onQtyChange,
}: {
  item: CartItem;
  onRemove: (id: string) => void;
  onQtyChange: (id: string, qty: number) => void;
}) {
  const { product, qty } = item;
  const imageUrl = product.imageUrls?.[0] ?? product.imageUrl;
  const lineTotal = product.price * qty;

  return (
    <motion.div
      layout
      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
      transition={spring}
      className="flex gap-4 py-4"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {/* Image */}
      <Link href={`/products/${product.id}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={product.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full">
            <ProductArt style={product.imageStyle} title={product.title} />
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between min-w-0">
        <div>
          <Link
            href={`/products/${product.id}`}
            className="line-clamp-2 text-sm font-semibold leading-snug"
            style={{ color: "var(--on-surface)" }}
          >
            {product.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" style={{ color: "var(--muted)" }}>
            <span className="capitalize">{product.condition}</span>
            {product.location && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5">
                  <MapPin size={10} /> {product.location}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          {/* Qty controls */}
          <div
            className="flex items-center overflow-hidden rounded-xl"
            style={{ border: "1.5px solid var(--border)" }}
          >
            <button
              type="button"
              onClick={() => onQtyChange(product.id, qty - 1)}
              disabled={qty <= 1}
              className="grid h-8 w-8 place-items-center transition-colors hover:bg-[var(--surface-raised)] disabled:opacity-30"
              style={{ color: "var(--on-surface)" }}
            >
              <Minus size={12} />
            </button>
            <span className="w-8 text-center text-sm font-bold" style={{ color: "var(--on-surface)" }}>
              {qty}
            </span>
            <button
              type="button"
              onClick={() => onQtyChange(product.id, qty + 1)}
              className="grid h-8 w-8 place-items-center transition-colors hover:bg-[var(--surface-raised)]"
              style={{ color: "var(--on-surface)" }}
            >
              <Plus size={12} />
            </button>
          </div>

          {/* Line total */}
          <p className="text-sm font-black" style={{ color: "var(--on-surface)" }}>
            {formatCurrency(lineTotal)}
          </p>
        </div>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(product.id)}
        className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors hover:bg-[rgba(239,68,68,0.08)]"
        style={{ color: "var(--muted)" }}
        aria-label="Remove item"
      >
        <Trash2 size={14} />
      </button>
    </motion.div>
  );
}

/* ── Order summary sidebar ─────────────────────────────────────── */
const SERVICE_FEE_PCT = 2.5;

function OrderSummary({
  items,
  onCheckout,
  checkingOut,
}: {
  items: CartItem[];
  onCheckout: () => void;
  checkingOut: boolean;
}) {
  const subtotal = items.reduce((acc, i) => acc + i.product.price * i.qty, 0);
  const serviceFee = Math.round(subtotal * (SERVICE_FEE_PCT / 100) * 100) / 100;
  const total = Math.round((subtotal + serviceFee) * 100) / 100;
  const totalItems = items.reduce((a, i) => a + i.qty, 0);

  return (
    <div
      className="rounded-2xl p-5 sticky top-24"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h2 className="mb-4 text-base font-black" style={{ color: "var(--on-surface)" }}>Order summary</h2>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span style={{ color: "var(--muted)" }}>Subtotal ({totalItems} item{totalItems !== 1 ? "s" : ""})</span>
          <span className="font-semibold" style={{ color: "var(--on-surface)" }}>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: "var(--muted)" }}>Service fee (2.5%)</span>
          <span className="font-semibold" style={{ color: "var(--muted)" }}>{formatCurrency(serviceFee)}</span>
        </div>
      </div>

      <div className="my-4" style={{ borderTop: "1px solid var(--border)" }} />

      <div className="flex justify-between font-black">
        <span style={{ color: "var(--on-surface)" }}>Total</span>
        <span style={{ color: "var(--on-surface)" }}>{formatCurrency(total)}</span>
      </div>

      <motion.button
        type="button"
        onClick={onCheckout}
        disabled={checkingOut || items.length === 0}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={spring}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white disabled:opacity-50"
        style={{ background: "var(--green)" }}
      >
        {checkingOut ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
        {checkingOut
          ? "Creating order…"
          : items.length === 1
          ? "Proceed to payment"
          : "Place all orders"}
      </motion.button>

      {items.length > 1 && (
        <p className="mt-2 text-center text-[11px] leading-4" style={{ color: "var(--muted)" }}>
          Each item is a separate order. You&apos;ll pay for each one individually.
        </p>
      )}

      <div className="mt-4 space-y-2">
        {[
          { icon: Shield,       text: "Campus-verified sellers" },
          { icon: CheckCircle,  text: "Card & Mobile Money accepted" },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
            <Icon size={12} style={{ color: "var(--green)" }} /> {text}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */
export default function CartPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { items, removeFromCart, updateQty, clearCart } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);

  function handleRemove(id: string) {
    removeFromCart(id);
    toast("Item removed from cart.");
  }

  function handleQtyChange(id: string, qty: number) {
    if (qty < 1) return;
    updateQty(id, qty);
  }

  async function handleCheckout() {
    if (!hasAuthToken()) {
      router.push("/login?next=/cart");
      return;
    }
    if (items.length === 0) return;

    setCheckingOut(true);
    try {
      if (items.length === 1) {
        // Single item — create order then land on the order page where payment happens
        const order = await api.createOrder({ productId: items[0]!.product.id });
        clearCart();
        router.push(`/orders/${order.id}`);
      } else {
        // Multiple items — create all orders then route to orders list
        const results = await Promise.allSettled(
          items.map(i => api.createOrder({ productId: i.product.id })),
        );
        const succeeded = results.filter(r => r.status === "fulfilled").length;
        const failed    = results.filter(r => r.status === "rejected").length;

        if (succeeded > 0) {
          clearCart();
          toast(
            failed > 0
              ? `${succeeded} order${succeeded > 1 ? "s" : ""} created (${failed} failed). Pay for each in My Orders.`
              : `${succeeded} order${succeeded > 1 ? "s" : ""} created — tap each to complete payment.`,
          );
          router.push("/orders");
        } else {
          toast("Could not create orders. Please try again.");
        }
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  }

  /* Empty state */
  if (items.length === 0) {
    return (
      <PageEnter className="min-h-screen">
        <div className="container-shell flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="grid h-20 w-20 place-items-center rounded-3xl"
            style={{ background: "rgba(114,204,35,0.10)", border: "1px solid rgba(114,204,35,0.20)" }}
          >
            <ShoppingCart size={36} style={{ color: "var(--green)" }} />
          </motion.div>
          <h2 className="text-xl font-black" style={{ color: "var(--on-surface)" }}>Your cart is empty</h2>
          <p className="max-w-xs text-sm" style={{ color: "var(--muted)" }}>
            Browse listings and add items to review before buying.
          </p>
          <Link
            href="/products"
            className="mt-2 flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black text-white"
            style={{ background: "var(--green)" }}
          >
            <ShoppingCart size={15} /> Browse listings
          </Link>
        </div>
      </PageEnter>
    );
  }

  const totalItems = items.reduce((a, i) => a + i.qty, 0);

  return (
    <PageEnter className="min-h-screen pb-20">
      {/* Hero header */}
      <div className="relative overflow-hidden py-12 text-white"
        style={{ background: "linear-gradient(135deg, #0F172A 0%, #102542 55%, #1a3a2a 100%)" }}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(114,204,35,0.18), transparent 65%)" }} />
        <div className="container-shell">
          <p className="mb-2 text-xs font-black uppercase tracking-widest" style={{ color: "#72CC23" }}>
            Cart
          </p>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">Your Cart</h1>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-black text-white"
              style={{ background: "rgba(114,204,35,0.25)", border: "1px solid rgba(114,204,35,0.40)" }}
            >
              {totalItems} item{totalItems !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="mt-3 max-w-lg text-base leading-7" style={{ color: "#94A3B8" }}>
            Review your items before placing your orders.
          </p>
        </div>
      </div>

      <div className="container-shell py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* Items list */}
          <FadeUp>
            <div
              className="rounded-2xl p-5"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <AnimatePresence>
                {items.map(item => (
                  <CartItemRow
                    key={item.product.id}
                    item={item}
                    onRemove={handleRemove}
                    onQtyChange={handleQtyChange}
                  />
                ))}
              </AnimatePresence>

              <Link
                href="/products"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: "var(--green)" }}
              >
                ← Continue shopping
              </Link>
            </div>

            {/* Seller breakdown */}
            <div
              className="mt-4 rounded-2xl p-5"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <h3 className="mb-3 text-sm font-black" style={{ color: "var(--on-surface)" }}>
                Sellers in this order
              </h3>
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3">
                    <div
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-black text-white"
                      style={{ background: "linear-gradient(135deg, #1E293B, #0F172A)" }}
                    >
                      {item.product.seller.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold" style={{ color: "var(--on-surface)" }}>
                        {item.product.seller.name}
                      </p>
                      <p className="truncate text-xs" style={{ color: "var(--muted)" }}>
                        {item.product.title.slice(0, 40)}{item.product.title.length > 40 ? "…" : ""}
                      </p>
                    </div>
                    {item.product.seller.verified && (
                      <span className="shrink-0 text-xs font-bold" style={{ color: "var(--green)" }}>✓ Verified</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>

          {/* Sidebar */}
          <FadeUp delay={0.06}>
            <OrderSummary
              items={items}
              onCheckout={handleCheckout}
              checkingOut={checkingOut}
            />
          </FadeUp>
        </div>
      </div>
    </PageEnter>
  );
}
