import type { Feeling, ScheduleEventType, Soreness, WorkoutType } from "@prisma/client";
import { Badge } from "./ui/badge";
import {
  FEELING_EMOJI,
  FEELING_LABEL,
  SCHEDULE_EVENT_TYPE_LABEL,
  SORENESS_LABEL,
  WORKOUT_TYPE_LABEL,
} from "@/lib/labels";

const WORKOUT_TONE: Partial<Record<WorkoutType, Parameters<typeof Badge>[0]["tone"]>> =
  {
    RACE: "brand",
    WORKOUT: "brand",
    REST_DAY: "neutral",
    INJURY_RECOVERY: "injury",
  };

export function WorkoutTypeBadge({ type }: { type: WorkoutType }) {
  return <Badge tone={WORKOUT_TONE[type] ?? "neutral"}>{WORKOUT_TYPE_LABEL[type]}</Badge>;
}

export function FeelingChip({
  feeling,
  withLabel = true,
}: {
  feeling?: Feeling | null;
  withLabel?: boolean;
}) {
  if (!feeling) return <span className="text-gray-400">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-base leading-none" aria-hidden>
        {FEELING_EMOJI[feeling]}
      </span>
      {withLabel ? (
        <span className="text-sm text-gray-700">{FEELING_LABEL[feeling]}</span>
      ) : null}
    </span>
  );
}

export function SorenessBadge({ soreness }: { soreness: Soreness }) {
  if (soreness === "NONE") return <span className="text-gray-400">None</span>;
  const tone =
    soreness === "HIGH" ? "injury" : soreness === "MODERATE" ? "warning" : "neutral";
  return <Badge tone={tone}>{SORENESS_LABEL[soreness]}</Badge>;
}

const SCHEDULE_TONE: Record<
  ScheduleEventType,
  Parameters<typeof Badge>[0]["tone"]
> = {
  PRACTICE: "neutral",
  MEET: "brand",
  CAMP: "success",
  OTHER: "warning",
};

export function ScheduleEventTypeBadge({ type }: { type: ScheduleEventType }) {
  return (
    <Badge tone={SCHEDULE_TONE[type]}>{SCHEDULE_EVENT_TYPE_LABEL[type]}</Badge>
  );
}
