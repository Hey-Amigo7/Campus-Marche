"use client";

import { useEffect, useRef } from "react";
import { useSWRConfig } from "swr";
import { getAuthToken } from "@/lib/auth";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type SocketLike = {
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  off: (event: string, cb: (...args: unknown[]) => void) => void;
  emit: (event: string, data?: unknown, cb?: (res: unknown) => void) => void;
  disconnect: () => void;
  connected: boolean;
};

let socketModule: typeof import("socket.io-client") | null = null;

async function loadSocket() {
  if (!socketModule) {
    socketModule = await import("socket.io-client");
  }
  return socketModule;
}

export function useSocket() {
  const { mutate } = useSWRConfig();
  const socketRef = useRef<SocketLike | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token || !SOCKET_URL) return;

    let socket: SocketLike;
    let cancelled = false;

    void loadSocket().then(({ io }) => {
      if (cancelled) return;

      socket = io(`${SOCKET_URL}/chat`, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      }) as unknown as SocketLike;

      socketRef.current = socket;

      const onMessage = (msg: unknown) => {
        const m = msg as { conversationId?: string };
        if (m.conversationId) void mutate(`messages-${m.conversationId}`);
        void mutate("conversations");
      };

      const onConversationsUpdate = () => {
        void mutate("conversations");
      };

      const onNotification = () => {
        void mutate("notifications");
      };

      socket.on("message:new", onMessage);
      socket.on("conversations:update", onConversationsUpdate);
      socket.on("notification:new", onNotification);
    });

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [mutate]);

  return socketRef;
}

export function joinConversation(socket: SocketLike | null, conversationId: string) {
  socket?.emit("join:conversation", conversationId);
}

export function leaveConversation(socket: SocketLike | null, conversationId: string) {
  socket?.emit("leave:conversation", conversationId);
}
