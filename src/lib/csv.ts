import type { Feeling, Soreness, Surface, TeamGroup, WorkoutType } from "@prisma/client";
import { formatDuration, formatPace } from "./format";
import {
  FEELING_LABEL,
  SORENESS_LABEL,
  SURFACE_LABEL,
  TEAM_GROUP_LABEL,
  WORKOUT_TYPE_LABEL,
} from "./labels";

export type CsvLog = {
  date: Date;
  workoutType: WorkoutType;
  distance: number;
  durationSec: number | null;
  paceSec: number | null;
  effort: number | null;
  feeling: Feeling | null;
  soreness: Soreness;
  painFlag: boolean;
  surface: Surface | null;
  notes: string | null;
  athlete: { name: string; grade: number | null; teamGroup: TeamGroup | null };
};

const HEADERS = [
  "Date",
  "Athlete",
  "Grade",
  "Group",
  "Workout Type",
  "Distance (mi)",
  "Duration",
  "Pace",
  "Effort",
  "Feeling",
  "Soreness",
  "Pain Flag",
  "Surface",
  "Notes",
];

function escape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function logsToCsv(logs: CsvLog[]): string {
  const rows = logs.map((l) =>
    [
      l.date.toISOString().slice(0, 10),
      l.athlete.name,
      l.athlete.grade != null ? String(l.athlete.grade) : "",
      l.athlete.teamGroup ? TEAM_GROUP_LABEL[l.athlete.teamGroup] : "",
      WORKOUT_TYPE_LABEL[l.workoutType],
      l.distance > 0 ? l.distance.toFixed(1) : "",
      l.durationSec ? formatDuration(l.durationSec) : "",
      l.paceSec ? formatPace(l.paceSec).replace("/mi", "") : "",
      l.effort != null ? String(l.effort) : "",
      l.feeling ? FEELING_LABEL[l.feeling] : "",
      SORENESS_LABEL[l.soreness],
      l.painFlag ? "Yes" : "",
      l.surface ? SURFACE_LABEL[l.surface] : "",
      l.notes ?? "",
    ]
      .map((c) => escape(String(c)))
      .join(","),
  );
  return [HEADERS.join(","), ...rows].join("\n");
}
