"use client";

import { useMemo } from "react";
import { useNotifications, useOrders, useConversations } from "@/hooks/use-api";

export type CombinedNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  href?: string;
  synthetic?: boolean;
};

function orderNotification(order: {
  id: string;
  status: string;
  product: { title: string };
  role?: string;
  updatedAt: string;
  createdAt?: string;
}): CombinedNotification {
  const title = order.product.title;
  const isBuyer = order.role !== "seller";
  const date = order.createdAt ?? order.updatedAt;

  const STATUS_MAP: Record<string, { notifTitle: string; body: string; type: string; read: boolean }> = {
    "Awaiting payment": {
      notifTitle: isBuyer ? "Order awaiting payment" : "New order received",
      body: isBuyer
        ? `Your order for "${title}" is waiting for payment.`
        : `Someone ordered "${title}" — awaiting their payment.`,
      type: "payment",
      read: false,
    },
    "Payment initialized": {
      notifTitle: "Payment in progress",
      body: `Payment for "${title}" has been initiated.`,
      type: "payment",
      read: false,
    },
    "In progress": {
      notifTitle: isBuyer ? "Payment confirmed" : "Order confirmed — prepare handoff",
      body: isBuyer
        ? `Payment for "${title}" is held in escrow.`
        : `Payment confirmed for "${title}". Get ready for handoff.`,
      type: "order_status",
      read: false,
    },
    "Out for delivery": {
      notifTitle: isBuyer ? "Your order is on the way" : "Order dispatched",
      body: isBuyer
        ? `"${title}" is on its way to you.`
        : `You marked "${title}" as out for delivery.`,
      type: "order_status",
      read: false,
    },
    Delivered: {
      notifTitle: "Order delivered",
      body: `"${title}" has been marked as delivered.`,
      type: "order_status",
      read: true,
    },
    Completed: {
      notifTitle: isBuyer ? "Order completed" : "Sale completed",
      body: isBuyer
        ? `Your purchase of "${title}" is complete.`
        : `Your sale of "${title}" is complete. Payout is processing.`,
      type: "order_status",
      read: true,
    },
    Cancelled: {
      notifTitle: "Order cancelled",
      body: `The order for "${title}" was cancelled.`,
      type: "order_status",
      read: true,
    },
    Disputed: {
      notifTitle: "Order under dispute",
      body: `A dispute has been raised on your order for "${title}".`,
      type: "order_status",
      read: false,
    },
    Refunded: {
      notifTitle: "Refund processed",
      body: `A refund has been processed for "${title}".`,
      type: "payment",
      read: true,
    },
  };

  const cfg = STATUS_MAP[order.status] ?? {
    notifTitle: "Order update",
    body: `Status of your order for "${title}" changed to "${order.status}".`,
    type: "order_status",
    read: false,
  };

  return {
    id:        `syn-order-${order.id}`,
    type:      cfg.type,
    title:     cfg.notifTitle,
    body:      cfg.body,
    read:      cfg.read,
    createdAt: date,
    href:      "/orders",
    synthetic: true,
  };
}

export function useCombinedNotifications() {
  const { data: dbNotes  = [], isLoading: loadingNotes  } = useNotifications();
  const { data: orders   = [], isLoading: loadingOrders } = useOrders();
  const { data: convos   = [], isLoading: loadingConvos } = useConversations();

  const combined = useMemo<CombinedNotification[]>(() => {
    const items: CombinedNotification[] = dbNotes.map((n) => ({
      ...n,
      href: hrefForType(n.type),
    }));

    const dbOrderIds = new Set(
      dbNotes.filter((n) => n.type === "order" || n.type === "order_status" || n.type === "payment")
        .map((n) => n.id),
    );

    // Synthesize one notification per order (use updatedAt as the event time)
    for (const order of orders) {
      const synId = `syn-order-${order.id}`;
      if (dbOrderIds.has(synId)) continue;
      if (items.find((n) => n.id === synId)) continue;
      items.push(orderNotification(order));
    }

    // Synthesize from unread conversations
    for (const conv of convos) {
      const synId = `syn-msg-${conv.id}`;
      if (items.find((n) => n.id === synId)) continue;

      items.push({
        id:        synId,
        type:      "message",
        title:     conv.unread > 0
          ? `New message from ${conv.user.name}`
          : `Message from ${conv.user.name}`,
        body:      conv.lastMessage?.content
          ? conv.lastMessage.content.slice(0, 100)
          : conv.unread > 0
          ? `${conv.unread} unread message${conv.unread > 1 ? "s" : ""}`
          : `You have a conversation with ${conv.user.name}.`,
        read:      conv.unread === 0,
        createdAt: conv.lastMessage?.createdAt ?? conv.updatedAt,
        href:      "/messages",
        synthetic: true,
      });
    }

    return items.sort((a, b) => {
      if (!a.read && b.read)  return -1;
      if (a.read  && !b.read) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [dbNotes, orders, convos]);

  const unreadCount = combined.filter((n) => !n.read).length;

  return {
    data:      combined,
    unreadCount,
    isLoading: loadingNotes || loadingOrders || loadingConvos,
  };
}

function hrefForType(type: string): string {
  switch (type) {
    case "order":
    case "order_status":
    case "escrow":        return "/orders";
    case "payment":       return "/orders";
    case "message":       return "/messages";
    case "payout":        return "/wallet";
    case "subscription":  return "/premium";
    default:              return "/notifications";
  }
}
