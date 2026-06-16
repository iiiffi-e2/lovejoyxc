/** Domain formatting helpers (pace, duration, distance, dates). */

/** Format seconds-per-mile as M:SS /mi. */
export function formatPace(paceSec?: number | null): string {
  if (!paceSec || paceSec <= 0) return "—";
  const min = Math.floor(paceSec / 60);
  const sec = Math.round(paceSec % 60);
  const secStr = sec === 60 ? "00" : sec.toString().padStart(2, "0");
  const minAdj = sec === 60 ? min + 1 : min;
  return `${minAdj}:${secStr}/mi`;
}

/** Format a total number of seconds as H:MM:SS or M:SS. */
export function formatDuration(totalSec?: number | null): string {
  if (!totalSec || totalSec <= 0) return "—";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.round(totalSec % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Compute seconds-per-mile from distance (mi) and duration (sec). */
export function computePaceSec(
  distance?: number | null,
  durationSec?: number | null,
): number | null {
  if (!distance || distance <= 0) return null;
  if (!durationSec || durationSec <= 0) return null;
  return Math.round(durationSec / distance);
}

export function formatMiles(miles?: number | null, digits = 1): string {
  if (miles == null) return "0";
  return miles.toFixed(digits);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatWeekday(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

/** "2 days ago", "Today", "Yesterday". */
export function relativeDays(date: Date | string | null | undefined): string {
  if (!date) return "Never";
  const d = typeof date === "string" ? new Date(date) : date;
  const today = startOfUTCDay(new Date());
  const that = startOfUTCDay(d);
  const diff = Math.round(
    (today.getTime() - that.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
}

export function startOfUTCDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function formatPercent(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

/**
 * Parse a flexible duration string into seconds.
 * Accepts "h:mm:ss", "mm:ss", "45" (minutes), or "45:30".
 * Returns null if empty/invalid.
 */
export function parseDurationToSeconds(input: string): number | null {
  const value = input.trim();
  if (!value) return null;
  const parts = value.split(":").map((p) => p.trim());
  if (parts.some((p) => p === "" || Number.isNaN(Number(p)))) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => n < 0)) return null;

  if (nums.length === 1) {
    // single number = minutes
    return Math.round(nums[0] * 60);
  }
  if (nums.length === 2) {
    const [m, s] = nums;
    return m * 60 + s;
  }
  if (nums.length === 3) {
    const [h, m, s] = nums;
    return h * 3600 + m * 60 + s;
  }
  return null;
}

/** Convert a yyyy-mm-dd input string to a UTC Date (no timezone drift). */
export function dateInputToUTC(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Convert a Date to a yyyy-mm-dd string for <input type="date"> using UTC. */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Format stored time ("06:30" or "15:30") for display. */
export function formatScheduleTime(time?: string | null): string {
  if (!time?.trim()) return "";
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time.trim();
  const hour = Number(match[1]);
  const minute = match[2];
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${period}`;
}

/** Format start/end times for schedule display, e.g. "6:30 AM – 7:30 AM". */
export function formatScheduleTimeRange(
  startTime?: string | null,
  endTime?: string | null,
): string {
  const start = formatScheduleTime(startTime);
  const end = formatScheduleTime(endTime);
  if (start && end) return `${start} – ${end}`;
  return start || end;
}
