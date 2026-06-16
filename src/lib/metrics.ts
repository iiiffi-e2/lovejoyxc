import type { Feeling, WorkoutLog } from "@prisma/client";
import { FEELING_SCORE } from "./labels";
import { startOfUTCDay } from "./format";
import { isWithin } from "./dates";

export type LogLite = Pick<WorkoutLog, "date" | "distance">;

export function milesInRange(logs: LogLite[], start: Date, end: Date): number {
  return round1(
    logs
      .filter((l) => isWithin(l.date, start, end))
      .reduce((sum, l) => sum + (l.distance ?? 0), 0),
  );
}

export function totalMiles(logs: LogLite[]): number {
  return round1(logs.reduce((sum, l) => sum + (l.distance ?? 0), 0));
}

/**
 * Current consecutive-day logging streak ending today or yesterday.
 * Any log (including rest days) counts as logging that day.
 */
export function currentStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const daySet = new Set(dates.map((d) => startOfUTCDay(d).getTime()));
  const DAY = 24 * 60 * 60 * 1000;
  const today = startOfUTCDay(new Date()).getTime();

  // Allow the streak to be "current" if logged today or yesterday.
  let cursor = today;
  if (!daySet.has(today)) {
    if (daySet.has(today - DAY)) cursor = today - DAY;
    else return 0;
  }

  let streak = 0;
  while (daySet.has(cursor)) {
    streak++;
    cursor -= DAY;
  }
  return streak;
}

/** Percent change from last week to this week (capped/handled at zero). */
export function changePercent(thisWeek: number, lastWeek: number): number | null {
  if (lastWeek <= 0) return thisWeek > 0 ? 100 : null;
  return ((thisWeek - lastWeek) / lastWeek) * 100;
}

export function isSpike(thisWeek: number, lastWeek: number): boolean {
  const pct = changePercent(thisWeek, lastWeek);
  // Only flag meaningful jumps (ignore tiny base mileage).
  return pct != null && pct >= 30 && lastWeek >= 5;
}

/** Average feeling score (1-5) over the given logs, or null. */
export function feelingTrend(logs: { feeling: Feeling | null }[]): number | null {
  const scores = logs
    .map((l) => (l.feeling ? FEELING_SCORE[l.feeling] : null))
    .filter((s): s is number => s != null);
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export function averageEffort(
  logs: { effort: number | null }[],
): number | null {
  const vals = logs
    .map((l) => l.effort)
    .filter((e): e is number => e != null && e > 0);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
