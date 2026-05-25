"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  CalendarDays,
  Edit3,
  Loader2,
  MapPin,
  Megaphone,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useProfile } from "@/hooks/use-api";
import type { CampusEvent } from "@/types";

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en-GH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "Campus update":  { bg: "rgba(15,23,42,0.08)",    text: "#0F172A" },
  "Academic":       { bg: "rgba(127,182,133,0.18)",  text: "#2D6A4F" },
  "Social":         { bg: "rgba(198,139,89,0.18)",   text: "#7D4E1F" },
  "Career":         { bg: "rgba(99,102,241,0.18)",   text: "#3730A3" },
  "Sports":         { bg: "rgba(239,68,68,0.15)",    text: "#B91C1C" },
};

function categoryStyle(cat: string) {
  return CATEGORY_COLORS[cat] ?? { bg: "rgba(226,232,240,0.70)", text: "#475569" };
}

// ─── Event form modal ─────────────────────────────────────────────────────────

type EventFormData = {
  title: string;
  description: string;
  location: string;
  eventDate: string;
  category: string;
  opportunity: string;
  imageUrl: string;
};

const EMPTY_FORM: EventFormData = {
  title: "", description: "", location: "", eventDate: "",
  category: "Campus update", opportunity: "", imageUrl: "",
};

const CATEGORIES = ["Campus update", "Academic", "Social", "Career", "Sports"];

function EventFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: EventFormData & { id?: string };
  onSave: (data: EventFormData, id?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<EventFormData>(initial ?? EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof EventFormData, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.location.trim() || !form.eventDate) {
      setError("Title, location and date are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(form, initial?.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const fieldBase = "w-full rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none";
  const fieldStyle = { background: "rgba(241,245,249,0.80)", border: "1px solid rgba(226,232,240,0.70)", color: "#1E293B" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-lg overflow-hidden rounded-3xl"
        style={{ background: "#fff", boxShadow: "0 24px 80px rgba(15,23,42,0.20)" }}>
        <div className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid rgba(226,232,240,0.70)" }}>
          <h2 className="text-lg font-black" style={{ color: "#0F172A" }}>
            {initial?.id ? "Edit event" : "New event"}
          </h2>
          <button onClick={onClose} className="rounded-xl p-1.5 transition-colors hover:bg-slate-100">
            <X className="h-4 w-4" style={{ color: "#64748B" }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto px-6 py-5" style={{ maxHeight: "80vh" }}>
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wide" style={{ color: "#64748B" }}>Title *</label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} className={fieldBase} style={fieldStyle} placeholder="HTU Founders Day 2026" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wide" style={{ color: "#64748B" }}>Category</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)} className={fieldBase} style={fieldStyle}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wide" style={{ color: "#64748B" }}>Date & time *</label>
              <input type="datetime-local" value={form.eventDate} onChange={(e) => set("eventDate", e.target.value)} className={fieldBase} style={fieldStyle} required />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wide" style={{ color: "#64748B" }}>Location *</label>
            <input value={form.location} onChange={(e) => set("location", e.target.value)} className={fieldBase} style={fieldStyle} placeholder="HTU Main Auditorium" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wide" style={{ color: "#64748B" }}>Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} className={`${fieldBase} resize-none`} style={fieldStyle} placeholder="What is this event about?" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wide" style={{ color: "#64748B" }}>Opportunity / call to action</label>
            <input value={form.opportunity} onChange={(e) => set("opportunity", e.target.value)} className={fieldBase} style={fieldStyle} placeholder="Register at forms.gle/… or bring your CV" />
          </div>
          {error && (
            <p className="rounded-xl px-3 py-2 text-sm font-semibold"
              style={{ background: "rgba(239,68,68,0.08)", color: "#B91C1C" }}>{error}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-2xl px-5 py-2.5 text-sm font-bold transition-colors hover:bg-slate-100"
              style={{ color: "#64748B" }}>Cancel</button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-black text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #7FB685, #4A7C59)", boxShadow: "0 6px 16px rgba(127,182,133,0.35)" }}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {initial?.id ? "Save changes" : "Create event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const { data: profile } = useProfile();
  const canEdit = profile?.canEditEvents === true;

  const { data: events = [], isLoading, mutate } = useSWR<CampusEvent[]>(
    "events-page",
    () => api.getEvents(),
  );

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<(EventFormData & { id: string }) | null>(null);

  async function handleSave(data: EventFormData, id?: string) {
    const payload = {
      ...data,
      opportunity: data.opportunity || undefined,
      imageUrl: data.imageUrl || undefined,
    };
    if (id) {
      await api.admin.updateEvent(id, payload);
    } else {
      await api.admin.createEvent(payload as Parameters<typeof api.admin.createEvent>[0]);
    }
    await mutate();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    await api.admin.deleteEvent(id);
    await mutate();
  }

  const upcoming = events.filter((e) => new Date(e.eventDate as string) >= new Date());
  const past = events.filter((e) => new Date(e.eventDate as string) < new Date());

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #FAF7F2 0%, #F0F7F1 100%)" }}>
      {/* Header */}
      <div className="relative overflow-hidden py-14 text-white"
        style={{ background: "linear-gradient(135deg, #0F172A 0%, #102542 55%, #1a3a2a 100%)" }}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(127,182,133,0.20), transparent 65%)" }} />
        <div className="container-shell">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-widest" style={{ color: "#7FB685" }}>Campus life</p>
              <h1 className="text-4xl font-black tracking-tight">Events & Opportunities</h1>
              <p className="mt-3 max-w-lg text-base leading-7" style={{ color: "#94A3B8" }}>
                Stay connected with what&apos;s happening on campus — lectures, fairs, social events, and career opportunities.
              </p>
            </div>
            {canEdit && (
              <button onClick={() => setCreating(true)}
                className="shrink-0 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white transition-all hover:-translate-y-0.5"
                style={{ background: "rgba(127,182,133,0.25)", border: "1px solid rgba(127,182,133,0.35)", backdropFilter: "blur(12px)" }}>
                <Plus className="h-4 w-4" />
                New event
              </button>
            )}
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="container-shell pt-6">
          <div className="flex items-center gap-2.5 rounded-2xl px-4 py-3"
            style={{ background: "rgba(127,182,133,0.12)", border: "1px solid rgba(127,182,133,0.25)" }}>
            <Megaphone className="h-4 w-4 shrink-0" style={{ color: "#4A7C59" }} />
            <p className="text-sm font-semibold" style={{ color: "#4A7C59" }}>
              You have events editor access — click <strong>Edit</strong> on any card or <strong>New event</strong> to publish.
            </p>
          </div>
        </div>
      )}

      <div className="container-shell py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#7FB685" }} />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <CalendarDays className="h-16 w-16" style={{ color: "#E2E8F0" }} />
            <p className="text-xl font-black" style={{ color: "#1E293B" }}>No events posted yet</p>
            <p className="text-sm" style={{ color: "#64748B" }}>Events and campus opportunities will appear here when posted.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {upcoming.length > 0 && (
              <section>
                <h2 className="mb-5 text-lg font-black uppercase tracking-wide" style={{ color: "#64748B" }}>Upcoming</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map((ev) => (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      canEdit={canEdit}
                      onEdit={() => setEditing({
                        title: ev.title, description: ev.description, location: ev.location,
                        eventDate: (ev.eventDate as string).slice(0, 16),
                        category: ev.category, opportunity: ev.opportunity ?? "", imageUrl: ev.imageUrl ?? "",
                        id: ev.id,
                      })}
                      onDelete={() => handleDelete(ev.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="mb-5 text-lg font-black uppercase tracking-wide" style={{ color: "#94A3B8" }}>Past events</h2>
                <div className="grid gap-4 opacity-70 sm:grid-cols-2 lg:grid-cols-3">
                  {past.map((ev) => (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      canEdit={canEdit}
                      onEdit={() => setEditing({
                        title: ev.title, description: ev.description, location: ev.location,
                        eventDate: (ev.eventDate as string).slice(0, 16),
                        category: ev.category, opportunity: ev.opportunity ?? "", imageUrl: ev.imageUrl ?? "",
                        id: ev.id,
                      })}
                      onDelete={() => handleDelete(ev.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {(creating || editing) && (
        <EventFormModal
          initial={editing ?? undefined}
          onSave={handleSave}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ─── Event card ───────────────────────────────────────────────────────────────

function EventCard({ event, canEdit, onEdit, onDelete }: {
  event: CampusEvent;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { bg, text } = categoryStyle(event.category);

  return (
    <article className="flex flex-col overflow-hidden rounded-3xl transition-all hover:-translate-y-1 hover:shadow-xl"
      style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(20px)", border: "1px solid rgba(226,232,240,0.70)", boxShadow: "0 4px 24px rgba(15,23,42,0.07)" }}>
      {event.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.imageUrl} alt="" className="h-44 w-full object-cover" />
      )}

      <div className="flex flex-1 flex-col px-5 pt-5 pb-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide" style={{ background: bg, color: text }}>
            <Tag className="mr-1.5 inline h-2.5 w-2.5" />{event.category}
          </span>
        </div>

        <h3 className="mb-2 text-lg font-black leading-snug" style={{ color: "#0F172A" }}>{event.title}</h3>
        <p className="mb-4 line-clamp-2 text-sm leading-relaxed" style={{ color: "#475569" }}>{event.description}</p>

        <div className="mt-auto space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "#64748B" }}>
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            {formatEventDate(event.eventDate as string)}
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "#64748B" }}>
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {event.location}
          </div>
          {event.opportunity && (
            <div className="mt-3 rounded-xl px-3 py-2 text-xs font-semibold leading-relaxed"
              style={{ background: "rgba(127,182,133,0.12)", color: "#2D6A4F", border: "1px solid rgba(127,182,133,0.20)" }}>
              <Megaphone className="mr-1.5 inline h-3 w-3" />
              {event.opportunity}
            </div>
          )}
        </div>
      </div>

      {canEdit && (
        <div className="flex gap-2 border-t px-5 py-3" style={{ borderColor: "rgba(226,232,240,0.60)" }}>
          <button onClick={onEdit}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors hover:bg-slate-100"
            style={{ color: "#64748B" }}>
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </button>
          <button onClick={onDelete}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors hover:bg-red-50"
            style={{ color: "#EF4444" }}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </article>
  );
}
