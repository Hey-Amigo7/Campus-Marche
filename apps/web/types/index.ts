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
  tags: string[];
  imageStyle: string;
  imageUrl?: string;
  views: number;
};

export type Category = {
  name: CategoryName | string;
  count: number;
  icon?: LucideIcon;
  description?: string;
};

export type OrderStatus =
  | "Payment pending"
  | "Awaiting pickup"
  | "In progress"
  | "Out for delivery"
  | "Completed"
  | "Cancelled";

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
  paymentStatus?: "Unpaid" | "Paid" | string;
  escrowStatus?: "Not funded" | "Held in escrow" | "Released" | string;
  price?: number;
  meetupLocation?: string;
  counterpart?: string;
  counterpartId?: string;
  role?: "buyer" | "seller" | "delivery";
  updatedAt: string;
  createdAt?: string;
  buyerId?: string;
  deliveryAddress?: string | null;
  deliveryPhone?: string | null;
  deliveryPersonId?: string | null;
  deliveryPerson?: { id: string; name: string; avatar: string; phone?: string | null } | null;
  tracking?: DeliveryTracking | null;
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
  imageUrl?: string | null;
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

export type ApiMessage = {
  id: string;
  content: string;
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
  lastMessage: { content: string; createdAt: string } | null;
  unread: number;
  updatedAt: string;
};
