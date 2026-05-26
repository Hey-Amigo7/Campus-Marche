"use client";

import { CalendarCheck, Loader2, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { hasAuthToken } from "@/lib/auth";
import { useToast } from "@/providers/toast-provider";

export function BuyNowButton({
  productId,
  price: _,
  listingType,
}: {
  productId: string;
  price: number;
  listingType?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isService = listingType === "service";

  async function handleClick() {
    if (!hasAuthToken()) {
      router.push(`/login?next=/products/${productId}`);
      return;
    }

    setLoading(true);
    try {
      const order = await api.createOrder({ productId });
      router.push(`/orders/${order.id}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not create the order.");
      setLoading(false);
    }
  }

  return (
    <button onClick={handleClick} disabled={loading} className="btn-primary">
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : isService ? (
        <CalendarCheck className="h-5 w-5" />
      ) : (
        <ShoppingBag className="h-5 w-5" />
      )}
      {isService ? "Book now" : "Buy now"}
    </button>
  );
}
