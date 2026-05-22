"use client";

import { CalendarDays, MapPin, Megaphone } from "lucide-react";
import { EmptyState, LoadingSkeleton, SectionHeading } from "@/components/ui";
import { useEvents } from "@/hooks/use-api";

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function EventsPage() {
  const { data: events = [], isLoading } = useEvents();

  return (
    <div className="container-shell py-8 md:py-10">
      <SectionHeading
        title="Campus events"
        subtitle="Updates that create awareness, traffic, and business opportunities for students, teachers, and Ho-area vendors."
      />

      {isLoading ? (
        <LoadingSkeleton cards={3} />
      ) : events.length ? (
        <div className="grid gap-5 md:grid-cols-2">
          {events.map((event) => (
            <article key={event.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {event.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={event.imageUrl} alt="" className="h-52 w-full object-cover" />
              ) : null}
              <div className="p-5">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-brand-green ring-1 ring-green-100">
                    <Megaphone className="h-3.5 w-3.5" />
                    {event.category}
                  </span>
                  {event.opportunity ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{event.opportunity}</span>
                  ) : null}
                </div>
                <h2 className="mt-4 text-xl font-black text-slate-950">{event.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{event.description}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-4 w-4 text-brand-green" />
                    {formatEventDate(event.eventDate)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-brand-green" />
                    {event.location}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No campus events yet" description="Campus updates and business opportunity events will appear here." />
      )}
    </div>
  );
}
