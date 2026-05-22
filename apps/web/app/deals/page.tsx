"use client";

import Link from "next/link";
import { useProducts } from "@/hooks/use-api";
import { EmptyState, LoadingSkeleton, SectionHeading } from "@/components/ui";
import { ProductGrid } from "@/components/product-card";

export default function DealsPage() {
  const { data: products, isLoading } = useProducts({ featured: true });

  const deals = [...products]
    .filter((p) => p.featured || p.negotiable || p.boosted)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.price - b.price);

  return (
    <div className="container-shell py-8 md:py-10">
      <SectionHeading
        title="Student deals"
        subtitle="Featured, negotiable, and boosted listings collected in one place for quick browsing."
        action={
          <Link href="/products" className="btn-secondary">
            Browse all products
          </Link>
        }
      />
      {isLoading ? (
        <LoadingSkeleton />
      ) : deals.length > 0 ? (
        <ProductGrid products={deals} />
      ) : (
        <EmptyState
          title="No deals right now"
          description="Check back later — featured and negotiable listings will appear here."
        />
      )}
    </div>
  );
}
