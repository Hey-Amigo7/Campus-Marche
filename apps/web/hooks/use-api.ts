"use client";

import useSWR from "swr";
import { api, type PaginatedProducts, type ProductFilters } from "@/lib/api";
import type { ApiConversation, ApiMessage, Category, Notification, Product, Seller } from "@/types";

export function useProducts(filters?: ProductFilters) {
  const result = useSWR<PaginatedProducts>(
    ["products", filters],
    () => api.getProducts(filters),
    { fallbackData: { data: [], total: 0, skip: 0, take: 0 } },
  );

  return {
    ...result,
    data: result.data?.data ?? [],
    total: result.data?.total ?? 0,
  };
}

export function useSearchProducts(q: string) {
  const result = useSWR<PaginatedProducts>(
    q ? ["search", q] : null,
    () => api.searchProducts(q),
    { fallbackData: { data: [], total: 0, skip: 0, take: 0 } },
  );

  return {
    ...result,
    data: result.data?.data ?? [],
    total: result.data?.total ?? 0,
  };
}

export function useOrders() {
  return useSWR("orders", api.getOrders, { fallbackData: [] });
}

export function useOrder(id: string | null) {
  return useSWR(
    id ? `order-${id}` : null,
    () => api.getOrder(id!),
    {
      fallbackData: null,
      refreshInterval: 5000,
    },
  );
}

export function useProfile() {
  return useSWR<Seller | null>("profile", api.getProfile, { fallbackData: null });
}

export function useBusiness() {
  return useSWR("business", api.getBusiness, { fallbackData: null });
}

export function useEvents() {
  return useSWR("events", api.getEvents, { fallbackData: [] });
}

export function useCategories() {
  return useSWR<Category[]>("categories", api.getCategories, { fallbackData: [] });
}

export function useConversations() {
  return useSWR<ApiConversation[]>("conversations", api.getConversations, {
    fallbackData: [],
    refreshInterval: 10000,
  });
}

export function useMessages(conversationId: string | null) {
  return useSWR<ApiMessage[]>(
    conversationId ? `messages-${conversationId}` : null,
    () => api.getMessages(conversationId!),
    { fallbackData: [], refreshInterval: 5000 },
  );
}

export function useNotifications() {
  return useSWR<Notification[]>("notifications", api.getNotifications, { fallbackData: [] });
}

export function useSeller(id: string | undefined) {
  return useSWR(id ? `seller-${id}` : null, () => api.getSeller(id!), {
    fallbackData: undefined,
  });
}

export function useReviews(productId: string | undefined) {
  return useSWR(
    productId ? `reviews-${productId}` : null,
    () => api.getReviews(productId!),
    { fallbackData: [] },
  );
}

export function useSavedItems() {
  return useSWR<Product[]>("saved-items", api.getSavedItems, { fallbackData: [] });
}

export function useSavedStatus(productId: string | undefined) {
  return useSWR(
    productId ? `saved-status-${productId}` : null,
    () => api.isSaved(productId!),
    { fallbackData: { saved: false, productId: productId ?? "" } },
  );
}
