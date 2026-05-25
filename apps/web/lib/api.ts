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
    if (strict) throw new Error("API is not configured. Set NEXT_PUBLIC_API_URL in apps/web/.env.local");
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
      const errContentType = response.headers.get("content-type") ?? "";
      if (errContentType.includes("application/json")) {
        try {
          const errorBody = (await response.json()) as { message?: unknown };
          const msg = errorBody.message;
          message = Array.isArray(msg) ? msg.join(" ") : typeof msg === "string" ? msg : message;
        } catch {
          // keep status-based message
        }
      }
      throw new Error(message);
    }

    // Safely parse JSON — guard against empty/non-JSON bodies
    let data: unknown;
    const contentType = response.headers.get("content-type") ?? "";
    if (response.status === 204 || !contentType.includes("application/json")) {
      return fallback;
    }
    try {
      data = await response.json();
    } catch {
      if (strict) throw new Error("Server returned an unreadable response. Please try again.");
      return fallback;
    }

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
          "API server is not reachable. Please start the backend (cd apps/api && pnpm start:dev) and try again.",
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

const EMPTY_PAGE: PaginatedProducts = { data: [], total: 0, skip: 0, take: 0 };

export const api = {
  getProducts: (filters?: ProductFilters, opts?: { skip?: number; take?: number }) => {
    const params = new URLSearchParams();
    if (filters?.q)        params.set("q",        filters.q);
    if (filters?.category) params.set("category", filters.category);
    if (filters?.location) params.set("location", filters.location);
    if (opts?.skip)        params.set("skip",     String(opts.skip));
    if (opts?.take)        params.set("take",     String(opts.take));
    const qs = params.toString();
    return request<PaginatedProducts>(`/products${qs ? `?${qs}` : ""}`, EMPTY_PAGE, { revalidate: 60 });
  },

  getProduct: (id: string) =>
    request<Product | null>(`/products/${id}`, null, { revalidate: 60, strict: true }),

  searchProducts: (q: string, opts?: { skip?: number; take?: number }) => {
    const params = new URLSearchParams({ q });
    if (opts?.skip) params.set("skip", String(opts.skip));
    if (opts?.take) params.set("take", String(opts.take));
    return request<PaginatedProducts>(`/products/search?${params.toString()}`, EMPTY_PAGE);
  },

  getCategories: () =>
    request<Category[]>("/products/categories", [], { revalidate: 300 }),

  createProduct: (payload: Partial<Product>) => {
    if (!hasAuthToken()) return Promise.reject(new Error("Authentication required"));
    return request<Product>(
      "/products",
      null as unknown as Product,
      { method: "POST", body: JSON.stringify(payload), strict: true },
    );
  },

  auth: {
    register: (payload: { email: string; name: string; password: string }) =>
      request<{ user: { id: string; email: string; name: string }; token: string; requiresOtp?: boolean; devCode?: string }>(
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
      request<{ message: string }>(
        "/auth/send-phone-otp",
        { message: "" },
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

  getOrder: (id: string) => request<Order | null>(`/orders/${id}`, null, { strict: true }),

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

  setDeliveryDetails: (orderId: string, deliveryAddress: string, deliveryPhone: string) =>
    request<Order>(`/orders/${orderId}/delivery-details`, {} as Order, {
      method: "POST",
      body: JSON.stringify({ deliveryAddress, deliveryPhone }),
      strict: true,
    }),

  assignDeliveryPerson: (orderId: string, deliveryPersonId: string) =>
    request<Order>(`/orders/${orderId}/assign-delivery`, {} as Order, {
      method: "POST",
      body: JSON.stringify({ deliveryPersonId }),
      strict: true,
    }),

  updateDeliveryLocation: (orderId: string, latitude: number, longitude: number, heading?: number, speed?: number) =>
    request<unknown>(`/orders/${orderId}/location`, null, {
      method: "PUT",
      body: JSON.stringify({ latitude, longitude, heading, speed }),
      strict: true,
    }),

  getDeliveryTracking: (orderId: string) =>
    request<import("@/types").DeliveryTracking | null>(`/orders/${orderId}/tracking`, null),

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
    request<{ message: string }>(`/payments/orders/${orderId}/release`, { message: "" }, {
      method: "POST",
      strict: true,
    }),

  chargeMobileMoney: (orderId: string, phone: string, provider: "mtn" | "vod" | "tgo") =>
    request<{ reference: string; status: string; displayText: string }>(
      `/payments/orders/${orderId}/mobile-money`,
      {} as never,
      { method: "POST", body: JSON.stringify({ phone, provider }), strict: true },
    ),

  checkMomoStatus: (reference: string) =>
    request<{ status: string; paid: boolean }>(
      `/payments/mobile-money/${encodeURIComponent(reference)}/status`,
      { status: "", paid: false },
      { strict: true },
    ),

  getBusiness: () => request<BusinessProfile | null>("/business/me", null),

  saveBusiness: (
    payload: Pick<BusinessProfile, "name" | "type" | "location"> & {
      description?: string;
      phone?: string;
      momoProvider?: string;
      momoPhone?: string;
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
    request<Seller | null>(`/sellers/${id}`, null, { revalidate: 60 }),

  getProfile: () => request<Seller | null>("/users/profile", null),

  updateProfile: (payload: { name?: string; avatar?: string }) =>
    request<Seller | null>("/users/profile", null, { method: "PATCH", body: JSON.stringify(payload), strict: true }),

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

  deleteAccount: () =>
    request<{ message: string }>(
      "/users/account",
      { message: "" },
      { method: "DELETE", strict: true },
    ),

  getStats: () =>
    request<{ users: number; products: number; orders: number }>(
      "/stats",
      { users: 0, products: 0, orders: 0 },
      { revalidate: 300 },
    ),

  submitContact: (payload: { name: string; email: string; subject: string; message: string }) =>
    request<{ id: string; message: string }>(
      "/contact",
      { id: "", message: "" },
      { method: "POST", body: JSON.stringify(payload), strict: true },
    ),

  getSubscription: () =>
    request<{ plan: string; status: string; expiresAt: string | null; features: Record<string, unknown> }>(
      "/subscription/me",
      { plan: "free", status: "active", expiresAt: null, features: {} },
    ),

  upgradeSubscription: (plan: "pro" | "featured") =>
    request<{ authorizationUrl: string; reference: string }>(
      "/subscription/upgrade",
      { authorizationUrl: "", reference: "" },
      { method: "POST", body: JSON.stringify({ plan }), strict: true },
    ),

  cancelSubscription: () =>
    request<{ message: string }>(
      "/subscription/cancel",
      { message: "" },
      { method: "POST", strict: true },
    ),
};
