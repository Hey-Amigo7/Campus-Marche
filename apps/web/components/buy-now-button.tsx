"use client";

import { Loader2, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { hasAuthToken } from "@/lib/auth";
import { useToast } from "@/providers/toast-provider";

export function BuyNowButton({ productId, price }: { productId: string; price: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function buyNow() {
    if (!hasAuthToken()) {
      router.push(`/login?next=/products/${productId}`);
      return;
    }

    setLoading(true);
    try {
      const order = await api.createOrder({ productId });
      const payment = await api.initializePayment(order.id);

      if (payment.authorizationUrl) {
        window.location.href = payment.authorizationUrl;
        return;
      }

      toast(`Order created for GHS ${price.toLocaleString()}. Add Paystack keys to activate secure payment.`);
      router.push("/orders");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not create the order.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={buyNow} disabled={loading} className="btn-primary bg-brand-green hover:bg-green-700">
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingBag className="h-5 w-5" />}
      Buy now
    </button>
  );
}
