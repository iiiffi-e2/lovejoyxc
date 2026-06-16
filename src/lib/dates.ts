import { startOfUTCDay } from "./format";

/** Week starts on Monday (athletic convention). All math in UTC. */
export function startOfWeek(date: Date): Date {
  const d = startOfUTCDay(date);
  const day = d.getUTCDay(); // 0 = Sun ... 6 = Sat
  const diff = (day + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return end; // exclusive upper bound
}

/** Range for a week offset relative to now. 0 = this week, -1 = last week. */
export function weekRange(offset = 0): { start: Date; end: Date } {
  const base = startOfWeek(new Date());
  const start = new Date(base);
  start.setUTCDate(start.getUTCDate() + offset * 7);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Returns the last `count` Monday-week ranges, oldest first. */
export function lastWeeks(count: number): { start: Date; end: Date }[] {
  const weeks: { start: Date; end: Date }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    weeks.push(weekRange(-i));
  }
  return weeks;
}

export function isWithin(date: Date, start: Date, end: Date): boolean {
  const t = date.getTime();
  return t >= start.getTime() && t < end.getTime();
}
