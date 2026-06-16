import { MapPin } from "lucide-react";
import type { ScheduleEventType } from "@prisma/client";
import { ScheduleEventTypeBadge } from "@/components/domain-badges";
import { formatDate, formatScheduleTimeRange, formatWeekday } from "@/lib/format";

export type ScheduleEventCardData = {
  id: string;
  type: ScheduleEventType;
  title: string;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
};

export function ScheduleEventCard({
  event,
  muted = false,
}: {
  event: ScheduleEventCardData;
  muted?: boolean;
}) {
  const time = formatScheduleTimeRange(event.startTime, event.endTime);

  return (
    <article
      className={`rounded-xl border border-line p-4 ${
        muted ? "bg-surface/40 opacity-80" : "bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <ScheduleEventTypeBadge type={event.type} />
          <h3 className="mt-2 font-semibold text-ink">{event.title}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {formatWeekday(event.date)} · {formatDate(event.date)}
            {time ? ` · ${time}` : ""}
          </p>
          {event.location ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {event.location}
            </p>
          ) : null}
          {event.notes ? (
            <p className="mt-2 text-sm text-gray-600">{event.notes}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
