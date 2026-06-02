"use client";

import { Check, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/providers/cart-provider";
import type { Product } from "@/types";

export function AddToCartButton({ product }: { product: Product }) {
  const { addToCart, isInCart } = useCart();
  const [added, setAdded] = useState(false);
  const inCart = isInCart(product.id);

  function handleClick() {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all hover:-translate-y-px"
      style={
        inCart || added
          ? { background: "rgba(114,204,35,0.14)", border: "1px solid rgba(114,204,35,0.35)", color: "#72CC23" }
          : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.80)" }
      }
    >
      {inCart || added ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
      {added ? "Added to cart!" : inCart ? "In your cart" : "Add to cart"}
    </button>
  );
}
