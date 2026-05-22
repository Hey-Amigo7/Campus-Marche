"use client";

import { AuthGate } from "@/components/auth-gate";
import { EmptyState, LoadingSkeleton, SectionHeading } from "@/components/ui";
import { ProductGrid } from "@/components/product-card";
import { useSavedItems } from "@/hooks/use-api";

export default function SavedPage() {
  const { data: products, isLoading } = useSavedItems();

  return (
    <AuthGate>
      <div className="container-shell py-8 md:py-10">
        <SectionHeading
          title="Saved items"
          subtitle="Products you bookmarked for later."
        />
        {isLoading ? (
          <LoadingSkeleton />
        ) : products && products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <EmptyState
            title="Nothing saved yet"
            description="Tap the bookmark icon on any listing to save it here for later."
          />
        )}
      </div>
    </AuthGate>
  );
}
