"use client";

import { useState } from "react";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import { deleteScheduleEvent } from "@/app/actions/schedule";
import { ScheduleEventCard, type ScheduleEventCardData } from "./schedule-event-card";
import { ScheduleEventForm } from "./schedule-event-form";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { startOfUTCDay } from "@/lib/format";

export function ScheduleEventList({
  events,
  manage = false,
}: {
  events: ScheduleEventCardData[];
  manage?: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const today = startOfUTCDay(new Date());

  const upcoming = events.filter((e) => startOfUTCDay(e.date) >= today);
  const past = events.filter((e) => startOfUTCDay(e.date) < today);

  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No events yet"
        description="Add a practice or meet to get started."
      />
    );
  }

  return (
    <div className="space-y-6">
      <EventSection
        title="Upcoming"
        events={upcoming}
        manage={manage}
        editingId={editingId}
        setEditingId={setEditingId}
        emptyMessage="No upcoming events."
      />
      {past.length > 0 ? (
        <EventSection
          title="Past"
          events={past}
          manage={manage}
          editingId={editingId}
          setEditingId={setEditingId}
          muted
        />
      ) : null}
    </div>
  );
}

function EventSection({
  title,
  events,
  manage,
  editingId,
  setEditingId,
  muted = false,
  emptyMessage,
}: {
  title: string;
  events: ScheduleEventCardData[];
  manage: boolean;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  muted?: boolean;
  emptyMessage?: string;
}) {
  if (events.length === 0) {
    return emptyMessage ? (
      <p className="text-sm text-gray-400">{emptyMessage}</p>
    ) : null;
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h3>
      <ul className="space-y-3">
        {events.map((event) => (
          <li key={event.id}>
            {manage && editingId === event.id ? (
              <div className="rounded-xl border border-line bg-surface/60 p-4">
                <ScheduleEventForm
                  event={event}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div className="relative">
                <ScheduleEventCard event={event} muted={muted} />
                {manage ? (
                  <div className="absolute right-3 top-3 flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Edit event"
                      onClick={() => setEditingId(event.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <form
                      action={deleteScheduleEvent.bind(null, event.id)}
                      onSubmit={(e) => {
                        if (!confirm("Delete this event?")) e.preventDefault();
                      }}
                    >
                      <Button type="submit" variant="ghost" size="sm" aria-label="Delete event">
                        <Trash2 className="h-4 w-4 text-injury" />
                      </Button>
                    </form>
                  </div>
                ) : null}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
