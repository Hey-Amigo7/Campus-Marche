"use client";

import useSWR from "swr";
import { api, type PaginatedProducts, type ProductFilters } from "@/lib/api";
import { hasAuthToken, isEnvAdminToken } from "@/lib/auth";
import type { ApiConversation, ApiMessage, Category, Notification, Payout, Product, Seller, Wallet } from "@/types";

export function useProduct(id: string | null) {
  return useSWR<Product | null>(
    id ? `product-${id}` : null,
    () => api.getProduct(id!),
    { fallbackData: null },
  );
}

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
  return useSWR(hasAuthToken() ? "orders" : null, api.getOrders, {
    fallbackData: [],
    shouldRetryOnError: false,
  });
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

export function useBookings() {
  return useSWR<import("@/types").ServiceBooking[]>(hasAuthToken() ? "bookings" : null, api.getBookings, {
    fallbackData: [],
    shouldRetryOnError: false,
  });
}

export function useProfile() {
  return useSWR<Seller | null>(
    hasAuthToken() && !isEnvAdminToken() ? "profile" : null,
    api.getProfile,
    { fallbackData: null, shouldRetryOnError: false },
  );
}

export function useBusiness() {
  return useSWR(hasAuthToken() ? "business" : null, api.getBusiness, { fallbackData: null, shouldRetryOnError: false });
}

export function useEvents() {
  return useSWR("events", api.getEvents, { fallbackData: [] });
}

export function useCategories() {
  return useSWR<Category[]>("categories", api.getCategories, { fallbackData: [] });
}

export function useLocations() {
  return useSWR<Array<{ location: string; count: number }>>("locations", api.getLocations, { fallbackData: [] });
}

export function useMyListings() {
  return useSWR<Product[]>(hasAuthToken() ? "my-listings" : null, api.getMyListings, { fallbackData: [], shouldRetryOnError: false });
}

export function useConversations() {
  return useSWR<ApiConversation[]>(hasAuthToken() ? "conversations" : null, api.getConversations, {
    fallbackData: [],
    shouldRetryOnError: false,
    refreshInterval: 60000, // socket handles real-time; this is a fallback
  });
}

export function useMessages(conversationId: string | null) {
  return useSWR<ApiMessage[]>(
    conversationId ? `messages-${conversationId}` : null,
    () => api.getMessages(conversationId!),
    { fallbackData: [], refreshInterval: 60000 }, // socket handles real-time
  );
}

export function useNotifications() {
  return useSWR<Notification[]>(hasAuthToken() ? "notifications" : null, api.getNotifications, {
    fallbackData: [],
    shouldRetryOnError: false,
  });
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
  return useSWR<Product[]>(hasAuthToken() ? "saved-items" : null, api.getSavedItems, { fallbackData: [], shouldRetryOnError: false });
}

export function useSavedStatus(productId: string | undefined) {
  return useSWR(
    productId && hasAuthToken() ? `saved-status-${productId}` : null,
    () => api.isSaved(productId!),
    { fallbackData: { saved: false, productId: productId ?? "" }, shouldRetryOnError: false },
  );
}

export function useWallet() {
  return useSWR<Wallet | null>(hasAuthToken() ? "wallet" : null, api.getWallet, { fallbackData: null, shouldRetryOnError: false, refreshInterval: 30000 });
}

export function usePayouts() {
  return useSWR<Payout[]>(hasAuthToken() ? "payouts" : null, api.getPayouts, { fallbackData: [], shouldRetryOnError: false, refreshInterval: 30000 });
}

export function useSiteStats() {
  return useSWR<{ users: number; products: number; orders: number }>(
    "site-stats",
    api.getStats,
    { fallbackData: { users: 0, products: 0, orders: 0 }, revalidateOnFocus: false },
  );
}
