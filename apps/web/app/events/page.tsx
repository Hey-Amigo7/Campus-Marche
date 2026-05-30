"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, ChevronLeft, ChevronRight,
  Edit3, ExternalLink, Loader2, MapPin,
  Megaphone, Plus, Tag, Trash2, X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useProfile } from "@/hooks/use-api";
import type { CampusEvent } from "@/types";

const spring = { type: "spring", stiffness: 340, damping: 26 } as const;

/* ── helpers ────────────────────────────────────────────────────── */
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function formatFull(iso: string) {
  return new Intl.DateTimeFormat("en-GH", {
    weekday: "long", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit",
  }).format(new Date(iso));
}

function formatShortTime(iso: string) {
  return new Intl.DateTimeFormat("en-GH", {
    hour: "numeric", minute: "2-digit",
  }).format(new Date(iso));
}

/* ── category config ─────────────────────────────────────────────── */
const CAT: Record<string, { dot: string; bg: string; text: string }> = {
  "Campus update": { dot: "#0F172A", bg: "rgba(15,23,42,0.08)",   text: "var(--on-surface)" },
  "Academic":      { dot: "#16A34A", bg: "rgba(22,163,74,0.12)",  text: "#15803D" },
  "Social":        { dot: "#C68B59", bg: "rgba(198,139,89,0.15)", text: "#9A6032" },
  "Career":        { dot: "#6366F1", bg: "rgba(99,102,241,0.12)", text: "#4F46E5" },
  "Sports":        { dot: "#EF4444", bg: "rgba(239,68,68,0.12)",  text: "#DC2626" },
};
function catStyle(cat: string) { return CAT[cat] ?? { dot: "var(--muted)", bg: "rgba(0,0,0,0.06)", text: "var(--muted)" }; }

/* ── form types ──────────────────────────────────────────────────── */
type EventFormData = {
  title: string; description: string; location: string; eventDate: string;
  category: string; opportunity: string; registrationLink: string; imageUrl: string;
};
const EMPTY: EventFormData = {
  title: "", description: "", location: "", eventDate: "",
  category: "Campus update", opportunity: "", registrationLink: "", imageUrl: "",
};
const CATEGORIES = ["Campus update", "Academic", "Social", "Career", "Sports"];

/* ── event form modal ─────────────────────────────────────────────── */
function EventFormModal({ initial, onSave, onClose }: {
  initial?: EventFormData & { id?: string };
  onSave: (data: EventFormData, id?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<EventFormData>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set(k: keyof EventFormData, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.location.trim() || !form.eventDate) {
      setErr("Title, location and date are required."); return;
    }
    setSaving(true); setErr(null);
    try { await onSave(form, initial?.id); onClose(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 16 }}
        transition={spring}
        className="w-full max-w-lg overflow-hidden rounded-3xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 24px 80px rgba(0,0,0,0.22)" }}
      >
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-lg font-black" style={{ color: "var(--on-surface)" }}>
            {initial?.id ? "Edit event" : "New event"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-xl p-1.5 transition-colors hover:bg-[var(--surface-raised)]">
            <X size={16} style={{ color: "var(--muted)" }} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 overflow-y-auto px-6 py-5" style={{ maxHeight: "80vh" }}>
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wide" style={{ color: "var(--muted)" }}>Title *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} className="input-shell" placeholder="HTU Founders Day 2026" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wide" style={{ color: "var(--muted)" }}>Category</label>
              <select value={form.category} onChange={e => set("category", e.target.value)} className="input-shell">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wide" style={{ color: "var(--muted)" }}>Date & time *</label>
              <input type="datetime-local" value={form.eventDate} onChange={e => set("eventDate", e.target.value)} className="input-shell" required />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wide" style={{ color: "var(--muted)" }}>Location *</label>
            <input value={form.location} onChange={e => set("location", e.target.value)} className="input-shell" placeholder="HTU Main Auditorium" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wide" style={{ color: "var(--muted)" }}>Description</label>
            <textarea rows={3} value={form.description} onChange={e => set("description", e.target.value)} className="input-shell resize-none" placeholder="What is this event about?" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wide" style={{ color: "var(--muted)" }}>Opportunity / call to action</label>
            <input value={form.opportunity} onChange={e => set("opportunity", e.target.value)} className="input-shell" placeholder="Bring your CV, open to all students" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              Registration link
              <span className="ml-1.5 normal-case font-medium" style={{ color: "var(--subtle)" }}>(optional)</span>
            </label>
            <input
              type="url"
              value={form.registrationLink}
              onChange={e => set("registrationLink", e.target.value)}
              className="input-shell"
              placeholder="https://forms.gle/…"
            />
            <p className="mt-1 text-xs" style={{ color: "var(--subtle)" }}>Paste a Google Form, Eventbrite, or any signup link</p>
          </div>
          {err && (
            <p className="rounded-xl px-3 py-2 text-sm font-semibold"
              style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.18)" }}>
              {err}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-2xl px-5 py-2.5 text-sm font-bold transition-colors hover:bg-[var(--surface-raised)]" style={{ color: "var(--muted)" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-black text-white disabled:opacity-60"
              style={{ background: "var(--green)" }}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {initial?.id ? "Save changes" : "Create event"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ── dot calendar ────────────────────────────────────────────────── */
function EventCalendar({
  events,
  selectedDay,
  onSelectDay,
}: {
  events: CampusEvent[];
  selectedDay: string | null;
  onSelectDay: (iso: string | null) => void;
}) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMon = new Date(year, month + 1, 0).getDate();

  // map "YYYY-MM-DD" → events[]
  const byDay = useMemo(() => {
    const map = new Map<string, CampusEvent[]>();
    for (const ev of events) {
      const d = new Date(ev.eventDate);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMon }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      {/* Month nav */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }} transition={spring} type="button" onClick={prevMonth}
          className="grid h-8 w-8 place-items-center rounded-xl transition-colors hover:bg-[var(--surface-raised)]">
          <ChevronLeft size={16} style={{ color: "var(--muted)" }} />
        </motion.button>
        <p className="text-sm font-black" style={{ color: "var(--on-surface)" }}>
          {MONTHS[month]} {year}
        </p>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }} transition={spring} type="button" onClick={nextMonth}
          className="grid h-8 w-8 place-items-center rounded-xl transition-colors hover:bg-[var(--surface-raised)]">
          <ChevronRight size={16} style={{ color: "var(--muted)" }} />
        </motion.button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-2 pt-3">
        {DAYS.map(d => (
          <div key={d} className="pb-2 text-center text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--subtle)" }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-1 px-2 pb-3">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const key = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const evs = byDay.get(key) ?? [];
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const isSelected = selectedDay === key;

          return (
            <motion.button
              key={key}
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.88 }}
              transition={spring}
              onClick={() => onSelectDay(isSelected ? null : key)}
              className="relative mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-xl text-sm font-semibold transition-colors"
              style={{
                background: isSelected ? "var(--green)" : isToday ? "var(--surface-raised)" : "transparent",
                color: isSelected ? "white" : isToday ? "var(--green)" : "var(--on-surface)",
                fontWeight: isToday || isSelected ? 900 : undefined,
              }}
            >
              {day}
              {/* Nudging dots */}
              {evs.length > 0 && (
                <motion.div
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.4 }}
                  className="absolute bottom-0.5 flex gap-0.5"
                >
                  {evs.slice(0, 3).map((ev, di) => (
                    <span
                      key={di}
                      className="h-1 w-1 rounded-full"
                      style={{ background: isSelected ? "white" : catStyle(ev.category).dot }}
                    />
                  ))}
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2.5 px-4 pb-4 pt-1">
        {Object.entries(CAT).map(([label, { dot }]) => (
          <span key={label} className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "var(--muted)" }}>
            <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── event detail panel ───────────────────────────────────────────── */
function EventDetailPanel({ events, onEdit, onDelete, canEdit }: {
  events: CampusEvent[];
  onEdit: (ev: CampusEvent) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {events.map(ev => {
        const { bg, text, dot } = catStyle(ev.category);
        const isOpen = expanded === ev.id;

        return (
          <motion.div
            key={ev.id}
            layout
            transition={spring}
            className="overflow-hidden rounded-2xl cursor-pointer"
            style={{ border: `1.5px solid ${isOpen ? dot : "var(--border)"}`, background: "var(--surface)" }}
            onClick={() => setExpanded(isOpen ? null : ev.id)}
          >
            {/* Collapsed row */}
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dot }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: "var(--on-surface)" }}>{ev.title}</p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {formatShortTime(ev.eventDate)} · {ev.location}
                </p>
              </div>
              <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={spring}>
                <ChevronRight size={15} style={{ color: "var(--muted)" }} />
              </motion.span>
            </div>

            {/* Expanded detail */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <div className="space-y-3 px-4 py-4">
                    {ev.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ev.imageUrl} alt="" className="h-36 w-full rounded-xl object-cover" />
                    )}

                    <div className="flex items-center gap-2">
                      <span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide"
                        style={{ background: bg, color: text }}>
                        <Tag className="mr-1 inline h-2.5 w-2.5" />{ev.category}
                      </span>
                    </div>

                    {ev.description && (
                      <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{ev.description}</p>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--subtle)" }}>
                        <CalendarDays size={12} />
                        {formatFull(ev.eventDate)}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--subtle)" }}>
                        <MapPin size={12} />
                        {ev.location}
                      </div>
                    </div>

                    {ev.opportunity && (
                      <div className="rounded-xl px-3 py-2 text-xs font-semibold leading-relaxed"
                        style={{ background: "rgba(22,163,74,0.08)", color: "#15803D", border: "1px solid rgba(22,163,74,0.15)" }}>
                        <Megaphone className="mr-1.5 inline h-3 w-3" />
                        {ev.opportunity}
                      </div>
                    )}

                    {ev.registrationLink && (
                      <a
                        href={ev.registrationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                        style={{ background: "var(--green)" }}
                      >
                        <ExternalLink size={14} />
                        Register / Sign up
                      </a>
                    )}

                    {canEdit && (
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={e => { e.stopPropagation(); onEdit(ev); }}
                          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors hover:bg-[var(--surface-raised)]"
                          style={{ color: "var(--muted)" }}>
                          <Edit3 size={12} /> Edit
                        </button>
                        <button type="button" onClick={e => { e.stopPropagation(); onDelete(ev.id); }}
                          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors"
                          style={{ color: "#EF4444" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = ""; }}>
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── main page ───────────────────────────────────────────────────── */
export default function EventsPage() {
  const { data: profile } = useProfile();
  const canEdit = profile?.canEditEvents === true || profile?.role === "ADMIN";

  const { data: events = [], isLoading, mutate } = useSWR<CampusEvent[]>(
    "events-page",
    () => api.getEvents(),
  );

  const [creating, setCreating] = useState(false);
  const [editing,  setEditing]  = useState<(EventFormData & { id: string }) | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const selectedEvents = useMemo(() => {
    if (!selectedDay) return [];
    return events.filter(ev => {
      const d = new Date(ev.eventDate);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      return key === selectedDay;
    });
  }, [events, selectedDay]);

  const upcoming = useMemo(() => events.filter(e => new Date(e.eventDate) >= new Date()), [events]);
  const past     = useMemo(() => events.filter(e => new Date(e.eventDate) <  new Date()), [events]);

  async function handleSave(data: EventFormData, id?: string) {
    const payload = {
      ...data,
      opportunity:      data.opportunity      || undefined,
      registrationLink: data.registrationLink || undefined,
      imageUrl:         data.imageUrl         || undefined,
    };
    if (id) await api.admin.updateEvent(id, payload);
    else    await api.admin.createEvent(payload as Parameters<typeof api.admin.createEvent>[0]);
    await mutate();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    await api.admin.deleteEvent(id);
    await mutate();
  }

  function openEdit(ev: CampusEvent) {
    setEditing({
      id: ev.id,
      title: ev.title, description: ev.description,
      location: ev.location,
      eventDate: (ev.eventDate as string).slice(0, 16),
      category: ev.category,
      opportunity: ev.opportunity ?? "",
      registrationLink: ev.registrationLink ?? "",
      imageUrl: ev.imageUrl ?? "",
    });
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden py-12 text-white"
        style={{ background: "linear-gradient(135deg, #0F172A 0%, #102542 55%, #1a3a2a 100%)" }}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(114,204,35,0.18), transparent 65%)" }} />
        <div className="container-shell flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-widest" style={{ color: "#72CC23" }}>Campus life</p>
            <h1 className="text-4xl font-black tracking-tight">Events & Opportunities</h1>
            <p className="mt-3 max-w-lg text-base leading-7" style={{ color: "#94A3B8" }}>
              Stay connected with what&apos;s happening on campus — click any marked day to explore.
            </p>
          </div>
          {canEdit && (
            <motion.button type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} transition={spring}
              onClick={() => setCreating(true)}
              className="shrink-0 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white"
              style={{ background: "rgba(114,204,35,0.20)", border: "1px solid rgba(114,204,35,0.30)", backdropFilter: "blur(12px)" }}>
              <Plus size={16} /> New event
            </motion.button>
          )}
        </div>
      </div>

      <div className="container-shell py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--green)" }} />
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
            {/* Left — calendar */}
            <div className="space-y-4">
              <EventCalendar events={events} selectedDay={selectedDay} onSelectDay={setSelectedDay} />

              {/* Day detail panel */}
              <AnimatePresence>
                {selectedDay && selectedEvents.length > 0 && (
                  <motion.div
                    key="day-panel"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={spring}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-black" style={{ color: "var(--on-surface)" }}>
                        {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-GH", { weekday: "long", month: "long", day: "numeric" })}
                      </p>
                      <button type="button" onClick={() => setSelectedDay(null)}
                        className="rounded-lg p-1 transition-colors hover:bg-[var(--surface-raised)]">
                        <X size={13} style={{ color: "var(--muted)" }} />
                      </button>
                    </div>
                    <EventDetailPanel events={selectedEvents} onEdit={openEdit} onDelete={handleDelete} canEdit={canEdit} />
                  </motion.div>
                )}
                {selectedDay && selectedEvents.length === 0 && (
                  <motion.div
                    key="empty-day"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="rounded-2xl px-5 py-6 text-center"
                    style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
                  >
                    <p className="text-sm font-semibold" style={{ color: "var(--muted)" }}>No events on this day</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right — full list */}
            <div className="space-y-8">
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-20">
                  <CalendarDays size={56} style={{ color: "var(--border)" }} />
                  <p className="text-xl font-black" style={{ color: "var(--on-surface)" }}>No events posted yet</p>
                  <p className="text-sm" style={{ color: "var(--muted)" }}>
                    Campus events and opportunities will appear here when published.
                  </p>
                </div>
              ) : (
                <>
                  {upcoming.length > 0 && (
                    <section>
                      <p className="mb-4 text-xs font-black uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                        Upcoming · {upcoming.length}
                      </p>
                      <EventDetailPanel events={upcoming} onEdit={openEdit} onDelete={handleDelete} canEdit={canEdit} />
                    </section>
                  )}
                  {past.length > 0 && (
                    <section className="opacity-55">
                      <p className="mb-4 text-xs font-black uppercase tracking-widest" style={{ color: "var(--subtle)" }}>
                        Past events · {past.length}
                      </p>
                      <EventDetailPanel events={past} onEdit={openEdit} onDelete={handleDelete} canEdit={canEdit} />
                    </section>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {(creating || editing) && (
          <EventFormModal
            initial={editing ?? undefined}
            onSave={handleSave}
            onClose={() => { setCreating(false); setEditing(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
