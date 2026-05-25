"use client";

import { ArrowLeft, Check, CheckCheck, Loader2, Search, Send } from "lucide-react";
import { useEffect, useRef, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSWRConfig } from "swr";
import { useSocket, joinConversation, leaveConversation } from "@/hooks/use-socket";
import { api } from "@/lib/api";
import { cn } from "@/lib/format";
import { AuthGate } from "@/components/auth-gate";
import { useConversations, useMessages } from "@/hooks/use-api";
import type { ApiConversation, ApiMessage } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatConvTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return formatTime(iso);
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short" });
}

function dateSeparatorLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long" });
}

// ─── Message bubble ────────────────────────────────────────────────────────────

function Bubble({
  message,
  isFirst,
  isLast,
}: {
  message: ApiMessage;
  isFirst: boolean;
  isLast: boolean;
}) {
  const mine = message.mine;

  return (
    <div className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
      {/* Other person avatar — only on the last bubble in a group */}
      {!mine && (
        <div className={cn("h-7 w-7 shrink-0 rounded-full", isLast ? "opacity-100" : "opacity-0")}
          style={{ background: "#0F172A" }}>
          {isLast && (
            <span className="flex h-full w-full items-center justify-center text-[10px] font-black text-white">
              {getInitials(message.sender?.name ?? "?")}
            </span>
          )}
        </div>
      )}

      <div className={cn(
        "relative max-w-[72%] px-3.5 py-2 text-sm leading-[1.55]",
        mine
          ? cn("rounded-2xl rounded-br-md", "text-white", isFirst && isLast ? "rounded-2xl" : isFirst ? "rounded-2xl rounded-br-md" : isLast ? "rounded-2xl rounded-br-md" : "rounded-xl rounded-br-md")
          : cn("rounded-2xl rounded-bl-md", isFirst && isLast ? "rounded-2xl" : isFirst ? "rounded-2xl rounded-bl-md" : isLast ? "rounded-2xl rounded-bl-md" : "rounded-xl rounded-bl-md"),
      )}
        style={{
          background: mine ? "#0F172A" : "rgba(255,255,255,0.95)",
          boxShadow: "0 1px 4px rgba(15,23,42,0.10)",
          border: mine ? "none" : "1px solid rgba(226,232,240,0.80)",
        }}>
        <p style={{ color: mine ? "#fff" : "#1E293B" }}>{message.content}</p>
        <div className={cn("mt-0.5 flex items-center gap-1", mine ? "justify-end" : "justify-start")}>
          <span className="text-[10px] font-medium" style={{ color: mine ? "rgba(255,255,255,0.55)" : "#94A3B8" }}>
            {formatTime(message.createdAt)}
          </span>
          {mine && (
            message.read
              ? <CheckCheck className="h-3.5 w-3.5" style={{ color: "#7FB685" }} />
              : <Check className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.55)" }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Date separator ────────────────────────────────────────────────────────────

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-2">
      <span className="rounded-full px-3 py-1 text-[11px] font-semibold"
        style={{ background: "rgba(255,255,255,0.80)", color: "#64748B", backdropFilter: "blur(8px)", border: "1px solid rgba(226,232,240,0.60)" }}>
        {label}
      </span>
    </div>
  );
}

// ─── Conversation item ─────────────────────────────────────────────────────────

function ConvItem({ conv, active, onClick }: { conv: ApiConversation; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
      style={active ? { background: "rgba(127,182,133,0.12)" } : undefined}
    >
      {/* Avatar */}
      <div className="relative h-12 w-12 shrink-0">
        <div className="grid h-full w-full place-items-center rounded-full text-sm font-black text-white"
          style={{ background: "linear-gradient(135deg, #0F172A, #1a3a2a)" }}>
          {conv.user.avatar
            ? <img src={conv.user.avatar} alt={conv.user.name} className="h-full w-full rounded-full object-cover" />
            : getInitials(conv.user.name)}
        </div>
        {conv.user.verified && (
          <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full text-[8px]"
            style={{ background: "#7FB685", border: "2px solid #fff" }}>✓</span>
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("truncate text-sm", conv.unread > 0 ? "font-black" : "font-semibold")}
            style={{ color: "#1E293B" }}>
            {conv.user.name}
          </span>
          <span className="shrink-0 text-[11px]"
            style={{ color: conv.unread > 0 ? "#5A9460" : "#94A3B8", fontWeight: conv.unread > 0 ? 700 : 400 }}>
            {formatConvTime(conv.updatedAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className={cn("truncate text-xs", conv.unread > 0 ? "font-semibold" : "font-normal")}
            style={{ color: conv.unread > 0 ? "#1E293B" : "#94A3B8" }}>
            {conv.lastMessage?.content ?? conv.product?.title ?? "No messages yet"}
          </span>
          {conv.unread > 0 && (
            <span className="grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full px-1 text-[10px] font-black text-white"
              style={{ background: "#7FB685" }}>
              {conv.unread > 99 ? "99+" : conv.unread}
            </span>
          )}
        </div>
        {conv.product && (
          <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold"
            style={{ color: "#C68B59" }}>
            📦 {conv.product.title.length > 28 ? conv.product.title.slice(0, 28) + "…" : conv.product.title}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin" style={{ color: "#7FB685" }} />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const { data: conversations, isLoading: loadingConv } = useConversations();
  const [activeId, setActiveId] = useState<string | null>(searchParams.get("c"));
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate } = useSWRConfig();
  const socketRef = useSocket();

  const active = (conversations as ApiConversation[]).find((c) => c.id === activeId) ?? null;

  // Auto-select first conversation
  useEffect(() => {
    const requested = searchParams.get("c");
    if (requested) { setActiveId(requested); return; }
    if (!activeId && (conversations as ApiConversation[]).length > 0) {
      setActiveId((conversations as ApiConversation[])[0]!.id);
    }
  }, [conversations, activeId, searchParams]);

  const { data: messagesData, isLoading: loadingMessages } = useMessages(active?.id ?? null);
  const messages = messagesData ?? [];

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Socket room
  useEffect(() => {
    if (!activeId) return;
    joinConversation(socketRef.current, activeId);
    return () => leaveConversation(socketRef.current, activeId);
  }, [activeId, socketRef]);

  // Focus input when opening conversation
  useEffect(() => {
    if (active) setTimeout(() => inputRef.current?.focus(), 100);
  }, [active?.id]);

  const visible = (conversations as ApiConversation[]).filter((c) => {
    const q = query.toLowerCase();
    return c.user.name.toLowerCase().includes(q) || (c.product?.title.toLowerCase().includes(q) ?? false);
  });

  async function handleSend() {
    if (!active || !text.trim()) return;
    setSending(true);
    const content = text.trim();
    setText("");
    try {
      await api.sendMessage(active.id, content);
      await mutate(`messages-${active.id}`);
      await mutate("conversations");
    } catch {
      setText(content);
    } finally {
      setSending(false);
    }
  }

  // Group messages with date separators and grouping info
  const groupedMessages = useMemo(() => {
    type Item = { type: "date"; label: string } | { type: "msg"; message: ApiMessage; isFirst: boolean; isLast: boolean };
    const items: Item[] = [];
    let lastDate = "";
    let lastSenderId = "";
    let groupStart = 0;

    const msgs = messages;
    for (let i = 0; i < msgs.length; i++) {
      const msg = msgs[i]!;
      const dateLabel = dateSeparatorLabel(msg.createdAt);

      if (dateLabel !== lastDate) {
        items.push({ type: "date", label: dateLabel });
        lastDate = dateLabel;
        lastSenderId = "";
      }

      const prevSenderId = lastSenderId;
      lastSenderId = msg.senderId;
      const nextMsg = msgs[i + 1];
      const sameAsPrev = prevSenderId === msg.senderId;
      const sameAsNext = nextMsg?.senderId === msg.senderId && dateSeparatorLabel(nextMsg.createdAt) === lastDate;

      items.push({ type: "msg", message: msg, isFirst: !sameAsPrev, isLast: !sameAsNext });
    }
    return items;
  }, [messages]);

  return (
    <AuthGate>
      <div className="container-shell py-4 md:py-6">
        <div className="overflow-hidden rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(226,232,240,0.70)",
            boxShadow: "0 4px 24px rgba(15,23,42,0.08)",
            height: "calc(100vh - 120px)",
            minHeight: "600px",
          }}>
          <div className="grid h-full md:grid-cols-[320px_1fr]">

            {/* ── Sidebar ── */}
            <aside className={cn(
              "flex flex-col border-r",
              active ? "hidden md:flex" : "flex",
            )} style={{ borderColor: "rgba(226,232,240,0.60)" }}>
              {/* Sidebar header */}
              <div className="px-4 pb-3 pt-4" style={{ borderBottom: "1px solid rgba(226,232,240,0.60)" }}>
                <h1 className="text-lg font-black" style={{ color: "#1E293B" }}>Messages</h1>
                <div className="mt-3 flex items-center gap-2 rounded-2xl px-3"
                  style={{ background: "rgba(248,245,239,0.80)", border: "1px solid rgba(226,232,240,0.70)" }}>
                  <Search className="h-3.5 w-3.5 shrink-0" style={{ color: "#94A3B8" }} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search chats…"
                    className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none"
                    style={{ color: "#1E293B" }}
                  />
                </div>
              </div>

              {/* Conversation list */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100/60">
                {loadingConv ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#7FB685" }} />
                  </div>
                ) : visible.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <p className="text-sm font-semibold" style={{ color: "#94A3B8" }}>
                      {query ? "No chats match your search." : "No conversations yet."}
                    </p>
                    {!query && (
                      <p className="mt-2 text-xs" style={{ color: "#CBD5E1" }}>
                        Tap "Message seller" on any product listing to start a chat.
                      </p>
                    )}
                  </div>
                ) : visible.map((conv) => (
                  <ConvItem key={conv.id} conv={conv} active={active?.id === conv.id}
                    onClick={() => setActiveId(conv.id)} />
                ))}
              </div>
            </aside>

            {/* ── Chat area ── */}
            <section className={cn("flex flex-col", active ? "flex" : "hidden md:flex")}>
              {active ? (
                <>
                  {/* Chat header */}
                  <div className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: "1px solid rgba(226,232,240,0.60)", background: "rgba(255,255,255,0.96)" }}>
                    <button onClick={() => setActiveId(null)}
                      className="mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-colors hover:bg-slate-100 md:hidden"
                      style={{ color: "#64748B" }}>
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-black text-white"
                      style={{ background: "linear-gradient(135deg, #0F172A, #1a3a2a)" }}>
                      {active.user.avatar
                        ? <img src={active.user.avatar} alt={active.user.name} className="h-full w-full rounded-full object-cover" />
                        : getInitials(active.user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm" style={{ color: "#1E293B" }}>{active.user.name}</p>
                      {active.product && (
                        <p className="truncate text-xs font-semibold" style={{ color: "#C68B59" }}>
                          📦 {active.product.title}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Messages area — WhatsApp-style subtle background */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
                    style={{
                      backgroundImage: "radial-gradient(circle at 20% 30%, rgba(127,182,133,0.04) 0%, transparent 60%), radial-gradient(circle at 80% 70%, rgba(198,139,89,0.03) 0%, transparent 50%)",
                      background: "rgba(248,245,239,0.60)",
                    }}>
                    {loadingMessages ? (
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#7FB685" }} />
                      </div>
                    ) : groupedMessages.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                        <div className="grid h-16 w-16 place-items-center rounded-full text-2xl"
                          style={{ background: "rgba(127,182,133,0.10)" }}>💬</div>
                        <p className="font-bold text-sm" style={{ color: "#1E293B" }}>No messages yet</p>
                        <p className="text-xs" style={{ color: "#94A3B8" }}>
                          Start the conversation — say hello or ask about the listing!
                        </p>
                      </div>
                    ) : (
                      groupedMessages.map((item, i) =>
                        item.type === "date"
                          ? <DateSeparator key={`date-${i}`} label={item.label} />
                          : <Bubble key={item.message.id} message={item.message} isFirst={item.isFirst} isLast={item.isLast} />
                      )
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input area */}
                  <div className="px-4 py-3"
                    style={{ borderTop: "1px solid rgba(226,232,240,0.60)", background: "rgba(255,255,255,0.96)" }}>
                    <div className="flex items-center gap-2">
                      <input
                        ref={inputRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                        placeholder="Type a message…"
                        className="min-w-0 flex-1 rounded-full px-4 py-3 text-sm outline-none"
                        style={{
                          background: "rgba(248,245,239,0.90)",
                          border: "1px solid rgba(226,232,240,0.80)",
                          color: "#1E293B",
                        }}
                        maxLength={2000}
                        disabled={sending}
                      />
                      <button
                        onClick={handleSend}
                        disabled={sending || !text.trim()}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
                        style={{ background: text.trim() ? "#0F172A" : "#94A3B8" }}
                        aria-label="Send">
                        {sending
                          ? <Loader2 className="h-5 w-5 animate-spin" />
                          : <Send className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-1.5 text-center text-[10px]" style={{ color: "#CBD5E1" }}>
                      Press Enter to send · Shift+Enter for new line
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center"
                  style={{ background: "rgba(248,245,239,0.40)" }}>
                  <div className="grid h-20 w-20 place-items-center rounded-full text-3xl"
                    style={{ background: "rgba(127,182,133,0.10)", border: "1px solid rgba(127,182,133,0.20)" }}>
                    💬
                  </div>
                  <div>
                    <p className="text-lg font-black" style={{ color: "#1E293B" }}>Your messages</p>
                    <p className="mt-1 max-w-xs text-sm" style={{ color: "#64748B" }}>
                      Select a conversation from the left, or message a seller directly from any product listing.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </AuthGate>
  );
}
