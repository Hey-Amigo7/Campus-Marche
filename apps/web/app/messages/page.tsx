"use client";

import {
  ArrowLeft, Check, CheckCheck, FileText, Loader2,
  MapPin, Mic, MicOff, Navigation, Paperclip, Phone,
  PhoneOff, Plus, Search, Send, Video, VideoOff, X, Camera,
  Image as ImageIcon, Eye, Download, Square,
} from "lucide-react";
import { useEffect, useRef, useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSWRConfig } from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket, joinConversation, leaveConversation } from "@/hooks/use-socket";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/format";
import { AuthGate } from "@/components/auth-gate";
import { useConversations, useMessages, useProfile } from "@/hooks/use-api";
import type { ApiConversation, ApiMessage, MessageType } from "@/types";

const spring = { type: "spring", stiffness: 340, damping: 26 } as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function isAvatarUrl(avatar?: string | null) {
  if (!avatar) return false;
  return avatar.startsWith("http") || avatar.startsWith("/uploads") || avatar.startsWith("/");
}

function AvatarCircle({ avatar, name, size }: { avatar?: string | null; name: string; size: number }) {
  if (isAvatarUrl(avatar)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar!} alt={name} className="h-full w-full rounded-full object-cover" />;
  }
  const display = avatar && avatar.length <= 2 ? avatar : getInitials(name);
  return (
    <span className="flex h-full w-full items-center justify-center font-black text-white" style={{ fontSize: size * 0.38 }}>
      {display}
    </span>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatConvTime(iso: string) {
  const d = new Date(iso); const now = new Date();
  if (d.toDateString() === now.toDateString()) return formatTime(iso);
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short" });
}

function dateSeparatorLabel(iso: string) {
  const d = new Date(iso); const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long" });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60); const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function lastMsgPreview(msg: ApiConversation["lastMessage"]) {
  if (!msg) return "No messages yet";
  if (msg.type === "IMAGE") return "📷 Photo";
  if (msg.type === "FILE")  return "📄 File";
  if (msg.type === "AUDIO") return "🎤 Voice note";
  if (msg.type === "LOCATION" || msg.type === "LIVE_LOCATION") return "📍 Location";
  if (msg.type === "VIDEO_CALL") return "📹 Video call";
  return msg.content ?? "No messages yet";
}

// ─── View-once wrapper ────────────────────────────────────────────────────────

function ViewOnceWrapper({
  messageId, conversationId, viewedBy, myId, children,
}: {
  messageId: string; conversationId: string; viewedBy: string[]; myId: string | undefined;
  children: React.ReactNode;
}) {
  const [revealed, setRevealed] = useState(false);
  const isViewed = !!myId && viewedBy.includes(myId);

  async function reveal() {
    if (isViewed || revealed) return;
    setRevealed(true);
    await api.markMessageViewed(conversationId, messageId).catch(() => null);
  }

  if (isViewed && viewedBy.length > 0 && !revealed) {
    return (
      <div className="flex h-16 w-32 items-center justify-center rounded-xl text-xs font-semibold"
        style={{ background: "rgba(0,0,0,0.10)", color: "rgba(255,255,255,0.50)" }}>
        <Eye size={12} className="mr-1.5" /> Viewed
      </div>
    );
  }

  if (!isViewed && !revealed) {
    return (
      <button type="button" onClick={reveal}
        className="flex h-16 w-32 flex-col items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-white"
        style={{ background: "rgba(0,0,0,0.30)", backdropFilter: "blur(4px)" }}>
        <Eye size={16} />
        Tap to view
      </button>
    );
  }

  return <>{children}</>;
}

// ─── Rich message renderers ───────────────────────────────────────────────────

function ImageMessage({ msg, mine, conversationId, myId }: { msg: ApiMessage; mine: boolean; conversationId: string; myId?: string }) {
  const inner = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={msg.mediaUrl!} alt="Sent image"
      className="max-w-[220px] rounded-xl object-cover"
      style={{ maxHeight: 200, cursor: "pointer" }}
      onClick={() => window.open(msg.mediaUrl!, "_blank")} />
  );
  if (msg.viewOnce) {
    return <ViewOnceWrapper messageId={msg.id} conversationId={conversationId} viewedBy={msg.viewedBy} myId={myId}>{inner}</ViewOnceWrapper>;
  }
  return inner;
}

function AudioMessage({ msg, conversationId, myId }: { msg: ApiMessage; mine: boolean; conversationId: string; myId?: string }) {
  const inner = (
    <div className="flex min-w-[180px] items-center gap-3 rounded-xl px-3 py-2.5"
      style={{ background: "rgba(255,255,255,0.12)" }}>
      <Mic size={14} className="shrink-0 text-white opacity-80" />
      <audio controls className="h-8 max-w-[140px]" style={{ colorScheme: "dark" }}>
        <source src={msg.mediaUrl!} />
      </audio>
      {msg.duration != null && (
        <span className="text-[10px] text-white opacity-60">{formatDuration(msg.duration)}</span>
      )}
    </div>
  );
  if (msg.viewOnce) {
    return <ViewOnceWrapper messageId={msg.id} conversationId={conversationId} viewedBy={msg.viewedBy} myId={myId}>{inner}</ViewOnceWrapper>;
  }
  return inner;
}

function FileMessage({ msg }: { msg: ApiMessage }) {
  return (
    <a href={msg.mediaUrl!} download={msg.fileName ?? "file"} target="_blank" rel="noopener noreferrer"
      className="flex min-w-[180px] items-center gap-3 rounded-xl px-3 py-2.5 transition-opacity hover:opacity-80"
      style={{ background: "rgba(255,255,255,0.12)" }}>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: "rgba(255,255,255,0.15)" }}>
        <FileText size={16} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-white">{msg.fileName ?? "File"}</p>
        {msg.fileSize != null && <p className="text-[10px] text-white opacity-60">{formatBytes(msg.fileSize)}</p>}
      </div>
      <Download size={13} className="shrink-0 text-white opacity-60" />
    </a>
  );
}

function LocationMessage({ msg, mine }: { msg: ApiMessage; mine: boolean }) {
  const lat = msg.latitude!; const lng = msg.longitude!;
  const isLive = msg.type === "LIVE_LOCATION";
  const expired = isLive && msg.liveUntil ? new Date(msg.liveUntil) < new Date() : false;

  return (
    <div className="overflow-hidden rounded-xl" style={{ width: 220 }}>
      <div className="relative">
        <iframe
          title="location"
          width="220" height="140"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`}
          className="block border-0"
          loading="lazy"
        />
        {isLive && !expired && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
            style={{ background: "rgba(239,68,68,0.90)" }}>
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />
            LIVE
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-2.5 py-2"
        style={{ background: "rgba(255,255,255,0.14)" }}>
        <div className="flex items-center gap-1.5">
          <MapPin size={11} className="text-white opacity-70" />
          <span className="text-[11px] text-white opacity-80">{msg.locationName ?? (isLive ? "Live location" : "Location")}</span>
          {isLive && expired && <span className="text-[9px] text-white opacity-50">(expired)</span>}
        </div>
        <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`} target="_blank" rel="noopener noreferrer"
          className="text-[9px] font-bold text-white opacity-60 hover:opacity-100">Open ↗</a>
      </div>
    </div>
  );
}

function CallMessage({ msg }: { msg: ApiMessage }) {
  const status = msg.callStatus ?? "ended";
  const icon   = status === "declined" ? <PhoneOff size={14} /> : <Video size={14} />;
  const label  = status === "pending"  ? "Incoming video call…"
               : status === "accepted" ? "Video call"
               : status === "declined" ? "Call declined"
               : status === "missed"   ? "Missed call"
               : "Video call ended";

  return (
    <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
      style={{ background: "rgba(255,255,255,0.12)", minWidth: 160 }}>
      <span className="text-white opacity-70">{icon}</span>
      <span className="text-xs font-semibold text-white">{label}</span>
    </div>
  );
}

// ─── Message bubble ────────────────────────────────────────────────────────────

function Bubble({ message, isFirst, isLast, conversationId, myId }: {
  message: ApiMessage; isFirst: boolean; isLast: boolean;
  conversationId: string; myId?: string;
}) {
  const mine = message.mine;
  const isMedia = message.type !== "TEXT";

  return (
    <div className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
      {!mine && (
        <div className={cn("h-7 w-7 shrink-0 rounded-full", isLast ? "opacity-100" : "opacity-0")} style={{ background: "#0F172A" }}>
          {isLast && (
            <span className="flex h-full w-full items-center justify-center text-[10px] font-black text-white">
              {getInitials(message.sender?.name ?? "?")}
            </span>
          )}
        </div>
      )}

      <div
        className={cn("relative", isMedia ? "" : "px-3.5 py-2",
          mine
            ? "rounded-2xl rounded-br-md text-white"
            : "rounded-2xl rounded-bl-md",
        )}
        style={isMedia
          ? { background: mine ? "#0F172A" : undefined }
          : {
              background: mine ? "#0F172A" : "rgba(255,255,255,0.95)",
              boxShadow: "0 1px 4px rgba(15,23,42,0.10)",
              border: mine ? "none" : "1px solid rgba(226,232,240,0.80)",
              maxWidth: "72vw",
            }
        }
      >
        {/* Render by type */}
        {message.type === "TEXT" && (
          <p className="text-sm leading-[1.55]" style={{ color: mine ? "#fff" : "#1E293B" }}>{message.content}</p>
        )}
        {message.type === "IMAGE" && (
          <ImageMessage msg={message} mine={mine} conversationId={conversationId} myId={myId} />
        )}
        {message.type === "AUDIO" && (
          <AudioMessage msg={message} mine={mine} conversationId={conversationId} myId={myId} />
        )}
        {message.type === "FILE" && <FileMessage msg={message} />}
        {(message.type === "LOCATION" || message.type === "LIVE_LOCATION") && (
          <LocationMessage msg={message} mine={mine} />
        )}
        {message.type === "VIDEO_CALL" && <CallMessage msg={message} />}

        {/* Timestamp + read */}
        <div className={cn("mt-0.5 flex items-center gap-1 px-1 pb-0.5",
          mine ? "justify-end" : "justify-start",
          isMedia ? "absolute bottom-1 right-2" : ""
        )}>
          <span className="text-[10px] font-medium" style={{ color: mine || isMedia ? "rgba(255,255,255,0.55)" : "#94A3B8" }}>
            {formatTime(message.createdAt)}
          </span>
          {mine && (
            message.read
              ? <CheckCheck size={12} style={{ color: isMedia ? "rgba(255,255,255,0.80)" : "#7FB685" }} />
              : <Check size={12} style={{ color: "rgba(255,255,255,0.55)" }} />
          )}
        </div>
      </div>
    </div>
  );
}

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
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
      style={active ? { background: "rgba(127,182,133,0.12)" } : undefined}>
      <div className="relative h-12 w-12 shrink-0">
        <div className="grid h-full w-full overflow-hidden place-items-center rounded-full text-sm font-black text-white"
          style={{ background: "linear-gradient(135deg, #0F172A, #1a3a2a)" }}>
          <AvatarCircle avatar={conv.user.avatar} name={conv.user.name} size={48} />
        </div>
        {conv.user.verified && (
          <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full text-[8px]"
            style={{ background: "#7FB685", border: "2px solid #fff" }}>✓</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("truncate text-sm", conv.unread > 0 ? "font-black" : "font-semibold")} style={{ color: "#1E293B" }}>
            {conv.user.name}
          </span>
          <span className="shrink-0 text-[11px]" style={{ color: conv.unread > 0 ? "#5A9460" : "#94A3B8", fontWeight: conv.unread > 0 ? 700 : 400 }}>
            {formatConvTime(conv.updatedAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className={cn("truncate text-xs", conv.unread > 0 ? "font-semibold" : "font-normal")}
            style={{ color: conv.unread > 0 ? "#1E293B" : "#94A3B8" }}>
            {lastMsgPreview(conv.lastMessage)}
          </span>
          {conv.unread > 0 && (
            <span className="grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full px-1 text-[10px] font-black text-white"
              style={{ background: "#7FB685" }}>
              {conv.unread > 99 ? "99+" : conv.unread}
            </span>
          )}
        </div>
        {conv.product && (
          <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: "#C68B59" }}>
            📦 {conv.product.title.length > 28 ? conv.product.title.slice(0, 28) + "…" : conv.product.title}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── New chat modal ────────────────────────────────────────────────────────────

function NewChatModal({ onClose, onStarted }: { onClose: () => void; onStarted: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ id: string; name: string; avatar: string | null; verified: boolean }>>([]);
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { setResults(await api.searchUsers(q.trim())); }
      catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  async function handleStart(userId: string) {
    setStarting(userId);
    try { onStarted((await api.startConversation(userId)).id); }
    catch { /* ignore */ }
    finally { setStarting(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.50)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl"
        style={{ background: "rgba(10,15,26,0.96)", border: "1px solid rgba(255,255,255,0.10)" }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="text-base font-black text-white">New message</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-1.5" style={{ color: "rgba(255,255,255,0.50)" }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 rounded-2xl px-3"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <Search size={14} style={{ color: "rgba(255,255,255,0.40)" }} />
            <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search by name…"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-[rgba(255,255,255,0.30)]" />
            {searching && <Loader2 size={14} className="animate-spin shrink-0" style={{ color: "rgba(255,255,255,0.40)" }} />}
          </div>
          <div className="mt-3 max-h-64 overflow-y-auto">
            {q.trim().length < 2 && <p className="py-6 text-center text-xs" style={{ color: "rgba(255,255,255,0.30)" }}>Type at least 2 characters</p>}
            {q.trim().length >= 2 && !searching && results.length === 0 && <p className="py-6 text-center text-xs" style={{ color: "rgba(255,255,255,0.30)" }}>No users found</p>}
            {results.map(user => (
              <button key={user.id} type="button" onClick={() => handleStart(user.id)} disabled={starting === user.id}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors disabled:opacity-60"
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = ""; }}>
                <div className="grid h-10 w-10 shrink-0 overflow-hidden place-items-center rounded-full text-xs font-black text-white"
                  style={{ background: "linear-gradient(135deg, #0F172A, #1a3a2a)" }}>
                  <AvatarCircle avatar={user.avatar} name={user.name} size={40} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-bold text-white">{user.name}</p>
                  {user.verified && <p className="text-xs" style={{ color: "#7FB685" }}>✓ Verified</p>}
                </div>
                {starting === user.id
                  ? <Loader2 size={16} className="animate-spin shrink-0" style={{ color: "#7FB685" }} />
                  : <Send size={14} className="shrink-0" style={{ color: "rgba(255,255,255,0.35)" }} />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Camera capture modal ──────────────────────────────────────────────────────

function CameraModal({ onCapture, onClose }: { onCapture: (blob: Blob) => void; onClose: () => void }) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError("Camera access denied. Please allow camera in your browser."));
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob(blob => { if (blob) onCapture(blob); }, "image/jpeg", 0.92);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full p-2" style={{ background: "rgba(255,255,255,0.15)" }}>
        <X size={20} className="text-white" />
      </button>
      {error ? (
        <p className="text-center text-sm text-white opacity-70 px-8">{error}</p>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-[70vh] object-contain" />
          <div className="mt-6">
            <button type="button" onClick={capture}
              className="grid h-16 w-16 place-items-center rounded-full border-4 border-white bg-transparent">
              <span className="h-12 w-12 rounded-full bg-white" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Voice recorder ────────────────────────────────────────────────────────────

function VoiceRecorder({ onSend, onCancel }: { onSend: (blob: Blob, duration: number) => void; onCancel: () => void }) {
  const [recording, setRecording]   = useState(false);
  const [elapsed, setElapsed]        = useState(0);
  const [blob, setBlob]              = useState<Blob | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  useEffect(() => { startRecord(); return () => stopTimer(); }, []); // eslint-disable-line

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  async function startRecord() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mimeType });
        stream.getTracks().forEach(t => t.stop());
        setBlob(b);
        setRecording(false);
      };

      recorder.start(100);
      setRecording(true);
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 200);
    } catch {
      onCancel();
    }
  }

  function stop() {
    stopTimer();
    recorderRef.current?.stop();
  }

  function send() {
    if (blob) onSend(blob, elapsed);
  }

  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={onCancel} className="grid h-9 w-9 place-items-center rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444" }}>
        <X size={16} />
      </button>

      <div className="flex flex-1 items-center gap-3 rounded-full px-4 py-2.5"
        style={{ background: "rgba(248,245,239,0.90)", border: "1px solid rgba(226,232,240,0.80)" }}>
        {recording ? (
          <>
            <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}
              className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />
            <span className="text-sm font-semibold text-red-600">{formatDuration(elapsed)}</span>
            <span className="flex-1 text-xs" style={{ color: "#94A3B8" }}>Recording…</span>
          </>
        ) : blob ? (
          <span className="text-sm font-semibold" style={{ color: "#1E293B" }}>Voice note ({formatDuration(elapsed)})</span>
        ) : (
          <Loader2 size={14} className="animate-spin" />
        )}
      </div>

      {recording ? (
        <button type="button" onClick={stop}
          className="grid h-9 w-9 place-items-center rounded-full"
          style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444" }}>
          <Square size={14} />
        </button>
      ) : blob ? (
        <button type="button" onClick={send}
          className="grid h-9 w-9 place-items-center rounded-full text-white"
          style={{ background: "#0F172A" }}>
          <Send size={14} />
        </button>
      ) : null}
    </div>
  );
}

// ─── Attachment menu ───────────────────────────────────────────────────────────

function AttachmentMenu({
  open, onClose,
  onImageFile, onDocFile, onCamera, onVoice, onLocation, onLiveLocation,
}: {
  open: boolean; onClose: () => void;
  onImageFile: () => void; onDocFile: () => void; onCamera: () => void;
  onVoice: () => void; onLocation: () => void; onLiveLocation: () => void;
}) {
  const items = [
    { icon: Camera,    label: "Camera",        color: "#6366F1", action: onCamera,        tip: "Take a photo" },
    { icon: ImageIcon, label: "Photo",          color: "#10B981", action: onImageFile,     tip: "Send image" },
    { icon: FileText,  label: "Document",       color: "#F59E0B", action: onDocFile,       tip: "Send file" },
    { icon: Mic,       label: "Voice note",     color: "#EF4444", action: onVoice,         tip: "Record voice" },
    { icon: MapPin,    label: "Location",       color: "#3B82F6", action: onLocation,      tip: "Share location" },
    { icon: Navigation,label: "Live location",  color: "#EC4899", action: onLiveLocation,  tip: "Share live location" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-20" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={spring}
            className="absolute bottom-14 left-0 z-30 grid grid-cols-3 gap-2 rounded-2xl p-3 shadow-xl"
            style={{ background: "rgba(255,255,255,0.98)", border: "1px solid rgba(226,232,240,0.80)", width: 240 }}
          >
            {items.map(({ icon: Icon, label, color, action, tip }) => (
              <button key={label} type="button" title={tip}
                onClick={() => { action(); onClose(); }}
                className="flex flex-col items-center gap-1.5 rounded-2xl p-3 transition-colors hover:bg-slate-50">
                <div className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: `${color}1A` }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <span className="text-[10px] font-bold" style={{ color: "#334155" }}>{label}</span>
              </button>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Incoming call modal ───────────────────────────────────────────────────────

function IncomingCallModal({
  callerName, onAccept, onReject,
}: {
  callerName: string; onAccept: () => void; onReject: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
      className="fixed inset-x-4 top-20 z-50 mx-auto max-w-sm overflow-hidden rounded-3xl shadow-2xl"
      style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.12)" }}>
      <div className="px-6 py-5 text-center">
        <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full" style={{ background: "rgba(114,204,35,0.15)" }}>
          <Video size={28} style={{ color: "#72CC23" }} />
        </div>
        <p className="text-base font-black text-white">{callerName}</p>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.50)" }}>Incoming video call…</p>
        <div className="mt-5 flex justify-center gap-4">
          <button type="button" onClick={onReject}
            className="grid h-14 w-14 place-items-center rounded-full text-white"
            style={{ background: "#EF4444" }}>
            <PhoneOff size={22} />
          </button>
          <button type="button" onClick={onAccept}
            className="grid h-14 w-14 place-items-center rounded-full text-white"
            style={{ background: "#22C55E" }}>
            <Video size={22} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Video call overlay ────────────────────────────────────────────────────────

function VideoCallOverlay({
  onEnd, localStream, remoteStream, status,
}: {
  onEnd: () => void; localStream: MediaStream | null; remoteStream: MediaStream | null; status: string;
}) {
  const localRef  = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  useEffect(() => {
    if (localRef.current  && localStream)  localRef.current.srcObject  = localStream;
    if (remoteRef.current && remoteStream) remoteRef.current.srcObject = remoteStream;
  }, [localStream, remoteStream]);

  function toggleMute() {
    if (localStream) localStream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMuted(v => !v);
  }
  function toggleCam() {
    if (localStream) localStream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCamOff(v => !v);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Remote video (full screen) */}
      <video ref={remoteRef} autoPlay playsInline className="h-full w-full object-cover"
        style={{ opacity: remoteStream ? 1 : 0 }} />

      {/* Status overlay when waiting */}
      {!remoteStream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Loader2 size={32} className="animate-spin text-white opacity-70" />
          <p className="mt-3 text-sm text-white opacity-70">{status}</p>
        </div>
      )}

      {/* Local video PiP */}
      <div className="absolute right-4 top-4 overflow-hidden rounded-2xl shadow-lg" style={{ width: 96, height: 128 }}>
        <video ref={localRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        {camOff && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <VideoOff size={20} className="text-white opacity-60" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-10 left-0 right-0 flex items-center justify-center gap-6">
        <button type="button" onClick={toggleMute}
          className="grid h-14 w-14 place-items-center rounded-full"
          style={{ background: muted ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.12)" }}>
          {muted ? <MicOff size={22} className="text-white" /> : <Mic size={22} className="text-white" />}
        </button>
        <button type="button" onClick={onEnd}
          className="grid h-16 w-16 place-items-center rounded-full text-white"
          style={{ background: "#EF4444" }}>
          <PhoneOff size={26} />
        </button>
        <button type="button" onClick={toggleCam}
          className="grid h-14 w-14 place-items-center rounded-full"
          style={{ background: camOff ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.12)" }}>
          {camOff ? <VideoOff size={22} className="text-white" /> : <Video size={22} className="text-white" />}
        </button>
      </div>
    </div>
  );
}

// ─── Main content ──────────────────────────────────────────────────────────────

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: "#7FB685" }} /></div>}>
      <MessagesContent />
    </Suspense>
  );
}

function MessagesContent() {
  const searchParams   = useSearchParams();
  const { data: profile } = useProfile();
  const myId = profile?.id;

  const { data: conversations, isLoading: loadingConv } = useConversations();
  const [activeId, setActiveId]     = useState<string | null>(searchParams.get("c"));
  const [query, setQuery]           = useState("");
  const [text, setText]             = useState("");
  const [sending, setSending]       = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showVoice, setShowVoice]   = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Live location sharing state
  const [sharingLive, setSharingLive]       = useState(false);
  const liveWatchRef = useRef<number | null>(null);
  const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // WebRTC call state
  const [callState, setCallState]     = useState<"idle" | "calling" | "incoming" | "in-call">("idle");
  const [incomingCall, setIncomingCall] = useState<{ from: string; fromName: string; conversationId: string; offer: RTCSessionDescriptionInit } | null>(null);
  const [localStream,  setLocalStream]  = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus,   setCallStatus]   = useState("Calling…");
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const imageInputRef  = useRef<HTMLInputElement>(null);
  const docInputRef    = useRef<HTMLInputElement>(null);
  const { mutate }     = useSWRConfig();
  const { socketRef, connected } = useSocket();

  const active  = (conversations as ApiConversation[]).find(c => c.id === activeId) ?? null;
  const otherUserId = active ? (myId === active.user.id ? undefined : active.user.id) : undefined;

  // Auto-select first conversation
  useEffect(() => {
    const req = searchParams.get("c");
    if (req) { setActiveId(req); return; }
    if (!activeId && (conversations as ApiConversation[]).length > 0) {
      setActiveId((conversations as ApiConversation[])[0]!.id);
    }
  }, [conversations, activeId, searchParams]);

  const { data: messagesData, isLoading: loadingMessages } = useMessages(active?.id ?? null);
  const messages = messagesData ?? [];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (!activeId) return;
    joinConversation(socketRef.current, activeId);
    return () => leaveConversation(socketRef.current, activeId);
  }, [activeId, socketRef, connected]);
  useEffect(() => { if (active) setTimeout(() => inputRef.current?.focus(), 100); }, [active?.id]);

  // Socket: incoming call + view-once events
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    function handleCallOffer(raw: unknown) {
      const data = raw as { from: string; conversationId: string; offer: RTCSessionDescriptionInit };
      const conv = (conversations as ApiConversation[]).find(c => c.id === data.conversationId);
      setIncomingCall({ ...data, fromName: conv?.user.name ?? "Someone" });
      setCallState("incoming");
    }
    function handleCallAnswer(raw: unknown) {
      const data = raw as { answer: RTCSessionDescriptionInit };
      void pcRef.current?.setRemoteDescription(data.answer);
      setCallStatus("Connected");
      setCallState("in-call");
    }
    function handleCallIce(raw: unknown) {
      const data = raw as { candidate: RTCIceCandidateInit };
      void pcRef.current?.addIceCandidate(data.candidate);
    }
    function handleCallEnd() {
      endCall(false);
    }
    function handleCallReject() {
      setCallStatus("Call declined");
      endCall(false);
    }

    socket.on("call:offer",  handleCallOffer);
    socket.on("call:answer", handleCallAnswer);
    socket.on("call:ice",    handleCallIce);
    socket.on("call:end",    handleCallEnd);
    socket.on("call:reject", handleCallReject);

    return () => {
      socket.off("call:offer",  handleCallOffer);
      socket.off("call:answer", handleCallAnswer);
      socket.off("call:ice",    handleCallIce);
      socket.off("call:end",    handleCallEnd);
      socket.off("call:reject", handleCallReject);
    };
  }, [socketRef.current, conversations]); // eslint-disable-line

  const visible = (conversations as ApiConversation[]).filter(c => {
    const q = query.toLowerCase();
    return c.user.name.toLowerCase().includes(q) || (c.product?.title.toLowerCase().includes(q) ?? false);
  });

  // ── Send helpers ──────────────────────────────────────────────────────────

  async function handleSend() {
    if (!active || !text.trim()) return;
    setSending(true);
    const content = text.trim();
    setText("");
    try {
      await api.sendMessage(active.id, content);
      await mutate(`messages-${active.id}`);
      await mutate("conversations");
    } catch { setText(content); }
    finally { setSending(false); }
  }

  async function sendRich(data: Parameters<typeof api.sendRichMessage>[1]) {
    if (!active) return;
    setSending(true);
    try {
      await api.sendRichMessage(active.id, data);
      await mutate(`messages-${active.id}`);
      await mutate("conversations");
    } finally { setSending(false); }
  }

  async function uploadAndSend(file: File, viewOnce = false) {
    if (!active) return;
    setUploadingMedia(true);
    try {
      const { url, fileName, fileSize, mimeType } = await api.uploadMessageMedia(file);
      const isImage = mimeType.startsWith("image/");
      const isAudio = mimeType.startsWith("audio/");
      await sendRich({
        type: isImage ? "IMAGE" : isAudio ? "AUDIO" : "FILE",
        mediaUrl: url,
        fileName,
        fileSize,
        mimeType,
        viewOnce,
      });
    } finally { setUploadingMedia(false); }
  }

  async function handleCameraCapture(blob: Blob) {
    setShowCamera(false);
    const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
    await uploadAndSend(file);
  }

  async function handleVoiceSend(blob: Blob, duration: number) {
    setShowVoice(false);
    if (!active) return;
    setUploadingMedia(true);
    try {
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
      const { url, fileSize, mimeType } = await api.uploadMessageMedia(file);
      await sendRich({ type: "AUDIO", mediaUrl: url, fileSize, mimeType, duration });
    } finally { setUploadingMedia(false); }
  }

  async function handleShareLocation() {
    if (!active) return;
    setSending(true);
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 })
      );
      await sendRich({
        type: "LOCATION",
        latitude:  pos.coords.latitude,
        longitude: pos.coords.longitude,
        locationName: "My location",
      });
    } catch { alert("Could not get your location. Please allow location access."); }
    finally { setSending(false); }
  }

  async function handleLiveLocation() {
    if (!active || sharingLive) return;
    const stream = navigator.geolocation;
    const LIVE_DURATION = 5 * 60 * 1000; // 5 minutes

    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        stream.getCurrentPosition(res, rej, { enableHighAccuracy: true })
      );
      const liveUntil = new Date(Date.now() + LIVE_DURATION).toISOString();
      await sendRich({
        type: "LIVE_LOCATION",
        latitude:  pos.coords.latitude,
        longitude: pos.coords.longitude,
        locationName: "Live location",
        liveUntil,
      });

      setSharingLive(true);
      liveWatchRef.current = stream.watchPosition(
        p => api.updateLiveLocation(active.id, p.coords.latitude, p.coords.longitude).catch(() => null),
        undefined,
        { enableHighAccuracy: true }
      );
      liveTimerRef.current = setTimeout(() => stopLiveLocation(), LIVE_DURATION);
    } catch { alert("Could not get your location."); }
  }

  function stopLiveLocation() {
    if (liveWatchRef.current !== null) navigator.geolocation.clearWatch(liveWatchRef.current);
    if (liveTimerRef.current !== null) clearTimeout(liveTimerRef.current);
    setSharingLive(false);
  }

  useEffect(() => () => stopLiveLocation(), []); // eslint-disable-line

  // ── WebRTC ────────────────────────────────────────────────────────────────

  function createPeerConnection(remoteUserId: string) {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = e => {
      if (e.candidate && socketRef.current) {
        socketRef.current.emit("call:ice", { to: remoteUserId, candidate: e.candidate });
      }
    };

    pc.ontrack = e => {
      setRemoteStream(e.streams[0] ?? null);
    };

    return pc;
  }

  async function startVideoCall() {
    if (!active || !otherUserId) return;
    setCallState("calling");
    setCallStatus("Calling…");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);

      const pc = createPeerConnection(otherUserId);
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current?.emit("call:offer", {
        to: otherUserId,
        conversationId: active.id,
        offer: pc.localDescription,
      });

      await sendRich({ type: "VIDEO_CALL", callStatus: "pending" });
    } catch {
      setCallState("idle");
    }
  }

  async function acceptCall() {
    if (!incomingCall) return;
    setCallState("in-call");
    setCallStatus("Connected");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);

      const pc = createPeerConnection(incomingCall.from);
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      await pc.setRemoteDescription(incomingCall.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current?.emit("call:answer", { to: incomingCall.from, answer: pc.localDescription });

      setIncomingCall(null);
    } catch {
      endCall(true);
    }
  }

  function rejectCall() {
    if (!incomingCall) return;
    socketRef.current?.emit("call:reject", { to: incomingCall.from });
    setIncomingCall(null);
    setCallState("idle");
  }

  function endCall(notifyOther = true) {
    if (notifyOther && otherUserId && active) {
      socketRef.current?.emit("call:end", { to: otherUserId, conversationId: active.id });
    }
    localStream?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallState("idle");
    setCallStatus("Idle");
  }

  // ── Group messages ────────────────────────────────────────────────────────

  const groupedMessages = useMemo(() => {
    type Item = { type: "date"; label: string } | { type: "msg"; message: ApiMessage; isFirst: boolean; isLast: boolean };
    const items: Item[] = [];
    let lastDate = ""; let lastSenderId = "";

    messages.forEach((msg, i) => {
      const dateLabel = dateSeparatorLabel(msg.createdAt);
      if (dateLabel !== lastDate) { items.push({ type: "date", label: dateLabel }); lastDate = dateLabel; lastSenderId = ""; }
      const prevSenderId = lastSenderId; lastSenderId = msg.senderId;
      const next = messages[i + 1];
      items.push({
        type: "msg", message: msg,
        isFirst: prevSenderId !== msg.senderId,
        isLast:  !next || next.senderId !== msg.senderId || dateSeparatorLabel(next.createdAt) !== lastDate,
      });
    });
    return items;
  }, [messages]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AuthGate>
      <div className="container-shell py-4 md:py-6">
        <div className="overflow-hidden rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.82)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(226,232,240,0.70)", boxShadow: "0 4px 24px rgba(15,23,42,0.08)",
            height: "calc(100vh - 120px)", minHeight: 600,
          }}>
          <div className="grid h-full md:grid-cols-[320px_1fr]">

            {/* ── Sidebar ── */}
            <aside className={cn("flex flex-col border-r", active ? "hidden md:flex" : "flex")}
              style={{ borderColor: "rgba(226,232,240,0.60)" }}>
              <div className="px-4 pb-3 pt-4" style={{ borderBottom: "1px solid rgba(226,232,240,0.60)" }}>
                <div className="flex items-center justify-between">
                  <h1 className="text-lg font-black" style={{ color: "#1E293B" }}>Messages</h1>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: connected ? "rgba(127,182,133,0.12)" : "rgba(148,163,184,0.12)", color: connected ? "#4A7C59" : "#94A3B8" }}>
                      <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: connected ? "#7FB685" : "#CBD5E1" }} />
                      {connected ? "Live" : "Connecting…"}
                    </span>
                    <button type="button" onClick={() => setShowNewChat(true)}
                      className="grid h-7 w-7 place-items-center rounded-xl transition-colors"
                      style={{ background: "rgba(127,182,133,0.12)", color: "#4A7C59" }}>
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-2xl px-3"
                  style={{ background: "rgba(248,245,239,0.80)", border: "1px solid rgba(226,232,240,0.70)" }}>
                  <Search size={14} style={{ color: "#94A3B8" }} />
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search chats…"
                    className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none" style={{ color: "#1E293B" }} />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100/60">
                {loadingConv ? (
                  <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin" style={{ color: "#7FB685" }} /></div>
                ) : visible.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <p className="text-sm font-semibold" style={{ color: "#94A3B8" }}>{query ? "No chats match." : "No conversations yet."}</p>
                  </div>
                ) : visible.map(conv => <ConvItem key={conv.id} conv={conv} active={active?.id === conv.id} onClick={() => setActiveId(conv.id)} />)}
              </div>
            </aside>

            {/* ── Chat area ── */}
            <section className={cn("flex flex-col", active ? "flex" : "hidden md:flex")}>
              {active ? (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: "1px solid rgba(226,232,240,0.60)", background: "rgba(255,255,255,0.96)" }}>
                    <button onClick={() => setActiveId(null)}
                      className="mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-colors hover:bg-slate-100 md:hidden">
                      <ArrowLeft size={16} style={{ color: "#64748B" }} />
                    </button>
                    <div className="grid h-10 w-10 shrink-0 overflow-hidden place-items-center rounded-full text-xs font-black text-white"
                      style={{ background: "linear-gradient(135deg, #0F172A, #1a3a2a)" }}>
                      <AvatarCircle avatar={active.user.avatar} name={active.user.name} size={40} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm" style={{ color: "#1E293B" }}>{active.user.name}</p>
                      {active.product && (
                        <p className="truncate text-xs font-semibold" style={{ color: "#C68B59" }}>📦 {active.product.title}</p>
                      )}
                      {sharingLive && (
                        <p className="text-[10px] font-bold" style={{ color: "#EC4899" }}>📍 Sharing live location</p>
                      )}
                    </div>
                    {/* Video call button */}
                    <button type="button" onClick={startVideoCall} disabled={callState !== "idle"}
                      title="Video call"
                      className="grid h-9 w-9 place-items-center rounded-xl transition-colors hover:bg-slate-100 disabled:opacity-40">
                      <Video size={18} style={{ color: "#64748B" }} />
                    </button>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
                    style={{ background: "rgba(248,245,239,0.60)" }}>
                    {loadingMessages ? (
                      <div className="flex h-full items-center justify-center"><Loader2 size={24} className="animate-spin" style={{ color: "#7FB685" }} /></div>
                    ) : groupedMessages.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                        <div className="grid h-16 w-16 place-items-center rounded-full text-2xl" style={{ background: "rgba(127,182,133,0.10)" }}>💬</div>
                        <p className="font-bold text-sm" style={{ color: "#1E293B" }}>No messages yet</p>
                        <p className="text-xs" style={{ color: "#94A3B8" }}>Say hello!</p>
                      </div>
                    ) : groupedMessages.map((item, i) =>
                        item.type === "date"
                          ? <DateSeparator key={`d-${i}`} label={item.label} />
                          : <Bubble key={item.message.id} message={item.message} isFirst={item.isFirst} isLast={item.isLast} conversationId={active.id} myId={myId} />
                      )
                    }
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="relative px-4 py-3" style={{ borderTop: "1px solid rgba(226,232,240,0.60)", background: "rgba(255,255,255,0.96)" }}>

                    {/* Attachment menu */}
                    <AttachmentMenu
                      open={showAttach} onClose={() => setShowAttach(false)}
                      onImageFile={() => imageInputRef.current?.click()}
                      onDocFile={() => docInputRef.current?.click()}
                      onCamera={() => setShowCamera(true)}
                      onVoice={() => setShowVoice(true)}
                      onLocation={handleShareLocation}
                      onLiveLocation={handleLiveLocation}
                    />

                    {/* Hidden file inputs */}
                    <input ref={imageInputRef} type="file" accept="image/*" className="sr-only"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadAndSend(f); e.target.value = ""; }} />
                    <input ref={docInputRef} type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                      className="sr-only"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadAndSend(f); e.target.value = ""; }} />

                    {showVoice ? (
                      <VoiceRecorder onSend={handleVoiceSend} onCancel={() => setShowVoice(false)} />
                    ) : (
                      <div className="flex items-center gap-2">
                        {/* Attach button */}
                        <motion.button type="button" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} transition={spring}
                          onClick={() => setShowAttach(v => !v)} disabled={uploadingMedia}
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors disabled:opacity-40"
                          style={{ background: showAttach ? "rgba(127,182,133,0.18)" : "rgba(248,245,239,0.90)", border: "1px solid rgba(226,232,240,0.80)", color: showAttach ? "#4A7C59" : "#64748B" }}>
                          {uploadingMedia ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                        </motion.button>

                        {/* Text input */}
                        <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                          placeholder="Type a message…"
                          className="min-w-0 flex-1 rounded-full px-4 py-3 text-sm outline-none"
                          style={{ background: "rgba(248,245,239,0.90)", border: "1px solid rgba(226,232,240,0.80)", color: "#1E293B" }}
                          maxLength={2000} disabled={sending || uploadingMedia} />

                        {/* Send / mic */}
                        {text.trim() ? (
                          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} transition={spring}
                            onClick={handleSend} disabled={sending}
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white disabled:opacity-40"
                            style={{ background: "#0F172A" }}>
                            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                          </motion.button>
                        ) : (
                          <motion.button type="button" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} transition={spring}
                            onClick={() => setShowVoice(true)}
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
                            style={{ background: "rgba(248,245,239,0.90)", border: "1px solid rgba(226,232,240,0.80)", color: "#64748B" }}>
                            <Mic size={16} />
                          </motion.button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center" style={{ background: "rgba(248,245,239,0.40)" }}>
                  <div className="grid h-20 w-20 place-items-center rounded-full text-3xl"
                    style={{ background: "rgba(127,182,133,0.10)", border: "1px solid rgba(127,182,133,0.20)" }}>💬</div>
                  <div>
                    <p className="text-lg font-black" style={{ color: "#1E293B" }}>Your messages</p>
                    <p className="mt-1 max-w-xs text-sm" style={{ color: "#64748B" }}>
                      Select a conversation, or message a seller from any product listing.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showNewChat && (
        <NewChatModal onClose={() => setShowNewChat(false)}
          onStarted={id => { setShowNewChat(false); setActiveId(id); void mutate("conversations"); }} />
      )}
      {showCamera && <CameraModal onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}

      {/* Incoming call */}
      <AnimatePresence>
        {callState === "incoming" && incomingCall && (
          <IncomingCallModal callerName={incomingCall.fromName} onAccept={acceptCall} onReject={rejectCall} />
        )}
      </AnimatePresence>

      {/* Active video call */}
      {(callState === "calling" || callState === "in-call") && (
        <VideoCallOverlay
          onEnd={() => endCall(true)}
          localStream={localStream}
          remoteStream={remoteStream}
          status={callStatus}
        />
      )}
    </AuthGate>
  );
}
