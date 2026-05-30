import type { LucideIcon } from "lucide-react";

export type CategoryName =
  | "Electronics"
  | "Textbooks"
  | "Clothing"
  | "Furniture"
  | "Notes"
  | "Sports"
  | "Stationery"
  | "Services"
  | "Other";

export type ProductCondition = "New" | "Like new" | "Good" | "Fair";

export type Seller = {
  id: string;
  name: string;
  email?: string;
  accountType?: "Student" | "Teacher" | "Local vendor";
  handle: string;
  avatar: string;
  rating: number;
  reviews: number;
  location: string;
  joined: string;
  verified: boolean;
  premium: boolean;
  role?: string;
  canEditEvents?: boolean;
  canSell?: boolean;
  business?: BusinessProfile | null;
  responseTime: string | null;
  bio: string;
  banner: string;
  analytics: {
    viewsThisWeek: number;
    productClicks: number;
    interestedBuyers: number;
  };
};

export type BusinessProfile = {
  id: string;
  name: string;
  type: "Student business" | "Teacher service" | "Local vendor";
  description?: string | null;
  location: string;
  phone?: string | null;
  momoProvider?: string | null;
  momoPhone?: string | null;
  verified: boolean;
  premium: boolean;
};

export type ProductSeller = {
  id: string;
  name: string;
  verified: boolean;
  premium: boolean;
  rating?: number;
  location?: string | null;
  avatar?: string | null;
};

export type Product = {
  id: string;
  title: string;
  price: number;
  category: CategoryName;
  location: string;
  description: string;
  condition: ProductCondition;
  /** ISO date string from the API */
  postedAt: string;
  sellerId: string;
  seller: ProductSeller;
  featured: boolean;
  boosted: boolean;
  negotiable: boolean;
  active?: boolean;
  listingType?: string;
  tags: string[];
  imageStyle: string;
  imageUrl?: string;
  imageUrls?: string[];
  views: number;
};

export type Category = {
  name: CategoryName | string;
  count: number;
  icon?: LucideIcon;
  description?: string;
};

export type EscrowStatus =
  | "PENDING_PAYMENT"
  | "PAYMENT_INITIALIZED"
  | "PAYMENT_VERIFIED"
  | "ESCROW_HELD"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "RELEASE_PENDING"
  | "RELEASED"
  | "DISPUTED"
  | "REFUNDED"
  | "FAILED";

export type EscrowStatusLabel =
  | "Awaiting Payment"
  | "Payment Initiated"
  | "Payment Verified"
  | "Funds Held in Escrow"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Releasing Funds"
  | "Funds Released"
  | "Under Dispute"
  | "Refunded"
  | "Payment Failed";

export const ESCROW_LABELS: Record<EscrowStatus, EscrowStatusLabel> = {
  PENDING_PAYMENT:     "Awaiting Payment",
  PAYMENT_INITIALIZED: "Payment Initiated",
  PAYMENT_VERIFIED:    "Payment Verified",
  ESCROW_HELD:         "Funds Held in Escrow",
  PROCESSING:          "Processing",
  SHIPPED:             "Shipped",
  DELIVERED:           "Delivered",
  RELEASE_PENDING:     "Releasing Funds",
  RELEASED:            "Funds Released",
  DISPUTED:            "Under Dispute",
  REFUNDED:            "Refunded",
  FAILED:              "Payment Failed",
};

export const PAID_ESCROW_STATES: EscrowStatus[] = [
  "PAYMENT_VERIFIED", "ESCROW_HELD", "PROCESSING",
  "SHIPPED", "DELIVERED", "RELEASE_PENDING", "RELEASED",
];

export type OrderStatus =
  | "Awaiting payment"
  | "Payment initiated"
  | "In progress"
  | "Out for delivery"
  | "Delivered"
  | "Releasing funds"
  | "Completed"
  | "Disputed"
  | "Refunded"
  | "Cancelled"
  | "Payment failed";

export type DeliveryTracking = {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  updatedAt: string;
};

export type Order = {
  id: string;
  product: Pick<Product, "id" | "title" | "price" | "imageUrl" | "imageStyle" | "location">;
  status: OrderStatus | string;
  escrowStatus: EscrowStatus | string;
  /** Kept for backward-compat; prefer escrowStatus for logic */
  paymentStatus?: "Unpaid" | "Paid" | string;
  price?: number;
  totalAmount?: number;
  platformFee?: number;
  sellerAmount?: number;
  meetupLocation?: string;
  counterpart?: string;
  counterpartId?: string;
  role?: "buyer" | "seller" | "delivery";
  updatedAt: string;
  createdAt?: string;
  buyerId?: string;
  sellerId?: string;
  deliveryAddress?: string | null;
  deliveryPhone?: string | null;
  deliveryPersonId?: string | null;
  deliveryPerson?: { id: string; name: string; avatar: string; phone?: string | null } | null;
  tracking?: DeliveryTracking | null;
};

export type Wallet = {
  id: string;
  userId: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalWithdrawn: number;
  createdAt: string;
  updatedAt: string;
};

export type PayoutStatus = "PENDING" | "APPROVED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type PayoutMethod = "MTN_MOMO" | "TELECEL_CASH" | "AIRTELTIGO_MONEY" | "BANK_TRANSFER";

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  PENDING:    "Awaiting approval",
  APPROVED:   "Approved",
  PROCESSING: "Payout Processing",
  COMPLETED:  "Payout Completed",
  FAILED:     "Payout Failed",
  CANCELLED:  "Cancelled",
};

export const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
  MTN_MOMO:         "MTN MoMo",
  TELECEL_CASH:     "Telecel Cash",
  AIRTELTIGO_MONEY: "AirtelTigo Money",
  BANK_TRANSFER:    "Bank Transfer",
};

export type Payout = {
  id: string;
  sellerId: string;
  orderId?: string | null;
  amount: number;
  payoutMethod: PayoutMethod;
  transferCode?: string | null;
  status: PayoutStatus;
  failureReason?: string | null;
  approvedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
};

export type PaymentTransaction = {
  id: string;
  reference: string;
  status: string;
  amount: number;
  authorizationUrl?: string | null;
  metadata?: string;
};

export type CampusEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  eventDate: string;
  category: string;
  opportunity?: string | null;
  registrationLink?: string | null;
  imageUrl?: string | null;
  featured?: boolean;
};

export type Message = {
  id: string;
  sender: "me" | "them";
  body: string;
  time: string;
};

export type Conversation = {
  id: string;
  user: string;
  avatar: string;
  productTitle: string;
  unread: number;
  timestamp: string;
  online: boolean;
  messages: Message[];
};

export type Review = {
  id: string;
  author: string;
  rating: number;
  body: string;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export type MessageType =
  | "TEXT" | "IMAGE" | "FILE" | "AUDIO"
  | "LOCATION" | "LIVE_LOCATION" | "VIDEO_CALL";

export type ApiMessage = {
  id: string;
  content: string | null;
  type: MessageType;
  mediaUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
  liveUntil?: string | null;
  viewOnce: boolean;
  viewedBy: string[];
  duration?: number | null;
  callStatus?: string | null;
  senderId: string;
  conversationId: string;
  read: boolean;
  createdAt: string;
  sender: { id: string; name: string; avatar: string | null };
  mine: boolean;
};

export type ApiConversation = {
  id: string;
  user: { id: string; name: string; avatar: string | null; verified: boolean };
  product: { id: string; title: string; imageUrl: string | null; price: number } | null;
  lastMessage: { content: string | null; type: MessageType; createdAt: string } | null;
  unread: number;
  updatedAt: string;
};
