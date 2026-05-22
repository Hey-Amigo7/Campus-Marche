"use client";

import { Loader2, Search, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { api } from "@/lib/api";
import { cn, formatRelativeDate } from "@/lib/format";
import { AuthGate } from "@/components/auth-gate";
import { ChatBubble } from "@/components/chat-bubble";
import { useConversations, useMessages } from "@/hooks/use-api";
import type { ApiConversation } from "@/types";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function MessagesPage() {
  const { data: conversations, isLoading: loadingConversations } = useConversations();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { mutate } = useSWRConfig();

  const active = (conversations as ApiConversation[]).find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    if (!activeId && (conversations as ApiConversation[]).length > 0) {
      setActiveId((conversations as ApiConversation[])[0]!.id);
    }
  }, [conversations, activeId]);

  const { data: messagesData, isLoading: loadingMessages } = useMessages(active?.id ?? null);
  const messages = messagesData ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const visible = (conversations as ApiConversation[]).filter((c) => {
    const q = query.toLowerCase();
    return (
      c.user.name.toLowerCase().includes(q) ||
      (c.product?.title.toLowerCase().includes(q) ?? false)
    );
  });

  async function handleSend() {
    if (!active || !text.trim()) return;
    setSendError(null);
    setSending(true);
    try {
      await api.sendMessage(active.id, text.trim());
      setText("");
      await mutate(`messages-${active.id}`);
      await mutate("conversations");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <AuthGate>
      <div className="container-shell py-8 md:py-10">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid min-h-[680px] md:grid-cols-[340px_1fr]">
            {/* Sidebar — hidden on mobile when a conversation is active */}
            <aside className={cn("border-slate-200 md:border-r", active ? "hidden md:block" : "block")}>
              <div className="border-b border-slate-200 p-4">
                <h1 className="text-xl font-black text-slate-950">Messages</h1>
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 px-3">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search chats"
                    className="min-w-0 flex-1 py-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {loadingConversations ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : visible.length === 0 ? (
                  <p className="p-6 text-center text-sm text-slate-500">
                    {query ? "No chats match your search." : "No conversations yet."}
                  </p>
                ) : (
                  visible.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setActiveId(conv.id)}
                      className={cn(
                        "flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50",
                        active?.id === conv.id && "bg-green-50/60",
                      )}
                    >
                      <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-navy text-xs font-black text-white">
                        {conv.user.avatar ?? getInitials(conv.user.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-black text-slate-950">{conv.user.name}</span>
                          <span className="text-xs font-semibold text-slate-400">
                            {formatRelativeDate(conv.updatedAt)}
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-sm font-semibold text-slate-500">
                          {conv.lastMessage?.content ?? conv.product?.title ?? "No messages yet"}
                        </span>
                      </span>
                      {conv.unread > 0 ? (
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-green text-xs font-black text-white">
                          {conv.unread}
                        </span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </aside>

            {/* Chat area */}
            <section className="flex min-h-[680px] flex-col">
              {active ? (
                <>
                  <div className="flex items-center gap-3 border-b border-slate-200 p-4">
                    <button
                      onClick={() => setActiveId(null)}
                      className="mr-1 text-sm font-bold text-slate-500 hover:text-slate-800 md:hidden"
                      aria-label="Back to conversations"
                    >
                      ← Back
                    </button>
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-navy text-xs font-black text-white">
                      {active.user.avatar ?? getInitials(active.user.name)}
                    </span>
                    <div>
                      <h2 className="font-black text-slate-950">{active.user.name}</h2>
                      {active.product ? (
                        <p className="text-sm font-semibold text-slate-500">{active.product.title}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4 md:p-6">
                    {loadingMessages ? (
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      </div>
                    ) : messages.length === 0 ? (
                      <p className="pt-8 text-center text-sm text-slate-400">
                        No messages yet — say hello!
                      </p>
                    ) : (
                      messages.map((msg) => <ChatBubble key={msg.id} message={msg} />)
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="border-t border-slate-200 p-4">
                    {sendError ? (
                      <p className="mb-2 text-xs font-semibold text-red-600">{sendError}</p>
                    ) : null}
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2">
                      <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="min-w-0 flex-1 px-2 text-sm font-medium outline-none"
                        maxLength={2000}
                        disabled={sending}
                      />
                      <button
                        onClick={handleSend}
                        disabled={sending || !text.trim()}
                        className="grid h-10 w-10 place-items-center rounded-xl bg-brand-green text-white hover:bg-green-700 disabled:opacity-50"
                        aria-label="Send message"
                      >
                        {sending ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : !loadingConversations ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                  <p className="text-lg font-black text-slate-950">No messages yet</p>
                  <p className="max-w-xs text-sm text-slate-500">
                    Start a conversation by tapping &ldquo;Message seller&rdquo; on any product
                    listing.
                  </p>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </AuthGate>
  );
}
