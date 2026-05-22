import { categories, products, sellers } from "@/constants/mock-data";
import type {
  ApiConversation,
  ApiMessage,
  BusinessProfile,
  CampusEvent,
  Category,
  Order,
  PaymentTransaction,
  Product,
  Seller,
} from "@/types";
import { getAuthToken, hasAuthToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = getAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.map(String).filter(Boolean);
  if (typeof tags === "string") return tags.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
}

function normalizeProduct(product: Record<string, unknown>): Record<string, unknown> {
  return { ...product, tags: normalizeTags(product.tags) };
}

type RequestOptions = RequestInit & { strict?: boolean; revalidate?: number };

async function request<T>(path: string, fallback: T, init: RequestOptions = {}): Promise<T> {
  const { strict = false, revalidate, ...requestInit } = init;

  if (!API_BASE) {
    if (strict) throw new Error("API is not configured. Set NEXT_PUBLIC_API_URL.");
    return fallback;
  }

  const fetchOptions: RequestInit = {
    ...requestInit,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...requestInit.headers,
    },
    credentials: "include",
  };

  const isGetRequest = !requestInit.method || requestInit.method.toUpperCase() === "GET";
  if (isGetRequest && typeof revalidate === "number") {
    (fetchOptions as RequestInit & { next?: { revalidate: number } }).next = { revalidate };
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, fetchOptions);

    if (!response.ok) {
      let message = `Request failed: ${response.status}`;
      try {
        const errorBody = (await response.json()) as { message?: unknown };
        const msg = errorBody.message;
        message = Array.isArray(msg) ? msg.join(" ") : typeof msg === "string" ? msg : message;
      } catch {
        // keep status-based message
      }
      throw new Error(message);
    }

    const data = (await response.json()) as unknown;

    if (Array.isArray(data)) {
      return data.map((item) =>
        item && typeof item === "object" && "tags" in item ? normalizeProduct(item as Record<string, unknown>) : item,
      ) as T;
    }

    if (data && typeof data === "object" && "data" in data && Array.isArray((data as { data: unknown }).data)) {
      const paged = data as { data: unknown[]; total: number; skip: number; take: number };
      return {
        ...paged,
        data: paged.data.map((item) =>
          item && typeof item === "object" && "tags" in item
            ? normalizeProduct(item as Record<string, unknown>)
            : item,
        ),
      } as T;
    }

    if (data && typeof data === "object" && "tags" in data) {
      return normalizeProduct(data as Record<string, unknown>) as T;
    }

    return data as T;
  } catch (error) {
    if (strict) {
      if (error instanceof TypeError) {
        throw new Error(
          "API server is not reachable. Please start the backend on http://localhost:3002 and try again.",
        );
      }
      throw error;
    }
    return fallback;
  }
}

export type ProductFilters = {
  q?: string;
  category?: string;
  location?: string;
  verified?: boolean;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
};

export type PaginatedProducts = {
  data: Product[];
  total: number;
  skip: number;
  take: number;
};

export function filterProducts(filters: ProductFilters = {}): Product[] {
  const query = filters.q?.toLowerCase().trim();
  return products.filter((product) => {
    const matchesQuery =
      !query ||
      product.title.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.tags.some((tag) => tag.toLowerCase().includes(query));
    const matchesCategory = !filters.category || product.category === filters.category;
    const matchesLocation =
      !filters.location || product.location.toLowerCase().includes(filters.location.toLowerCase());
    const matchesVerified = !filters.verified || product.seller.verified;
    const matchesFeatured = !filters.featured || product.featured;
    const matchesMin = !filters.minPrice || product.price >= filters.minPrice;
    const matchesMax = !filters.maxPrice || product.price <= filters.maxPrice;
    return matchesQuery && matchesCategory && matchesLocation && matchesVerified && matchesFeatured && matchesMin && matchesMax;
  });
}

const mockPaginatedProducts: PaginatedProducts = {
  data: products,
  total: products.length,
  skip: 0,
  take: products.length,
};

export const api = {
  getProducts: (filters?: ProductFilters, opts?: { skip?: number; take?: number }) => {
    const params = new URLSearchParams();
    if (opts?.skip) params.set("skip", String(opts.skip));
    if (opts?.take) params.set("take", String(opts.take));
    const qs = params.toString();
    return request<PaginatedProducts>(`/products${qs ? `?${qs}` : ""}`, {
      data: filterProducts(filters),
      total: filterProducts(filters).length,
      skip: 0,
      take: filterProducts(filters).length,
    }, { revalidate: 60 });
  },

  getProduct: (id: string) =>
    request<Product | undefined>(`/products/${id}`, products.find((p) => p.id === id), {
      revalidate: 60,
    }),

  searchProducts: (q: string, opts?: { skip?: number; take?: number }) => {
    const params = new URLSearchParams({ q: q });
    if (opts?.skip) params.set("skip", String(opts.skip));
    if (opts?.take) params.set("take", String(opts.take));
    return request<PaginatedProducts>(`/products/search?${params.toString()}`, {
      data: filterProducts({ q }),
      total: filterProducts({ q }).length,
      skip: 0,
      take: filterProducts({ q }).length,
    });
  },

  getCategories: () =>
    request<Category[]>("/products/categories", categories, { revalidate: 300 }),

  createProduct: (payload: Partial<Product>) => {
    if (!hasAuthToken()) return Promise.reject(new Error("Authentication required"));
    return request<Product>(
      "/products",
      { ...products[0]!, ...payload, id: `new-${Date.now()}` } as Product,
      { method: "POST", body: JSON.stringify(payload), strict: true },
    );
  },

  auth: {
    register: (payload: { email: string; name: string; password: string }) =>
      request<{ user: { id: string; email: string; name: string }; token: string; requiresOtp?: boolean }>(
        "/auth/register",
        { user: { id: "", email: "", name: "" }, token: "" },
        { method: "POST", body: JSON.stringify(payload), strict: true },
      ),

    login: (payload: { email: string; password: string }) =>
      request<{ user: { id: string; email: string; name: string }; token: string }>(
        "/auth/login",
        { user: { id: "", email: "", name: "" }, token: "" },
        { method: "POST", body: JSON.stringify(payload), strict: true },
      ),

    validate: (token: string) =>
      request<{ sub: string; email: string }>(
        "/auth/validate",
        { sub: "", email: "" },
        { method: "POST", body: JSON.stringify({ token }) },
      ),

    forgotPassword: (email: string) =>
      request<{ message: string }>(
        "/auth/forgot-password",
        { message: "" },
        { method: "POST", body: JSON.stringify({ email }), strict: true },
      ),

    resetPassword: (token: string, password: string) =>
      request<{ message: string }>(
        "/auth/reset-password",
        { message: "" },
        { method: "POST", body: JSON.stringify({ token, password }), strict: true },
      ),

    verifyEmailOtp: (code: string) =>
      request<{ message: string }>(
        "/auth/verify-otp",
        { message: "" },
        { method: "POST", body: JSON.stringify({ code }), strict: true },
      ),

    resendEmailOtp: () =>
      request<{ message: string }>(
        "/auth/resend-otp",
        { message: "" },
        { method: "POST", strict: true },
      ),

    sendPhoneOtp: (phone: string) =>
      request<void>(
        "/auth/send-phone-otp",
        undefined,
        { method: "POST", body: JSON.stringify({ phone }), strict: true },
      ),

    verifyPhoneOtp: (code: string) =>
      request<{ message: string }>(
        "/auth/verify-phone-otp",
        { message: "" },
        { method: "POST", body: JSON.stringify({ code }), strict: true },
      ),
  },

  getOrders: () => request<Order[]>("/orders", []),

  createOrder: (payload: { productId: string }) =>
    request<Order>("/orders", {} as Order, {
      method: "POST",
      body: JSON.stringify(payload),
      strict: true,
    }),

  updateOrderStatus: (orderId: string, status: string) =>
    request<Order>(`/orders/${orderId}/status`, {} as Order, {
      method: "PUT",
      body: JSON.stringify({ status }),
      strict: true,
    }),

  initializePayment: (orderId: string) =>
    request<PaymentTransaction>(`/payments/orders/${orderId}/initialize`, {} as PaymentTransaction, {
      method: "POST",
      strict: true,
    }),

  verifyPayment: (reference: string) =>
    request<PaymentTransaction>(
      `/payments/verify/${encodeURIComponent(reference)}`,
      {} as PaymentTransaction,
      { strict: true },
    ),

  releaseEscrow: (orderId: string) =>
    request<Order>(`/payments/orders/${orderId}/release`, {} as Order, {
      method: "POST",
      strict: true,
    }),

  getBusiness: () => request<BusinessProfile | null>("/business/me", null),

  saveBusiness: (
    payload: Pick<BusinessProfile, "name" | "type" | "location"> & {
      description?: string;
      phone?: string;
    },
  ) =>
    request<BusinessProfile>("/business/me", {} as BusinessProfile, {
      method: "POST",
      body: JSON.stringify(payload),
      strict: true,
    }),

  getEvents: () => request<CampusEvent[]>("/events", [], { revalidate: 300 }),

  getConversations: () => request<ApiConversation[]>("/conversations", []),

  startConversation: (recipientId: string, productId?: string) =>
    request<{ id: string }>(
      "/conversations",
      { id: "" },
      { method: "POST", body: JSON.stringify({ recipientId, productId }), strict: true },
    ),

  getMessages: (conversationId: string) =>
    request<ApiMessage[]>(`/conversations/${conversationId}/messages`, []),

  sendMessage: (conversationId: string, content: string) =>
    request<ApiMessage>(
      `/conversations/${conversationId}/messages`,
      {} as ApiMessage,
      { method: "POST", body: JSON.stringify({ content }), strict: true },
    ),

  getSeller: (id: string) =>
    request<Seller | undefined>(`/sellers/${id}`, sellers.find((s) => s.id === id), {
      revalidate: 60,
    }),

  getProfile: () => request<Seller | null>("/users/profile", null),

  getNotifications: () =>
    request<Array<{ id: string; type: string; title: string; body: string; read: boolean; createdAt: string }>>(
      "/notifications",
      [],
    ),

  markNotificationsRead: () =>
    request<{ success: boolean }>("/notifications/read-all", { success: false }, { method: "PATCH" }),

  getReviews: (productId: string) =>
    request<Array<{ id: string; rating: number; comment: string | null; author: string; createdAt: string }>>(
      `/reviews/product/${productId}`,
      [],
      { revalidate: 120 },
    ),

  submitReview: (productId: string, payload: { rating: number; comment?: string }) =>
    request<{ id: string; rating: number; comment: string | null; author: string; createdAt: string }>(
      `/reviews/product/${productId}`,
      {} as never,
      { method: "POST", body: JSON.stringify(payload), strict: true },
    ),

  getSavedItems: () => request<Product[]>("/saved-items", []),

  saveItem: (productId: string) =>
    request<{ saved: boolean; productId: string }>(
      `/saved-items/${productId}`,
      { saved: true, productId },
      { method: "POST", strict: true },
    ),

  unsaveItem: (productId: string) =>
    request<{ saved: boolean; productId: string }>(
      `/saved-items/${productId}`,
      { saved: false, productId },
      { method: "DELETE", strict: true },
    ),

  isSaved: (productId: string) =>
    request<{ saved: boolean; productId: string }>(
      `/saved-items/${productId}/status`,
      { saved: false, productId },
    ),

  submitReport: (payload: { reason: string; description?: string; reportedUserId?: string; productId?: string }) =>
    request<{ id: string; reason: string; status: string }>(
      "/reports",
      {} as never,
      { method: "POST", body: JSON.stringify(payload), strict: true },
    ),

  requestEmailVerification: () =>
    request<{ message: string }>(
      "/auth/send-verification",
      { message: "" },
      { method: "POST", strict: true },
    ),
};
